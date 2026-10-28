import 'reflect-metadata';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';

export const MASKED_METADATA_KEY = Symbol('MASKED_METADATA_KEY');

export interface MaskedOptions {
  role?: string;
  maskValue?: unknown;
  maskFn?: (value: unknown, entity: unknown) => unknown;
}

export interface MaskedFieldMetadata extends MaskedOptions {
  propertyKey: string;
}

export function Masked(options: MaskedOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const key = String(propertyKey);
    const existing =
      (Reflect.getMetadata(MASKED_METADATA_KEY, target.constructor) as
        | MaskedFieldMetadata[]
        | undefined) ?? [];

    const fieldMeta: MaskedFieldMetadata = {
      propertyKey: key,
      role: options.role ?? SENSITIVE_DATA_ROLE,
      maskValue: options.maskValue,
      maskFn: options.maskFn,
    };

    Reflect.defineMetadata(
      MASKED_METADATA_KEY,
      [...existing, fieldMeta],
      target.constructor,
    );
  };
}

export function getMaskedFields(
  targetClass: new (...args: never[]) => unknown,
): MaskedFieldMetadata[] {
  const meta = Reflect.getMetadata(MASKED_METADATA_KEY, targetClass) as
    | MaskedFieldMetadata[]
    | undefined;
  return meta || [];
}
