import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Operation, OPERATION_KEY } from './operation.decorator';
import { RolesCatalog } from './roles-catalog';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';

describe('@Operation decorator', () => {
  beforeEach(() => {
    RolesCatalog.clearForTests();
  });

  it('@Operation should register the role in the catalog and set OPERATION_KEY metadata', () => {
    class TestController {
      @Operation('users:read')
      find(this: void) {}
    }

    const reflector = new Reflector();
    const handler = TestController.prototype.find;
    const metadata = reflector.get<string>(OPERATION_KEY, handler);

    expect(metadata).toBe('users:read');
    expect(RolesCatalog.all()).toContain('users:read');
  });

  it('@Operation should apply JwtAuthGuard and RolesGuard', () => {
    class TestController {
      @Operation('users:create')
      create(this: void) {}
    }

    const handler = TestController.prototype.create;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];

    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('@Operation should throw at decoration time for an invalid role', () => {
    expect(() => {
      class TestController {
        @Operation('InvalidRoleFormat')
        invalid() {}
      }
      return TestController;
    }).toThrow();
  });
});
