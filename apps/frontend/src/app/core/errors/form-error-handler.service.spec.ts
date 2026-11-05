import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { FormErrorHandlerService } from './form-error-handler.service';

describe('FormErrorHandlerService', () => {
  let service: FormErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormErrorHandlerService);
  });

  it('should classify 400 VALIDATION_ERROR with details as level 1 field errors', () => {
    const httpError = new HttpErrorResponse({
      status: 400,
      error: {
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'Erro de validação nos campos enviados',
        details: [
          { field: 'nome', message: 'Nome é obrigatório' },
          { field: 'email', message: 'E-mail inválido' },
        ],
      },
    });

    const result = service.classifyError(httpError);
    expect(result.level).toBe('field');
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.fieldErrors).toEqual([
      { field: 'nome', message: 'Nome é obrigatório' },
      { field: 'email', message: 'E-mail inválido' },
    ]);
  });

  it('should classify 409 USER_EMAIL_EXISTS with details (or via fallback map) as level 1 field error on email control', () => {
    // Case A: with details from backend
    const errorWithDetails = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_EMAIL_EXISTS',
        message: 'Já existe um usuário com este e-mail',
        details: [
          { field: 'email', message: 'Já existe um usuário com este e-mail' },
        ],
      },
    });

    const classifiedWithDetails = service.classifyError(errorWithDetails);
    expect(classifiedWithDetails.level).toBe('field');
    expect(classifiedWithDetails.fieldErrors).toEqual([
      { field: 'email', message: 'Já existe um usuário com este e-mail' },
    ]);

    // Case B: legacy response without details array (uses fallback map)
    const errorWithoutDetails = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_EMAIL_EXISTS',
        message: 'Já existe um usuário com este e-mail',
      },
    });

    const classifiedFallback = service.classifyError(errorWithoutDetails);
    expect(classifiedFallback.level).toBe('field');
    expect(classifiedFallback.fieldErrors).toEqual([
      { field: 'email', message: 'Já existe um usuário com este e-mail' },
    ]);
  });

  it('should apply serverError to matching FormControls and clear serverError when control value changes', () => {
    const form = new FormGroup({
      nome: new FormControl('João'),
      email: new FormControl('duplicado@ueg.br'),
    });

    const httpError = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_EMAIL_EXISTS',
        message: 'Já existe um usuário com este e-mail',
        details: [
          { field: 'email', message: 'Já existe um usuário com este e-mail' },
        ],
      },
    });

    const outcome = service.applyToForm(form, httpError);
    expect(outcome.level).toBe('field');
    expect(outcome.bannerMessage).toBeNull();

    const emailControl = form.get('email')!;
    expect(emailControl.touched).toBe(true);
    expect(emailControl.errors).toEqual({
      serverError: 'Já existe um usuário com este e-mail',
    });

    // When the user edits the email control, serverError must be cleared automatically
    emailControl.setValue('novo@ueg.br');
    expect(emailControl.errors).toBeNull();
  });

  it('should classify 409 USER_LAST_ADMIN or PERFIL_IN_USE without field as level 2 business error and return banner message', () => {
    const form = new FormGroup({
      nome: new FormControl('Admin'),
      ativo: new FormControl(false),
    });

    const lastAdminError = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_LAST_ADMIN',
        message:
          'Não é possível inativar ou remover o único administrador ativo do sistema',
      },
    });

    const classified = service.classifyError(lastAdminError);
    expect(classified.level).toBe('business');
    expect(classified.fieldErrors).toEqual([]);

    const outcome = service.applyToForm(form, lastAdminError);
    expect(outcome.level).toBe('business');
    expect(outcome.bannerMessage).toBe(
      'Não é possível inativar ou remover o único administrador ativo do sistema',
    );
  });
});
