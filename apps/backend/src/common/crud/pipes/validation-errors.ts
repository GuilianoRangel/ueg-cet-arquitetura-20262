import { ValidationError } from 'class-validator';
import { ApiErrorDetail } from '@repo/utils';
import { ValidationException } from '../../exceptions/validation.exception';

function flattenErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];

  for (const error of errors) {
    const currentPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      const messages = Object.values(error.constraints);
      if (messages.length > 0) {
        details.push({
          field: currentPath,
          message: messages[0],
        });
      }
    }

    if (error.children && error.children.length > 0) {
      details.push(...flattenErrors(error.children, currentPath));
    }
  }

  return details;
}

export function toValidationException(
  errors: ValidationError[],
): ValidationException {
  const details = flattenErrors(errors);
  return new ValidationException(details, 'Dados inválidos');
}
