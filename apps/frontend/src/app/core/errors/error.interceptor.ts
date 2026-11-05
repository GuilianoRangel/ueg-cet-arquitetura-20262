import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/components/ui/toast.service';
import { FormErrorHandlerService } from './form-error-handler.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorHandler = inject(FormErrorHandlerService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const classified = errorHandler.classifyError(error);
      if (classified.level === 'unexpected') {
        toastService.error(classified.message);
      }
      return throwError(() => error);
    }),
  );
};
