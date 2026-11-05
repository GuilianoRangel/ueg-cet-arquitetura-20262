import 'reflect-metadata';
import { FilterOptionItem, FormInputType } from '@repo/utils';

export const FORM_FIELD_META_KEY = Symbol('FORM_FIELD_META_KEY');
export const CRUD_BASE_DTO_KEY = Symbol('CRUD_BASE_DTO_KEY');

export interface FormFieldMetaOptions {
  label?: string;
  inputType?: FormInputType;
  placeholder?: string;
  order?: number;
  hidden?: boolean;
  readOnly?: boolean;
  /** Endpoint para popular select / multiselect (ex: '/perfis', '/roles') */
  optionsEndpoint?: string;
  optionsValueKey?: string;
  optionsLabelKey?: string;
  optionsStatic?: FilterOptionItem[];
  /** Nome da propriedade na entidade retornada pelo GET /:id para mapear relações (ex: 'perfis' -> 'perfilIds') */
  entityRelationProperty?: string;
  entityRelationValueKey?: string;
}

export function FormFieldMeta(
  options: FormFieldMetaOptions = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const key = String(propertyKey);
    const existing =
      (Reflect.getOwnMetadata(FORM_FIELD_META_KEY, target.constructor) as
        | Record<string, FormFieldMetaOptions>
        | undefined) ?? {};

    Reflect.defineMetadata(
      FORM_FIELD_META_KEY,
      {
        ...existing,
        [key]: { ...(existing[key] || {}), ...options },
      },
      target.constructor,
    );
  };
}

export function getFormFieldsMeta(
  dtoClass: new (...args: unknown[]) => unknown,
): Record<string, FormFieldMetaOptions> {
  const result: Record<string, FormFieldMetaOptions> = {};
  const chain: Array<new (...args: unknown[]) => unknown> = [];

  const collectChain = (cls: unknown) => {
    let current = cls;
    while (
      typeof current === 'function' &&
      current !== Function.prototype &&
      current !== Object
    ) {
      const baseDto = Reflect.getOwnMetadata(
        CRUD_BASE_DTO_KEY,
        current,
      ) as unknown;
      if (baseDto) {
        collectChain(baseDto);
      }
      chain.push(current as new (...args: unknown[]) => unknown);
      current = Object.getPrototypeOf(current);
    }
  };

  collectChain(dtoClass);

  // Apply from base classes first so derived classes override
  for (let i = chain.length - 1; i >= 0; i--) {
    const cls = chain[i];
    const ownMeta = Reflect.getOwnMetadata(FORM_FIELD_META_KEY, cls) as
      | Record<string, FormFieldMetaOptions>
      | undefined;
    if (ownMeta) {
      for (const [prop, opts] of Object.entries(ownMeta)) {
        result[prop] = { ...(result[prop] || {}), ...opts };
      }
    }
  }

  return result;
}
