import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import {
  CrudFormFieldSchema,
  CrudFormSchemaDto,
  FormFieldValidationRule,
  FormInputType,
  SENSITIVE_DATA_ROLE,
} from '@repo/utils';
import {
  CRUD_BASE_DTO_KEY,
  FormFieldMetaOptions,
  getFormFieldsMeta,
} from '../decorators/form-field-meta.decorator';
import { getMaskedFields } from '../masking/masked.decorator';

interface SwaggerPropertyMeta {
  type?: unknown;
  required?: boolean;
  default?: unknown;
  description?: string;
  example?: unknown;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  isArray?: boolean;
}

interface ClassValidatorMetaItem {
  propertyName: string;
  type: string;
  name?: string;
  constraints?: unknown[];
  message?: string | ((...args: unknown[]) => string);
}

function humanizeFieldName(name: string): string {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

@Injectable()
export class DtoMetadataExplorer {
  public exploreFormSchema(
    dtoClass: new (...args: unknown[]) => unknown,
    mode: 'create' | 'update',
    entityClass?: new (...args: never[]) => unknown,
    userRoles: ReadonlySet<string> = new Set(),
  ): CrudFormSchemaDto {
    const swaggerProps = this.collectSwaggerProperties(dtoClass);
    const validationMap = this.collectValidationMetadata(dtoClass);
    const formFieldsMeta = getFormFieldsMeta(dtoClass);
    const maskedFields = entityClass ? getMaskedFields(entityClass) : [];

    const allPropertyNames = new Set<string>([
      ...Object.keys(swaggerProps),
      ...Object.keys(validationMap),
      ...Object.keys(formFieldsMeta),
    ]);

    const fields: CrudFormFieldSchema[] = [];
    let fallbackOrder = 100;

    for (const propName of allPropertyNames) {
      const swMeta = swaggerProps[propName] || {};
      const valItems = validationMap[propName] || [];
      const fMeta: FormFieldMetaOptions = formFieldsMeta[propName] || {};

      const isVersionField = propName === 'version';
      const { required, validations, inferredType } =
        this.extractValidationsAndType(valItems, swMeta, mode, isVersionField);

      const inputType = this.resolveInputType(
        propName,
        isVersionField,
        fMeta,
        inferredType,
        swMeta,
      );

      const maskedMeta = maskedFields.find((m) => m.propertyKey === propName);
      const requiredRole = maskedMeta
        ? maskedMeta.role || SENSITIVE_DATA_ROLE
        : undefined;
      const isRestrictedByMask = Boolean(
        requiredRole && !userRoles.has(requiredRole),
      );

      const hidden = isVersionField ? true : (fMeta.hidden ?? false);
      const readOnly = isRestrictedByMask ? true : (fMeta.readOnly ?? false);
      const masked = isRestrictedByMask;
      const omitOnSubmit = isRestrictedByMask;
      const order = isVersionField
        ? (fMeta.order ?? 999)
        : (fMeta.order ?? fallbackOrder++);

      const schemaField: CrudFormFieldSchema = {
        name: propName,
        label: fMeta.label || humanizeFieldName(propName),
        inputType,
        required,
        ...(swMeta.default !== undefined
          ? { defaultValue: swMeta.default }
          : {}),
        ...(fMeta.placeholder ? { placeholder: fMeta.placeholder } : {}),
        ...(swMeta.description ? { description: swMeta.description } : {}),
        order,
        hidden,
        readOnly,
        ...(requiredRole ? { masked, omitOnSubmit, requiredRole } : {}),
        validations,
        ...(fMeta.optionsStatic ? { options: fMeta.optionsStatic } : {}),
        ...(fMeta.optionsEndpoint
          ? { optionsEndpoint: fMeta.optionsEndpoint }
          : {}),
        ...(fMeta.optionsValueKey
          ? { optionsValueKey: fMeta.optionsValueKey }
          : {}),
        ...(fMeta.optionsLabelKey
          ? { optionsLabelKey: fMeta.optionsLabelKey }
          : {}),
        ...(fMeta.entityRelationProperty
          ? { entityRelationProperty: fMeta.entityRelationProperty }
          : {}),
        ...(fMeta.entityRelationValueKey
          ? { entityRelationValueKey: fMeta.entityRelationValueKey }
          : {}),
      };

      fields.push(schemaField);
    }

    fields.sort((a, b) => a.order - b.order);

    return {
      mode,
      fields,
    };
  }

  private collectSwaggerProperties(
    dtoClass: new (...args: unknown[]) => unknown,
  ): Record<string, SwaggerPropertyMeta> {
    const result: Record<string, SwaggerPropertyMeta> = {};
    const chain = this.getClassHierarchy(dtoClass);

    for (let i = chain.length - 1; i >= 0; i--) {
      const cls = chain[i];
      const proto = cls.prototype as object | undefined;
      if (!proto) continue;

      const rawArray =
        (Reflect.getMetadata('swagger/apiModelPropertiesArray', proto) as
          | string[]
          | undefined) ?? [];

      for (const rawKey of rawArray) {
        const propName = rawKey.startsWith(':') ? rawKey.slice(1) : rawKey;
        const propMeta =
          (Reflect.getMetadata(
            'swagger/apiModelProperties',
            proto,
            propName,
          ) as SwaggerPropertyMeta | undefined) ?? {};
        result[propName] = { ...(result[propName] || {}), ...propMeta };
      }
    }

    return result;
  }

  private collectValidationMetadata(
    dtoClass: new (...args: unknown[]) => unknown,
  ): Record<string, ClassValidatorMetaItem[]> {
    const storage = getMetadataStorage();
    const chain = this.getClassHierarchy(dtoClass);
    const byProp: Record<string, ClassValidatorMetaItem[]> = {};

    for (let i = chain.length - 1; i >= 0; i--) {
      const cls = chain[i];
      const metas = storage.getTargetValidationMetadatas(
        cls,
        '',
        false,
        false,
      ) as unknown as ClassValidatorMetaItem[];

      for (const m of metas) {
        if (!byProp[m.propertyName]) {
          byProp[m.propertyName] = [];
        }
        const key = m.name || m.type;
        const exists = byProp[m.propertyName].some(
          (existing) => (existing.name || existing.type) === key,
        );
        if (!exists) {
          byProp[m.propertyName].push(m);
        }
      }
    }

    return byProp;
  }

  private getClassHierarchy(
    dtoClass: new (...args: unknown[]) => unknown,
  ): Array<new (...args: unknown[]) => unknown> {
    const chain: Array<new (...args: unknown[]) => unknown> = [];
    const visit = (cls: unknown) => {
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
          visit(baseDto);
        }
        chain.push(current as new (...args: unknown[]) => unknown);
        current = Object.getPrototypeOf(current);
      }
    };
    visit(dtoClass);
    return chain;
  }

  private extractValidationsAndType(
    valItems: ClassValidatorMetaItem[],
    swMeta: SwaggerPropertyMeta,
    mode: 'create' | 'update',
    isVersionField: boolean,
  ): {
    required: boolean;
    validations: FormFieldValidationRule[];
    inferredType: FormInputType;
  } {
    const hasOptional = valItems.some(
      (v) =>
        v.type === 'conditionalValidation' ||
        v.type === 'isOptional' ||
        v.name === 'isOptional',
    );
    const notEmptyItem = valItems.find(
      (v) => v.name === 'isNotEmpty' || v.type === 'isNotEmpty',
    );

    const required = isVersionField
      ? true
      : mode === 'update'
        ? false
        : !hasOptional && (Boolean(notEmptyItem) || swMeta.required !== false);

    const validations: FormFieldValidationRule[] = [];
    let inferredType: FormInputType = 'text';

    if (required) {
      const msg =
        typeof notEmptyItem?.message === 'string'
          ? notEmptyItem.message
          : undefined;
      validations.push({
        type: 'required',
        ...(msg ? { message: msg } : {}),
      });
    }

    for (const item of valItems) {
      const ruleName = item.name || item.type;
      const msg = typeof item.message === 'string' ? item.message : undefined;
      switch (ruleName) {
        case 'minLength': {
          const val = Number(item.constraints?.[0]);
          if (Number.isFinite(val)) {
            validations.push({
              type: 'minLength',
              value: val,
              ...(msg ? { message: msg } : {}),
            });
          }
          break;
        }
        case 'maxLength': {
          const val = Number(item.constraints?.[0]);
          if (Number.isFinite(val)) {
            validations.push({
              type: 'maxLength',
              value: val,
              ...(msg ? { message: msg } : {}),
            });
          }
          break;
        }
        case 'min': {
          const val = Number(item.constraints?.[0]);
          if (Number.isFinite(val)) {
            validations.push({
              type: 'min',
              value: val,
              ...(msg ? { message: msg } : {}),
            });
          }
          break;
        }
        case 'max': {
          const val = Number(item.constraints?.[0]);
          if (Number.isFinite(val)) {
            validations.push({
              type: 'max',
              value: val,
              ...(msg ? { message: msg } : {}),
            });
          }
          break;
        }
        case 'isEmail': {
          inferredType = 'email';
          validations.push({
            type: 'email',
            ...(msg ? { message: msg } : {}),
          });
          break;
        }
        case 'isInt': {
          inferredType = 'number';
          validations.push({
            type: 'int',
            ...(msg ? { message: msg } : {}),
          });
          break;
        }
        case 'isUuid': {
          validations.push({
            type: 'uuid',
            ...(msg ? { message: msg } : {}),
          });
          break;
        }
        case 'isBoolean': {
          inferredType = 'boolean';
          break;
        }
        case 'isArray': {
          inferredType = 'multiselect';
          break;
        }
      }
    }

    return { required, validations, inferredType };
  }

  private resolveInputType(
    propName: string,
    isVersionField: boolean,
    fMeta: FormFieldMetaOptions,
    inferredType: FormInputType,
    swMeta: SwaggerPropertyMeta,
  ): FormInputType {
    if (isVersionField) {
      return 'hidden';
    }
    if (fMeta.inputType) {
      return fMeta.inputType;
    }
    if (inferredType !== 'text') {
      return inferredType;
    }
    if (swMeta.type === Boolean) {
      return 'boolean';
    }
    if (swMeta.type === Number) {
      return 'number';
    }
    if (propName.toLowerCase().includes('senha')) {
      return 'password';
    }
    return 'text';
  }
}
