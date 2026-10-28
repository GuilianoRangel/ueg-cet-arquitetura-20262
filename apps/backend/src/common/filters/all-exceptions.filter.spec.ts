import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessException } from '../exceptions/business.exception';
import { ValidationException } from '../exceptions/validation.exception';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: { status: jest.Mock };
  let mockRequest: { url: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = { url: '/categorias?sort=nome' };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should preserve code and status of a BusinessException', () => {
    const exception = new BusinessException(
      'Categoria duplicada',
      'CATEGORIA_NOME_EXISTS',
      HttpStatus.CONFLICT,
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'CATEGORIA_NOME_EXISTS',
        message: 'Categoria duplicada',
        path: '/categorias',
      }),
    );
  });

  it('should map ValidationException to 400 VALIDATION_ERROR including details', () => {
    const details = [{ field: 'nome', message: 'O nome é obrigatório' }];
    const exception = new ValidationException(details, 'Dados inválidos');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details,
      }),
    );
  });

  it('should map UnauthorizedException to 401 UNAUTHORIZED', () => {
    const exception = new UnauthorizedException('Token inválido');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(401);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: 'Token inválido',
      }),
    );
  });

  it('should map ForbiddenException to 403 FORBIDDEN', () => {
    const exception = new ForbiddenException('Acesso negado');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        error: 'FORBIDDEN',
        message: 'Acesso negado',
      }),
    );
  });

  it('should map NotFoundException to 404 RESOURCE_NOT_FOUND', () => {
    const exception = new NotFoundException('Rota não encontrada');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'RESOURCE_NOT_FOUND',
        message: 'Rota não encontrada',
      }),
    );
  });

  it('should map EntityNotFoundError to 404 RESOURCE_NOT_FOUND', () => {
    const exception = new EntityNotFoundError('Categoria', { id: '123' });
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'RESOURCE_NOT_FOUND',
      }),
    );
  });

  it('should map generic HttpException 400/409/other to BAD_REQUEST/RESOURCE_CONFLICT/HTTP_ERROR', () => {
    const ex400 = new HttpException('Bad input', HttpStatus.BAD_REQUEST);
    filter.catch(ex400, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: 'Bad input',
      }),
    );

    const ex409 = new HttpException('Conflict', HttpStatus.CONFLICT);
    filter.catch(ex409, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'RESOURCE_CONFLICT',
        message: 'Conflict',
      }),
    );

    const ex418 = new HttpException('Teapot', HttpStatus.I_AM_A_TEAPOT);
    filter.catch(ex418, mockHost);
    expect(mockStatus).toHaveBeenCalledWith(418);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 418,
        error: 'HTTP_ERROR',
        message: 'Teapot',
      }),
    );
  });

  it('should map QueryFailedError UNIQUE constraint to 409 RESOURCE_CONFLICT', () => {
    const exception = new QueryFailedError(
      'query',
      [],
      new Error('UNIQUE constraint failed: users.email'),
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'RESOURCE_CONFLICT',
      }),
    );
  });

  it('should map QueryFailedError FOREIGN KEY constraint to 409 RESOURCE_IN_USE', () => {
    const exception = new QueryFailedError(
      'query',
      [],
      new Error('FOREIGN KEY constraint failed'),
    );
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'RESOURCE_IN_USE',
      }),
    );
  });

  it('should map unknown errors to 500 INTERNAL_ERROR with generic message and not leak the original message', () => {
    const exception = new Error('Secret database password leaked in stack');
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
      }),
    );
  });

  it('should log the stack of unexpected errors', () => {
    const loggerSpy = jest
      .spyOn(
        (filter as unknown as { logger: { error: () => void } }).logger,
        'error',
      )
      .mockImplementation();
    const exception = new Error('Unexpected crash');
    filter.catch(exception, mockHost);

    expect(loggerSpy).toHaveBeenCalled();
  });

  it('should return path without query string and ISO timestamp', () => {
    mockRequest.url = '/categorias?page=2&limit=10';
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost);

    const calls = mockJson.mock.calls as unknown[][];
    const payload = calls[0][0] as { path?: string; timestamp?: string };
    expect(payload.path).toBe('/categorias');
    expect(typeof payload.timestamp).toBe('string');
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should not include details when absent', () => {
    const exception = new NotFoundException('Not found');
    filter.catch(exception, mockHost);

    const calls = mockJson.mock.calls as unknown[][];
    const responsePayload = calls[0][0] as { details?: unknown };
    expect(responsePayload.details).toBeUndefined();
  });
});
