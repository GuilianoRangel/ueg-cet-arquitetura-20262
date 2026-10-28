import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard, adminGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('Auth Guards', () => {
  const mockAuthService = {
    isAuth: signal(false),
    isAdmin: signal(false)
  };

  const mockRouter = {
    parseUrl: vi.fn((url: string) => url as any)
  };

  beforeEach(() => {
    mockAuthService.isAuth.set(false);
    mockAuthService.isAdmin.set(false);
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

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to access-denied if user is not authenticated', () => {
      mockAuthService.isAuth.set(false);

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe('/access-denied');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/access-denied');
    });
  });

  describe('adminGuard', () => {
    it('should return true if user is admin', () => {
      mockAuthService.isAdmin.set(true);

      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to access-denied if user is not admin', () => {
      mockAuthService.isAdmin.set(false);

      const result = TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any));
      expect(result).toBe('/access-denied');
      expect(mockRouter.parseUrl).toHaveBeenCalledWith('/access-denied');
    });
  });
});
