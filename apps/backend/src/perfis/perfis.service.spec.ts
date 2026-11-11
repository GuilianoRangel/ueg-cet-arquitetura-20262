import { DataSource } from 'typeorm';
import { PerfisService } from './perfis.service';
import { Perfil } from './entities/perfil.entity';
import { Funcionalidade } from './entities/funcionalidade.entity';
import { FuncionalidadeAcao } from './entities/funcionalidade-acao.entity';
import { User } from '../users/entities/user.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { TransactionRunner } from '../common/crud/transaction-runner';
import { MaskService } from '../common/crud/masking/mask.service';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { AuthenticatedUser } from '../common/crud/crud.types';
import { BusinessException } from '../common/exceptions/business.exception';

async function expectAsyncBusinessError(
  promise: Promise<unknown>,
  expectedCode: string,
  messageIncludes?: string,
  expectedField?: string,
) {
  try {
    await promise;
    throw new Error(
      `Expected promise to throw BusinessException with code ${expectedCode}, but it resolved`,
    );
  } catch (err: unknown) {
    expect(err).toBeInstanceOf(BusinessException);
    const be = err as BusinessException;
    expect(be.code).toBe(expectedCode);
    if (messageIncludes) {
      expect(be.message).toContain(messageIncludes);
    }
    if (expectedField) {
      expect(be.details).toEqual([
        expect.objectContaining({ field: expectedField }),
      ]);
    }
  }
}

