import { DataSource, Repository } from 'typeorm';
import {
  PermissionsService,
  PERMISSIONS_CACHE_TTL_MS,
} from './permissions.service';
import { RolesCatalog } from './roles-catalog';
import { User } from '../../users/entities/user.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let userRepoMock: Partial<Repository<User>>;
  let dataSourceMock: Partial<DataSource>;

  beforeEach(() => {
    jest.useFakeTimers();
    RolesCatalog.clearForTests();
    RolesCatalog.register('users:read');
    RolesCatalog.register('users:create');
    RolesCatalog.register('categorias:read');

    userRepoMock = {
      findOne: jest.fn(),
    };

    dataSourceMock = {
      getRepository: jest.fn().mockReturnValue(userRepoMock),
    };

    service = new PermissionsService(dataSourceMock as DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return the union of roles of active non-deleted perfis', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
        {
          id: 'p2',
          nome: 'P2',
          ativo: true,
          deletedAt: null,
          roles: ['users:create', 'categorias:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const roles = await service.getEffectiveRoles('u1');
    expect(roles).toEqual(
      new Set(['users:read', 'users:create', 'categorias:read']),
    );
  });

  it('should ignore inactive perfis', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
        {
          id: 'p2',
          nome: 'P2',
          ativo: false,
          deletedAt: null,
          roles: ['users:create'],
        } as Perfil,
        {
          id: 'p3',
          nome: 'P3',
          ativo: true,
          deletedAt: new Date(),
          roles: ['categorias:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const roles = await service.getEffectiveRoles('u1');
    expect(roles).toEqual(new Set(['users:read']));
  });

  it('should return empty set for inactive or deleted user', async () => {
    const inactiveUser: Partial<User> = {
      id: 'u1',
      ativo: false,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(inactiveUser);

    let roles = await service.getEffectiveRoles('u1');
    expect(roles.size).toBe(0);

    service.invalidateAll();

    const deletedUser: Partial<User> = {
      id: 'u2',
      ativo: true,
      deletedAt: new Date(),
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(deletedUser);

    roles = await service.getEffectiveRoles('u2');
    expect(roles.size).toBe(0);
  });

  it('should return empty set for user without perfis', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const roles = await service.getEffectiveRoles('u1');
    expect(roles.size).toBe(0);
  });

  it('should drop roles that are not in the catalog', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read', 'obsolete:role'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    const roles = await service.getEffectiveRoles('u1');
    expect(roles).toEqual(new Set(['users:read']));
    expect(roles.has('obsolete:role')).toBe(false);
  });

  it('should serve from cache within 5 minutes without hitting the database', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(1);

    // 4 minutes later
    jest.advanceTimersByTime(4 * 60 * 1000);
    const cachedRoles = await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(1);
    expect(cachedRoles).toEqual(new Set(['users:read']));
  });

  it('should reload after the 5 minute TTL expires', async () => {
    const user: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [
        {
          id: 'p1',
          nome: 'P1',
          ativo: true,
          deletedAt: null,
          roles: ['users:read'],
        } as Perfil,
      ],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user);

    await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(1);

    // Advance 5 minutes + 1ms
    jest.advanceTimersByTime(PERMISSIONS_CACHE_TTL_MS + 1);
    await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(2);
  });

  it('invalidate should drop only that user', async () => {
    const user1: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [],
    };
    const user2: Partial<User> = {
      id: 'u2',
      ativo: true,
      deletedAt: null,
      perfis: [],
    };
    (userRepoMock.findOne as jest.Mock).mockImplementation(
      (opts: { where: { id: string } }) => {
        if (opts.where.id === 'u1') return Promise.resolve(user1);
        return Promise.resolve(user2);
      },
    );

    await service.getEffectiveRoles('u1');
    await service.getEffectiveRoles('u2');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(2);

    service.invalidate('u1');

    await service.getEffectiveRoles('u2'); // cached
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(2);

    await service.getEffectiveRoles('u1'); // reloaded
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(3);
  });

  it('invalidateAll should drop every entry', async () => {
    const user1: Partial<User> = {
      id: 'u1',
      ativo: true,
      deletedAt: null,
      perfis: [],
    };
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(user1);

    await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(1);

    service.invalidateAll();

    await service.getEffectiveRoles('u1');
    expect(userRepoMock.findOne).toHaveBeenCalledTimes(2);
  });
});
