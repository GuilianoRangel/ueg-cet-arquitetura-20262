import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { OPERATION_KEY } from '../permissions/operation.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let permissionsService: PermissionsService;

  beforeEach(() => {
    reflector = new Reflector();
    permissionsService = {
      getEffectiveRoles: jest.fn(),
    } as unknown as PermissionsService;
    guard = new RolesGuard(reflector, permissionsService);
  });

  const createMockContext = (
    handlerMetadata?: string,
    user?: { id: string; email: string; nome: string } | null,
  ): ExecutionContext => {
    const handler = () => {};
    if (handlerMetadata) {
      Reflect.defineMetadata(OPERATION_KEY, handlerMetadata, handler);
    }

    return {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should deny with 403 FORBIDDEN when the handler has no @Operation (deny-by-default)', async () => {
    const context = createMockContext(undefined, {
      id: 'u1',
      email: 'a@a.com',
      nome: 'User',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should allow when the user has the required role', async () => {
    const context = createMockContext('users:read', {
      id: 'u1',
      email: 'a@a.com',
      nome: 'User',
    });
    (permissionsService.getEffectiveRoles as jest.Mock).mockResolvedValue(
      new Set(['users:read', 'categorias:read']),
    );

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw 403 FORBIDDEN when the user lacks the role and message names the role', async () => {
    const context = createMockContext('users:delete', {
      id: 'u1',
      email: 'a@a.com',
      nome: 'User',
    });
    (permissionsService.getEffectiveRoles as jest.Mock).mockResolvedValue(
      new Set(['users:read']),
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Acesso negado: requer a role "users:delete"',
    );
  });

  it('should throw 401 UNAUTHORIZED when there is no user', async () => {
    const context = createMockContext('users:read', null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should not throw when handler has no metadata (regression for the old join bug)', async () => {
    const context = createMockContext(undefined, {
      id: 'u1',
      email: 'a@a.com',
      nome: 'User',
    });

    // Should throw ForbiddenException cleanly rather than TypeError (join on undefined)
    try {
      await guard.canActivate(context);
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
    }
  });
});
