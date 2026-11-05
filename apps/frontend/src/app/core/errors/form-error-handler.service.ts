import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormGroup } from '@angular/forms';
import { take } from 'rxjs';
import { ApiErrorDetail, ApiErrorResponse } from '@repo/utils';
import { ToastService } from '../../shared/components/ui/toast.service';

export type ErrorLevel = 'field' | 'business' | 'unexpected';

export interface ClassifiedError {
  level: ErrorLevel;
  message: string;
  code?: string;
  fieldErrors: ApiErrorDetail[];
}

export interface FormErrorOutcome {
  level: ErrorLevel;
  bannerMessage: string | null;
}

const UNEXPECTED_ERROR_MESSAGE =
  'Ocorreu um erro inesperado ao comunicar com o servidor. Por favor, tente novamente em instantes.';

const FIELD_CODE_FALLBACK_MAP: Record<string, string> = {
  USER_EMAIL_EXISTS: 'email',
  AUTH_EMAIL_EXISTS: 'email',
  CATEGORIA_NOME_EXISTS: 'nome',
  PERFIL_NOME_EXISTS: 'nome',
  USER_PERFIL_INVALID: 'perfilIds',
  PERFIL_ROLE_INVALID: 'roles',
};

@Injectable({
  providedIn: 'root',
})
export class FormErrorHandlerService {
  private readonly toastService = inject(ToastService);

  classifyError(err: unknown): ClassifiedError {
    if (!(err instanceof HttpErrorResponse)) {
      return {
        level: 'unexpected',
        message: UNEXPECTED_ERROR_MESSAGE,
        fieldErrors: [],
      };
    }

    if (err.status >= 500 || err.status === 0) {
      return {
        level: 'unexpected',
        message: UNEXPECTED_ERROR_MESSAGE,
        fieldErrors: [],
      };
    }

    const body = err.error as Partial<ApiErrorResponse> | null | undefined;
    if (
      !body ||
      typeof body !== 'object' ||
      typeof body.error !== 'string' ||
      typeof body.message !== 'string'
    ) {
      return {
        level: 'unexpected',
        message: UNEXPECTED_ERROR_MESSAGE,
        fieldErrors: [],
      };
    }

    if (Array.isArray(body.details) && body.details.length > 0) {
      const validDetails = body.details.filter(
        (d): d is ApiErrorDetail =>
          Boolean(d) &&
          typeof d.field === 'string' &&
          typeof d.message === 'string',
      );
      if (validDetails.length > 0) {
        return {
          level: 'field',
          message: body.message,
          code: body.error,
          fieldErrors: validDetails,
        };
      }
    }

    const fallbackField = FIELD_CODE_FALLBACK_MAP[body.error];
    if (fallbackField) {
      return {
        level: 'field',
        message: body.message,
        code: body.error,
        fieldErrors: [{ field: fallbackField, message: body.message }],
      };
    }

    return {
      level: 'business',
      message: body.message,
      code: body.error,
      fieldErrors: [],
    };
  }

  applyToForm(form: FormGroup, err: unknown): FormErrorOutcome {
    const classified = this.classifyError(err);

    if (classified.level === 'field') {
      let appliedCount = 0;

      for (const detail of classified.fieldErrors) {
        const control = form.get(detail.field);
        if (control) {
          appliedCount++;
          const existingErrors = control.errors ?? {};
          control.setErrors({
            ...existingErrors,
            serverError: detail.message,
          });
          control.markAsTouched();

          control.valueChanges.pipe(take(1)).subscribe(() => {
            if (control.errors && 'serverError' in control.errors) {
              const remaining = { ...control.errors };
              delete remaining['serverError'];
              const hasRemaining = Object.keys(remaining).length > 0;
              control.setErrors(hasRemaining ? remaining : null);
            }
          });
        }
      }

      if (appliedCount === 0) {
        return {
          level: 'business',
          bannerMessage: classified.message,
        };
      }

      return {
        level: 'field',
        bannerMessage: null,
      };
    }

    if (classified.level === 'business') {
      return {
        level: 'business',
        bannerMessage: classified.message,
      };
    }

    return {
      level: 'unexpected',
      bannerMessage: null,
    };
  }

  handleNonFormError(err: unknown): void {
    const classified = this.classifyError(err);
    if (classified.level !== 'unexpected') {
      this.toastService.error(classified.message);
    }
  }
}
