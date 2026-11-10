import { RolesCatalog } from './roles-catalog';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';

describe('RolesCatalog', () => {
  beforeEach(() => {
    RolesCatalog.clearForTests();
  });

  it('RolesCatalog.register should add a valid role and all() should return it sorted without duplicates', () => {
    RolesCatalog.register('users:read');
    RolesCatalog.register('categorias:create');
    RolesCatalog.register('categorias:create'); // duplicate

    expect(RolesCatalog.all()).toEqual(['categorias:create', 'users:read']);
  });

  it('RolesCatalog.register should throw for a role outside ROLE_FORMAT', () => {
    expect(() => RolesCatalog.register('InvalidRole')).toThrow();
    expect(() => RolesCatalog.register('users')).toThrow();
    expect(() => RolesCatalog.register('users:')).toThrow();
    expect(() => RolesCatalog.register(':read')).toThrow();
  });

  it('RolesCatalog.register should accept global:dados-sensiveis and perfis:sync directly via ROLE_FORMAT', () => {
    expect(() => RolesCatalog.register(SENSITIVE_DATA_ROLE)).not.toThrow();
    expect(RolesCatalog.all()).toContain('global:dados-sensiveis');
    expect(() => RolesCatalog.register('perfis:sync')).not.toThrow();
    expect(RolesCatalog.all()).toContain('perfis:sync');
  });
});
