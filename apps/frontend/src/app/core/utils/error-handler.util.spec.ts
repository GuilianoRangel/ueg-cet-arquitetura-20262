import { describe, it, expect } from 'vitest';
import { parseAuthError } from './error-handler.util';

describe('parseAuthError', () => {
  it('should return custom message for AUTH_USER_INACTIVE', () => {
    const error = { error: { error: 'AUTH_USER_INACTIVE' } };
    expect(parseAuthError(error)).toBe('Sua conta está aguardando liberação do administrador.');
  });

  it('should return custom message for AUTH_INVALID_CREDENTIALS', () => {
    const error = { error: { error: 'AUTH_INVALID_CREDENTIALS' } };
    expect(parseAuthError(error)).toBe('E-mail ou senha incorretos.');
  });

  it('should return custom message for AUTH_EMAIL_EXISTS', () => {
    const error = { error: { error: 'AUTH_EMAIL_EXISTS' } };
    expect(parseAuthError(error)).toBe('Este e-mail já está em uso.');
  });

  it('should return custom message for AUTH_INVALID_TOKEN', () => {
    const error = { error: { error: 'AUTH_INVALID_TOKEN' } };
    expect(parseAuthError(error)).toBe('O token de recuperação é inválido ou expirou.');
  });

  it('should keep reading error.error.error for the new ApiErrorResponse format', () => {
    const apiErrorResponse = {
      error: {
        statusCode: 400,
        error: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    };
    expect(parseAuthError(apiErrorResponse)).toBe('E-mail ou senha incorretos.');
  });

  it('should join array message if message is an array', () => {
    const error = { error: { message: ['Field required', 'Too short'] } };
    expect(parseAuthError(error)).toBe('Field required, Too short');
  });

  it('should return string message if error is unknown', () => {
    const error = { error: { message: 'Some specific error' } };
    expect(parseAuthError(error)).toBe('Some specific error');
  });

  it('should return fallback message for unexpected error', () => {
    expect(parseAuthError(null)).toBe('Ocorreu um erro inesperado. Tente novamente mais tarde.');
    expect(parseAuthError({})).toBe('Ocorreu um erro inesperado. Tente novamente mais tarde.');
  });
});

