import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { RolesCatalogController } from './roles-catalog.controller';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { OPERATION_KEY } from '../auth/permissions/operation.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('RolesCatalogController', () => {
  let controller: RolesCatalogController;

  beforeEach(() => {
    RolesCatalog.clearForTests();
    RolesCatalog.register('perfis:create');
    RolesCatalog.register('perfis:read');
    RolesCatalog.register('users:read');
    RolesCatalog.register(SENSITIVE_DATA_ROLE);
    controller = new RolesCatalogController();
  });

  it('should return the full catalog including DADOS_SENSIVEIS and perfis:create', () => {
    const result = controller.getRoles();
    expect(result.roles).toContain(SENSITIVE_DATA_ROLE);
    expect(result.roles).toContain('perfis:create');
    expect(result.roles).toContain('perfis:read');
    expect(result.roles).toContain('users:read');
  });

  it('should require perfis:read and apply JwtAuthGuard and RolesGuard', () => {
    const reflector = new Reflector();
    const handler = RolesCatalogController.prototype.getRoles;

    const operation = reflector.get<string>(OPERATION_KEY, handler);
    expect(operation).toBe('perfis:read');

    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});
