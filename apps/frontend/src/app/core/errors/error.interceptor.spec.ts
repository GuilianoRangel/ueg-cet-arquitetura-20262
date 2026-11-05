import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ToastService } from '../../shared/components/ui/toast.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let toastServiceMock: {
    error: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    toastServiceMock = {
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ToastService, useValue: toastServiceMock },
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('errorInterceptor should catch status >= 500, status === 0 or unknown format as level 3 unexpected error and display friendly Toast', () => {
    let caughtError: HttpErrorResponse | undefined;

    // 1. 500 Internal Server Error
    http.get('/api/categorias').subscribe({
      error: (err: HttpErrorResponse) => {
        caughtError = err;
      },
    });

    const req500 = httpMock.expectOne('/api/categorias');
    req500.flush(
      {
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected database error',
      },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(caughtError?.status).toBe(500);
    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Ocorreu um erro inesperado ao comunicar com o servidor. Por favor, tente novamente em instantes.',
    );

    toastServiceMock.error.mockClear();

    // 2. 409 Known business error should NOT trigger level 3 unexpected toast in interceptor
    http.post('/api/users', {}).subscribe({
      error: () => {
        // handled by caller
      },
    });

    const req409 = httpMock.expectOne('/api/users');
    req409.flush(
      {
        statusCode: 409,
        error: 'USER_EMAIL_EXISTS',
        message: 'Já existe um usuário com este e-mail',
        details: [
          { field: 'email', message: 'Já existe um usuário com este e-mail' },
        ],
      },
      { status: 409, statusText: 'Conflict' },
    );

    expect(toastServiceMock.error).not.toHaveBeenCalled();
  });
});
