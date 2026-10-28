import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { ApiErrorResponse } from '@repo/utils';
import { BusinessException } from '../exceptions/business.exception';
import { ValidationException } from '../exceptions/validation.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  public catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = (request?.url || '').split('?')[0];
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Erro interno do servidor';
    let details: ApiErrorResponse['details'] | undefined = undefined;

    if (exception instanceof BusinessException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const errorRes = res as Record<string, unknown>;
        errorCode = (errorRes.error as string) || 'BUSINESS_ERROR';
        message = (errorRes.message as string) || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof ValidationException) {
      statusCode = exception.getStatus();
      errorCode = 'VALIDATION_ERROR';
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof UnauthorizedException) {
      statusCode = HttpStatus.UNAUTHORIZED;
      errorCode = 'UNAUTHORIZED';
      message = exception.message;
    } else if (exception instanceof ForbiddenException) {
      statusCode = HttpStatus.FORBIDDEN;
      errorCode = 'FORBIDDEN';
      message = exception.message;
    } else if (
      exception instanceof NotFoundException ||
      exception instanceof EntityNotFoundError
    ) {
      statusCode = HttpStatus.NOT_FOUND;
      errorCode = 'RESOURCE_NOT_FOUND';
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (statusCode === HttpStatus.BAD_REQUEST) {
        errorCode = 'BAD_REQUEST';
      } else if (statusCode === HttpStatus.CONFLICT) {
        errorCode = 'RESOURCE_CONFLICT';
      } else {
        errorCode = 'HTTP_ERROR';
      }

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof QueryFailedError) {
      const errMessage = exception.message || '';
      statusCode = HttpStatus.CONFLICT;

      if (errMessage.includes('UNIQUE constraint failed')) {
        errorCode = 'RESOURCE_CONFLICT';
        message = 'Conflito de unicidade de dados';
      } else if (errMessage.includes('FOREIGN KEY constraint failed')) {
        errorCode = 'RESOURCE_IN_USE';
        message = 'O registro está em uso e não pode ser alterado ou excluído';
      } else {
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        errorCode = 'INTERNAL_ERROR';
        message = 'Erro interno do servidor';
        this.logger.error(
          `QueryFailedError: ${exception.message}`,
          exception.stack,
        );
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_ERROR';
      message = 'Erro interno do servidor';

      const stack =
        exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`Erro inesperado: ${message}`, stack);
    }

    const payload: ApiErrorResponse = {
      statusCode,
      error: errorCode,
      message,
      path,
      timestamp,
    };

    if (details !== undefined && details.length > 0) {
      payload.details = details;
    }

    response.status(statusCode).json(payload);
  }
}
