import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorDetail } from '@repo/utils';

export class ValidationException extends HttpException {
  readonly details: ApiErrorDetail[];

  constructor(details: ApiErrorDetail[], message = 'Dados inválidos') {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'VALIDATION_ERROR',
        message,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
    this.details = details;
  }
}
