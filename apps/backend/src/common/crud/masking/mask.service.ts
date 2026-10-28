import { Injectable } from '@nestjs/common';
import { MASK_DEFAULT_NUMERIC, SENSITIVE_DATA_ROLE } from '@repo/utils';
import { getMaskedFields } from './masked.decorator';

@Injectable()
export class MaskService {
  public apply<T extends object>(entity: T, roles: ReadonlySet<string>): T {
    if (!entity) return entity;
    const constructor = entity.constructor as new (
      ...args: unknown[]
    ) => unknown;
    const fields = getMaskedFields(constructor);
    if (!fields || fields.length === 0) {
      return { ...entity };
    }

    const copy = { ...entity } as Record<string, unknown>;

    for (const field of fields) {
      const requiredRole = field.role ?? SENSITIVE_DATA_ROLE;
      if (!roles.has(requiredRole)) {
        const val = copy[field.propertyKey];
        if (val === null || val === undefined) {
          continue;
        }

        if (typeof field.maskFn === 'function') {
          copy[field.propertyKey] = field.maskFn(val, entity);
        } else if (field.maskValue !== undefined) {
          copy[field.propertyKey] = field.maskValue;
        } else {
          if (typeof val === 'number') {
            copy[field.propertyKey] = MASK_DEFAULT_NUMERIC;
          } else if (typeof val === 'string') {
            copy[field.propertyKey] = '********';
          } else {
            copy[field.propertyKey] = null;
          }
        }
      }
    }

    return copy as T;
  }

  public applyMany<T extends object>(
    entities: T[],
    roles: ReadonlySet<string>,
  ): T[] {
    return entities.map((e) => this.apply(e, roles));
  }
}
