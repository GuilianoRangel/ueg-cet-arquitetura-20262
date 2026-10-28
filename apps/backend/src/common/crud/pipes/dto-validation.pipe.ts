import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { toValidationException } from './validation-errors';

@Injectable()
export class DtoValidationPipe implements PipeTransform {
  constructor(private readonly targetType?: Type<unknown>) {}

  public async transform(
    value: unknown,
    metadata?: ArgumentMetadata,
  ): Promise<unknown> {
    const metatype = this.targetType || metadata?.metatype;
    if (
      !metatype ||
      !this.toValidate(metatype as new (...args: unknown[]) => unknown)
    ) {
      return value;
    }

    if (value === null || typeof value !== 'object') {
      value = {};
    }

    const object = plainToInstance(metatype, value) as object;
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw toValidationException(errors);
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: (new (...args: unknown[]) => unknown)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }
}