describe('PerfisService', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;
  let permissionsServiceMock: {
    invalidateAll: jest.Mock;
    invalidate: jest.Mock;
    getEffectiveRoles: jest.Mock;
  };
  let maskService: MaskService;
  let service: PerfisService;

  let acaoUsersRead: FuncionalidadeAcao;
  let acaoPerfisRead: FuncionalidadeAcao;
  let acaoPerfisCreate: FuncionalidadeAcao;
  let acaoDeleted: FuncionalidadeAcao;

  const defaultUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@ueg.br',
    nome: 'Admin',
  };

  beforeAll(() => {
    RolesCatalog.clearForTests();
    RolesCatalog.register('users:read');
    RolesCatalog.register('users:create');
    RolesCatalog.register('perfis:read');
    RolesCatalog.register('perfis:create');
    RolesCatalog.register('perfis:update');
    RolesCatalog.register('perfis:delete');
  });

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [Perfil, User, Categoria, Funcionalidade, FuncionalidadeAcao],
      logging: false,
    });
    await dataSource.initialize();

    const funcRepo = dataSource.getRepository(Funcionalidade);
    const acaoRepo = dataSource.getRepository(FuncionalidadeAcao);

    const fUsers = await funcRepo.save(funcRepo.create({ nome: 'users' }));
    const fPerfis = await funcRepo.save(funcRepo.create({ nome: 'perfis' }));

    acaoUsersRead = await acaoRepo.save(
      acaoRepo.create({ funcionalidadeId: fUsers.id, acao: 'read' }),
    );
    await acaoRepo.save(
      acaoRepo.create({ funcionalidadeId: fUsers.id, acao: 'create' }),
    );
    acaoPerfisRead = await acaoRepo.save(
      acaoRepo.create({ funcionalidadeId: fPerfis.id, acao: 'read' }),
    );
    acaoPerfisCreate = await acaoRepo.save(
      acaoRepo.create({ funcionalidadeId: fPerfis.id, acao: 'create' }),
    );

    acaoDeleted = await acaoRepo.save(
      acaoRepo.create({
        funcionalidadeId: fUsers.id,
        acao: 'delete',
        deletedAt: new Date(),
      }),
    );

    runner = new TransactionRunner(dataSource);
    maskService = new MaskService();
    permissionsServiceMock = {
      invalidateAll: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn().mockResolvedValue(undefined),
      getEffectiveRoles: jest.fn().mockResolvedValue(new Set()),
    };

    service = new PerfisService(
      {
        runner,
        mask: maskService,
        permissions: permissionsServiceMock as unknown as PermissionsService,
      },
      permissionsServiceMock as unknown as PermissionsService,
    );
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should create a perfil with valid acaoIds and expose acaoIds, funcionalidades, and roles', async () => {
    const created = await service.create(
      {
        nome: 'Operador',
        ativo: true,
        acaoIds: [acaoUsersRead.id, acaoPerfisRead.id],
      },
      defaultUser,
    );

    expect(created.id).toBeDefined();
    expect(created.nome).toBe('Operador');
    expect(created.sistema).toBe(false);
    expect(created.acaoIds.sort()).toEqual(
      [acaoUsersRead.id, acaoPerfisRead.id].sort(),
    );
    expect(created.funcionalidades.sort()).toEqual(['perfis', 'users'].sort());
    expect(created.roles.sort()).toEqual(['perfis:read', 'users:read'].sort());

    const found = await service.findOne(created.id, defaultUser);
    expect(found.acaoIds.sort()).toEqual(
      [acaoUsersRead.id, acaoPerfisRead.id].sort(),
    );
    expect(found.funcionalidades.sort()).toEqual(['perfis', 'users'].sort());
    expect(found.roles.sort()).toEqual(['perfis:read', 'users:read'].sort());
  });

  it('should throw 409 PERFIL_NOME_EXISTS for duplicated nome among non-deleted (case-insensitive)', async () => {
    await service.create(
      {
        nome: 'Suporte',
        acaoIds: [acaoUsersRead.id],
      },
      defaultUser,
    );

    await expectAsyncBusinessError(
      service.create(
        {
          nome: 'suporte',
          acaoIds: [acaoPerfisRead.id],
        },
        defaultUser,
      ),
      'PERFIL_NOME_EXISTS',
      undefined,
      'nome',
    );
  });

  it('should allow reusing nome of a soft-deleted perfil', async () => {
    const created = await service.create(
      {
        nome: 'Temporario',
        acaoIds: [acaoUsersRead.id],
      },
      defaultUser,
    );

    await service.remove(created.id, 1, defaultUser);

    const recreated = await service.create(
      {
        nome: 'temporario',
        acaoIds: [acaoPerfisRead.id],
      },
      defaultUser,
    );

    expect(recreated.id).toBeDefined();
    expect(recreated.nome).toBe('temporario');
  });

  it('should throw 400 PERFIL_ACAO_INVALID when acaoId does not exist or is soft-deleted', async () => {
    const fakeId = '99999999-9999-9999-9999-999999999999';
    await expectAsyncBusinessError(
      service.create(
        {
          nome: 'Invalido',
          acaoIds: [acaoUsersRead.id, fakeId, acaoDeleted.id],
        },
        defaultUser,
      ),
      'PERFIL_ACAO_INVALID',
      fakeId,
      'acaoIds',
    );
  });

  it('should update a perfil acaoIds successfully', async () => {
    const created = await service.create(
      {
        nome: 'Operador',
        acaoIds: [acaoUsersRead.id],
      },
      defaultUser,
    );

    const updated = await service.update(
      created.id,
      {
        nome: 'Operador Atualizado',
        acaoIds: [acaoUsersRead.id, acaoPerfisCreate.id],
        version: created.version,
      },
      defaultUser,
    );

    expect(updated.nome).toBe('Operador Atualizado');
    expect(updated.roles.sort()).toEqual(
      ['perfis:create', 'users:read'].sort(),
    );
  });

  it('should throw 409 PERFIL_SISTEMA_PROTEGIDO when updating a sistema perfil', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const sistemaPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Administrador',
        sistema: true,
        acoes: [acaoUsersRead],
        ultimoUsuarioId: defaultUser.id,
      }),
    );

    await expectAsyncBusinessError(
      service.update(
        sistemaPerfil.id,
        {
          nome: 'Admin Alterado',
          version: 1,
        },
        defaultUser,
      ),
      'PERFIL_SISTEMA_PROTEGIDO',
    );
  });

  it('should throw 409 PERFIL_SISTEMA_PROTEGIDO when removing a sistema perfil', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const sistemaPerfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Administrador',
        sistema: true,
        acoes: [acaoUsersRead],
        ultimoUsuarioId: defaultUser.id,
      }),
    );

    await expectAsyncBusinessError(
      service.remove(sistemaPerfil.id, 1, defaultUser),
      'PERFIL_SISTEMA_PROTEGIDO',
    );
  });

  it('should throw 409 PERFIL_IN_USE when removing a perfil linked to non-deleted users', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const userRepo = dataSource.getRepository(User);

    const perfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Docente',
        acoes: [acaoUsersRead],
        ultimoUsuarioId: defaultUser.id,
      }),
    );

    const user = await userRepo.save(
      userRepo.create({
        nome: 'Prof',
        email: 'prof@ueg.br',
        senha: 'hash',
        ativo: true,
        ultimoUsuarioId: defaultUser.id,
      }),
    );
    await dataSource
      .createQueryBuilder()
      .relation(User, 'perfis')
      .of(user.id)
      .add(perfil.id);

    await expectAsyncBusinessError(
      service.remove(perfil.id, 1, defaultUser),
      'PERFIL_IN_USE',
    );
  });

  it('should allow removing a perfil when linked user is soft-deleted', async () => {
    const perfilRepo = dataSource.getRepository(Perfil);
    const userRepo = dataSource.getRepository(User);

    const perfil = await perfilRepo.save(
      perfilRepo.create({
        nome: 'Docente2',
        acoes: [acaoUsersRead],
        ultimoUsuarioId: defaultUser.id,
      }),
    );

    const user = await userRepo.save(
      userRepo.create({
        nome: 'Prof2',
        email: 'prof2@ueg.br',
        senha: 'hash',
        ativo: true,
        deletedAt: new Date(),
        ultimoUsuarioId: defaultUser.id,
      }),
    );
    await dataSource
      .createQueryBuilder()
      .relation(User, 'perfis')
      .of(user.id)
      .add(perfil.id);

    await expect(
      service.remove(perfil.id, 1, defaultUser),
    ).resolves.toBeUndefined();
  });

  it('should call permissionsService.invalidateAll after commit of create, update, and remove', async () => {
    const created = await service.create(
      {
        nome: 'Atendente',
        acaoIds: [acaoUsersRead.id],
      },
      defaultUser,
    );
    expect(permissionsServiceMock.invalidateAll).toHaveBeenCalledTimes(1);

    await service.update(
      created.id,
      {
        nome: 'Atendente Senior',
        version: 1,
      },
      defaultUser,
    );
    expect(permissionsServiceMock.invalidateAll).toHaveBeenCalledTimes(2);

    await service.remove(created.id, 2, defaultUser);
    expect(permissionsServiceMock.invalidateAll).toHaveBeenCalledTimes(3);
  });
});
