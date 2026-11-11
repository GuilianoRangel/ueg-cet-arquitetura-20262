import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { RolesCatalogController } from './roles-catalog.controller';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { OPERATION_KEY } from '../auth/permissions/operation.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesSyncService } from './roles-sync.service';
import { Funcionalidade } from './entities/funcionalidade.entity';
import { Repository } from 'typeorm';

describe('RolesCatalogController', () => {
  let controller: RolesCatalogController;
  let funcRepoMock: Partial<Repository<Funcionalidade>>;
  let rolesSyncServiceMock: Partial<RolesSyncService>;

  beforeEach(() => {
    RolesCatalog.clearForTests();
    RolesCatalog.register('perfis:create');
    RolesCatalog.register('perfis:read');
    RolesCatalog.register('users:read');

    funcRepoMock = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'f-users',
          nome: 'users',
          deletedAt: null,
          acoes: [
            {
              id: 'a-users-read',
              funcionalidadeId: 'f-users',
              acao: 'read',
              deletedAt: null,
            },
          ],
        },
        {
          id: 'f-perfis',
          nome: 'perfis',
          deletedAt: null,
          acoes: [
            {
              id: 'a-perfis-read',
              funcionalidadeId: 'f-perfis',
              acao: 'read',
              deletedAt: null,
            },
            {
              id: 'a-perfis-create',
              funcionalidadeId: 'f-perfis',
              acao: 'create',
              deletedAt: null,
            },
          ],
        },
      ]),
    };

    rolesSyncServiceMock = {
      sync: jest.fn().mockResolvedValue({
        addedActions: 2,
        removedActions: 0,
        totalActiveActions: 3,
      }),
    };

    controller = new RolesCatalogController(
      funcRepoMock as Repository<Funcionalidade>,
      rolesSyncServiceMock as RolesSyncService,
    );
  });

  it('GET /roles should return active funcionalidades and their active acoes grouped and sorted', async () => {
    const result = await controller.getRoles();
    expect(result.funcionalidades).toHaveLength(2);

    // Sorted by nome ascending: 'perfis' then 'users'
    expect(result.funcionalidades[0].nome).toBe('perfis');
    expect(result.funcionalidades[1].nome).toBe('users');

    // Inside 'perfis', acoes sorted by acao: 'create' then 'read'
    expect(result.funcionalidades[0].acoes.map((a) => a.acao)).toEqual([
      'create',
      'read',
    ]);
    expect(result.funcionalidades[0].acoes[0].role).toBe('perfis:create');
    expect(result.funcionalidades[0].acoes[1].role).toBe('perfis:read');
  });

  it('GET /roles should require perfis:read and apply JwtAuthGuard and RolesGuard', () => {
    const reflector = new Reflector();
    const handler = RolesCatalogController.prototype.getRoles;

    const operation = reflector.get<string>(OPERATION_KEY, handler);
    expect(operation).toBe('perfis:read');

    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('POST /roles/sync should require perfis:sync, apply guards and invoke RolesSyncService.sync()', async () => {
    const reflector = new Reflector();
    const handler = RolesCatalogController.prototype.syncRoles;

    const operation = reflector.get<string>(OPERATION_KEY, handler);
    expect(operation).toBe('perfis:sync');

    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) as unknown[];
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);

    const result = await controller.syncRoles();
    expect(rolesSyncServiceMock.sync).toHaveBeenCalled();
    expect(result).toEqual({
      addedActions: 2,
      removedActions: 0,
      totalActiveActions: 3,
    });
  });
});
