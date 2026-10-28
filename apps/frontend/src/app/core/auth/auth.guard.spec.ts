import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard, roleGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('Auth Guards', () => {
  const mockAuthService = {
    isAuth: signal(false),
    rolesLoaded: signal(false),
    hasRole: vi.fn((_role: string) => false)
  };

  const mockRouter = {
    parseUrl: vi.fn((url: string) => url as unknown as UrlTree)
  };

  beforeEach(() => {
    mockAuthService.isAuth.set(false);
    mockAuthService.rolesLoaded.set(false);
    mockAuthService.hasRole.mockReturnValue(false);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  describe('authGuard', () => {
    it('should return true if user is authenticated', () => {
      mockAuthService.isAuth.set(true);

      const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('should redirect to access-denied if user is not authenticated', () => {
      mockAuthService.isAuth.set(false);

      const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
      expect(result).toBe('/access-denied');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/access-denied');
    });
  });

  describe('roleGuard', () => {
    it('roleGuard should allow when user has the role after roles are loaded', () => {
      mockAuthService.isAuth.set(true);
      mockAuthService.rolesLoaded.set(true);
      mockAuthService.hasRole.mockReturnValue(true);

      const guardFn = roleGuard('users:read');
      const result = TestBed.runInInjectionContext(() => guardFn({} as never, {} as never));
      expect(result).toBe(true);
    });

    it('roleGuard should redirect to /access-denied when role is missing', () => {
      mockAuthService.isAuth.set(true);
      mockAuthService.rolesLoaded.set(true);
      mockAuthService.hasRole.mockReturnValue(false);

      const guardFn = roleGuard('users:read');
      const result = TestBed.runInInjectionContext(() => guardFn({} as never, {} as never));
      expect(result).toBe('/access-denied');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/access-denied');
    });

    it('roleGuard should wait for roles loading', () => {
      mockAuthService.isAuth.set(true);
      mockAuthService.rolesLoaded.set(false);
      mockAuthService.hasRole.mockReturnValue(true);

      const guardFn = roleGuard('users:read');
      const obs$ = TestBed.runInInjectionContext(() => guardFn({} as never, {} as never)) as Observable<boolean | UrlTree>;

      let finalValue: boolean | UrlTree | undefined;
      obs$.subscribe(val => {
        finalValue = val;
      });

      expect(finalValue).toBeUndefined();

      mockAuthService.rolesLoaded.set(true);
      TestBed.flushEffects();

      expect(finalValue).toBe(true);
    });
  });
});
