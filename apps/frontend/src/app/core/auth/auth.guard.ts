import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, type CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuth()) {
    return true;
  }

  return router.parseUrl('/access-denied');
};

export const roleGuard = (role: string): CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuth()) {
    return router.parseUrl('/access-denied');
  }

  if (authService.rolesLoaded()) {
    return authService.hasRole(role) ? true : router.parseUrl('/access-denied');
  }

  return toObservable(authService.rolesLoaded).pipe(
    filter(loaded => loaded),
    take(1),
    map(() => (authService.hasRole(role) ? true : router.parseUrl('/access-denied')))
  );
};
