import 'reflect-metadata';
import { EntityStatusFieldMeta, EntityStatusFieldType } from '@repo/utils';

export const ENTITY_STATUS_META_KEY = Symbol('ENTITY_STATUS_META_KEY');

export type EntityStatusPrimitive = string | number | boolean;

export interface EntityStatusOptions {
  /** Tipo do campo indicador de status ('boolean' ou 'enum'). Inferido quando omitido */
  type?: EntityStatusFieldType;
  /** Valor único ou lista de valores considerados inativos (padrão: [false] para boolean) */
  inactiveValues?: EntityStatusPrimitive | EntityStatusPrimitive[];
  /** Rótulo exibido para opções inativas no formulário (padrão: 'Inativo') */
  inactiveLabel?: string;
}

function normalizeInactiveValues(
  raw: EntityStatusPrimitive | EntityStatusPrimitive[] | undefined,
): EntityStatusPrimitive[] {
  if (raw === undefined) {
    return [];
  }
  return Array.isArray(raw) ? [...raw] : [raw];
}

function inferStatusType(
  explicitType: EntityStatusFieldType | undefined,
  inactiveValues: EntityStatusPrimitive[],
  designType: unknown,
): EntityStatusFieldType {
  if (explicitType) {
    return explicitType;
  }
  if (
    inactiveValues.length > 0 &&
    inactiveValues.some((v) => typeof v !== 'boolean')
  ) {
    return 'enum';
  }
  if (designType === Boolean) {
    return 'boolean';
  }
  if (inactiveValues.length > 0) {
    return 'boolean';
  }
  return 'boolean';
}

/**
 * Marca a propriedade de uma entidade que indica se o registro está ativo ou inativo.
 * Suporta campos booleanos (padrão: false é inativo) ou enums/strings/números com um ou mais valores inativos.
 */
export function EntityStatus(
  options: EntityStatusOptions = {},
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const propName = String(propertyKey);
    const existing = Reflect.getOwnMetadata(
      ENTITY_STATUS_META_KEY,
      target.constructor,
    ) as EntityStatusFieldMeta | undefined;

    if (existing && existing.field !== propName) {
      throw new Error(
        `Entidade "${target.constructor.name}" possui múltiplos campos com @EntityStatus ("${existing.field}" e "${propName}"). Apenas um é permitido.`,
      );
    }

    const designType: unknown = Reflect.getMetadata(
      'design:type',
      target,
      propertyKey,
    );

    const providedValues = normalizeInactiveValues(options.inactiveValues);
    const resolvedType = inferStatusType(
      options.type,
      providedValues,
      designType,
    );

    let inactiveValues = providedValues;
    if (resolvedType === 'boolean' && inactiveValues.length === 0) {
      inactiveValues = [false];
    }

    if (resolvedType === 'enum' && inactiveValues.length === 0) {
      throw new Error(
        `@EntityStatus no campo "${target.constructor.name}.${propName}" com type="enum" exige "inactiveValues" com ao menos um valor.`,
      );
    }

    const meta: EntityStatusFieldMeta = {
      field: propName,
      type: resolvedType,
      inactiveValues,
      inactiveLabel: options.inactiveLabel ?? 'Inativo',
    };

    Reflect.defineMetadata(ENTITY_STATUS_META_KEY, meta, target.constructor);
  };
}

/**
 * Obtém o metadado de status (@EntityStatus) de uma entidade, percorrendo sua cadeia de protótipos.
 */
export function getEntityStatusMeta(
  entityClass: new (...args: never[]) => unknown,
): EntityStatusFieldMeta | undefined {
  let current: unknown = entityClass;
  while (
    typeof current === 'function' &&
    current !== Function.prototype &&
    current !== Object
  ) {
    const meta = Reflect.getOwnMetadata(ENTITY_STATUS_META_KEY, current) as
      | EntityStatusFieldMeta
      | undefined;
    if (meta) {
      return meta;
    }
    current = Object.getPrototypeOf(current);
  }
  return undefined;
}
