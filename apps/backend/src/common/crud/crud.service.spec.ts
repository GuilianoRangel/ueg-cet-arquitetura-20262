import { DataSource } from 'typeorm';
import { join } from 'path';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { CrudService, CrudDeps } from './crud.service';
import { CrudConfig, AuthenticatedUser } from './crud.types';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { User } from '../../users/entities/user.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';
import { TransactionRunner } from './transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { MaskService } from './masking/mask.service';
import { BusinessException } from '../exceptions/business.exception';

interface CreateTestCategoriaDto {
  nome: string;
  ativo?: boolean;
  valor?: number | null;
}

interface UpdateTestCategoriaDto {
  nome?: string;
  ativo?: boolean;
  valor?: number | null;
  version: number;
}

class CreateTestCategoriaDtoClass implements CreateTestCategoriaDto {
  nome!: string;
  ativo?: boolean;
  valor?: number | null;
}

class UpdateTestCategoriaDtoClass implements UpdateTestCategoriaDto {
  nome?: string;
  ativo?: boolean;
  valor?: number | null;
  version!: number;
}

async function expectAsyncBusinessError(
  promise: Promise<unknown>,
  expectedCode: string,
) {
  try {
    await promise;
    fail(
      `Expected promise to throw BusinessException with code ${expectedCode}`,
    );
  } catch (err: unknown) {
    expect(err).toBeInstanceOf(BusinessException);
    const be = err as BusinessException;
    expect(be.code).toBe(expectedCode);
  }
}

class TestCategoriaService extends CrudService<
  Categoria,
  CreateTestCategoriaDto,
  UpdateTestCategoriaDto
> {
  constructor(
    deps: CrudDeps,
    config: CrudConfig<
      Categoria,
      CreateTestCategoriaDto,
      UpdateTestCategoriaDto
    >,
  ) {
    super(deps, config);
  }

  // Expose syncRelations for testing
  public testSyncRelationsMock?: jest.Mock;

  protected override async syncRelations(
    id: string,
    input: CreateTestCategoriaDto | UpdateTestCategoriaDto,
    ctx: unknown,
  ): Promise<void> {
    if (this.testSyncRelationsMock) {
      await (
        this.testSyncRelationsMock as (
          a: string,
          b: unknown,
          c: unknown,
        ) => Promise<void>
      )(id, input, ctx);
    }
  }
}

describe('CrudService', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;
  let permissionsServiceMock: Partial<PermissionsService>;
  let maskService: MaskService;
  let deps: CrudDeps;

  let service: TestCategoriaService;

  const defaultUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'test@ueg.br',
    nome: 'Tester',
  };

  const config: CrudConfig<
    Categoria,
    CreateTestCategoriaDto,
    UpdateTestCategoriaDto
  > = {
    resource: 'categorias',
    entity: Categoria,
    createDto: CreateTestCategoriaDtoClass,
    updateDto: UpdateTestCategoriaDtoClass,
    filters: {
      nome: { type: 'string', operators: ['eq', 'like'] },
      ativo: { type: 'boolean', operators: ['eq'] },
      valor: {
        type: 'number',
        operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
      },
    },
    sortable: ['nome', 'valor', 'createdAt', 'id'],
  };

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Perfil, Categoria],
      migrations: [
        join(__dirname, '..', '..', 'database', 'migrations', '*{.ts,.js}'),
      ],
      synchronize: false,
      migrationsRun: true,
      logging: false,
    });
    await dataSource.initialize();

    runner = new TransactionRunner(dataSource);
    maskService = new MaskService();
    permissionsServiceMock = {
      getEffectiveRoles: jest.fn().mockResolvedValue(new Set()),
    };

    deps = new CrudDeps(
      runner,
      permissionsServiceMock as PermissionsService,
      maskService,
    );

    service = new TestCategoriaService(deps, { ...config });
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('create', () => {
    it('should persist, set ultimoUsuarioId to the acting user and version 1', async () => {
      const created = await service.create(
        { nome: 'Cat 1', ativo: true },
        defaultUser,
      );

      expect(created.id).toBeDefined();
      expect(created.nome).toBe('Cat 1');
      expect(created.version).toBe(1);
      expect(created.ultimoUsuarioId).toBe(defaultUser.id);
    });

    it('should run validators before before-hooks before persistence', async () => {
      const callOrder: string[] = [];

      service.addValidator('create', () => {
        callOrder.push('validator');
      });

      service.addBeforeHook('create', () => {
        callOrder.push('beforeHook');
      });

      await service.create({ nome: 'Order Test' }, defaultUser);
      expect(callOrder).toEqual(['validator', 'beforeHook']);
    });

    it('should not persist when a validator throws', async () => {
      service.addValidator('create', () => {
        throw new BusinessException(
          'Erro de validação',
          'VALIDATION_FAILED',
          400,
        );
      });

      await expect(
        service.create({ nome: 'Will Fail' }, defaultUser),
      ).rejects.toThrow('Erro de validação');

      const count = await dataSource.getRepository(Categoria).count();
      expect(count).toBe(0);
    });

    it('should allow before hook to change input', async () => {
      service.addBeforeHook('create', (ctx) => {
        const input = ctx.input;
        input.nome = input.nome.toUpperCase();
      });

      const created = await service.create({ nome: 'lowercase' }, defaultUser);
      expect(created.nome).toBe('LOWERCASE');
    });

    it('should run after hooks inside the transaction and rollback everything when an after hook throws', async () => {
      service.addAfterHook('create', () => {
        throw new Error('After hook failed');
      });

      await expect(
        service.create({ nome: 'Cat Rollback' }, defaultUser),
      ).rejects.toThrow('After hook failed');

      const count = await dataSource.getRepository(Categoria).count();
      expect(count).toBe(0);
    });

    it('should run afterCommit hooks only after commit and only log their errors', async () => {
      let executed = false;
      service.addAfterCommitHook('create', () => {
        executed = true;
        throw new Error('Async side effect error');
      });

      const created = await service.create({ nome: 'Committed' }, defaultUser);
      expect(created.id).toBeDefined();
      expect(executed).toBe(true);
    });

    it('should execute multiple validators/hooks in registration order', async () => {
      const order: number[] = [];
      service.addValidator('create', () => {
        order.push(1);
      });
      service.addValidator('create', () => {
        order.push(2);
      });
      service.addBeforeHook('create', () => {
        order.push(3);
      });
      service.addBeforeHook('create', () => {
        order.push(4);
      });

      await service.create({ nome: 'Multi' }, defaultUser);
      expect(order).toEqual([1, 2, 3, 4]);
    });

    it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when a masked field is sent without the role', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set(), // no DADOS_SENSIVEIS
      );

      await expectAsyncBusinessError(
        service.create({ nome: 'Val Test', valor: 5000 }, defaultUser),
        'FORBIDDEN_SENSITIVE_FIELD',
      );
    });

    it('should mask masked fields in the response when the user lacks the role', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set([SENSITIVE_DATA_ROLE]),
      );
      // Create with role
      const created = await service.create(
        { nome: 'Cat Real', valor: 2500 },
        defaultUser,
      );

      // User without role calls findOne
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set(),
      );
      const readMasked = await service.findOne(created.id, defaultUser);
      expect(readMasked.valor).toBe(99999);
    });

    it('should return the real value when the user has DADOS_SENSIVEIS', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set([SENSITIVE_DATA_ROLE]),
      );

      const created = await service.create(
        { nome: 'Cat Real', valor: 2500 },
        defaultUser,
      );
      expect(created.valor).toBe(2500);
    });

    it('should store null ultimoUsuarioId when user is null', async () => {
      const created = await service.create({ nome: 'No User' }, null);
      expect(created.ultimoUsuarioId).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return entity', async () => {
      const created = await service.create({ nome: 'Find Me' }, defaultUser);
      const found = await service.findOne(created.id, defaultUser);
      expect(found.id).toBe(created.id);
      expect(found.nome).toBe('Find Me');
    });

    it('should throw 404 RESOURCE_NOT_FOUND for unknown or soft-deleted id', async () => {
      await expectAsyncBusinessError(
        service.findOne('00000000-0000-0000-0000-000000000000', defaultUser),
        'RESOURCE_NOT_FOUND',
      );

      const created = await service.create(
        { nome: 'To Soft Delete' },
        defaultUser,
      );
      await service.remove(created.id, 1, defaultUser);

      await expectAsyncBusinessError(
        service.findOne(created.id, defaultUser),
        'RESOURCE_NOT_FOUND',
      );
    });

    it('should run afterFind hooks', async () => {
      let hookRan = false;
      service.addAfterFindHook((entity) => {
        hookRan = true;
        entity.nome = 'Hooked';
      });

      const created = await service.create({ nome: 'Original' }, defaultUser);
      const found = await service.findOne(created.id, defaultUser);
      expect(hookRan).toBe(true);
      expect(found.nome).toBe('Hooked');
    });

    it('should mask fields', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set([SENSITIVE_DATA_ROLE]),
      );
      const created = await service.create(
        { nome: 'Secret', valor: 8000 },
        defaultUser,
      );

      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set(),
      );
      const found = await service.findOne(created.id, defaultUser);
      expect(found.valor).toBe(99999);
    });
  });

  describe('findAll', () => {
    it('should return PageResult with default limit 10', async () => {
      for (let i = 1; i <= 15; i++) {
        await service.create({ nome: `Item ${i}` }, defaultUser);
      }

      const res = await service.findAll({}, defaultUser);
      expect(res.total).toBe(15);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.items.length).toBe(10);
    });

    it('should paginate with page and limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await service.create({ nome: `Paging ${i}` }, defaultUser);
      }

      const res = await service.findAll({ page: '2', limit: '2' }, defaultUser);
      expect(res.page).toBe(2);
      expect(res.limit).toBe(2);
      expect(res.items.length).toBe(2);
    });

    it('should filter using allowed operators', async () => {
      await service.create({ nome: 'Apple', ativo: true }, defaultUser);
      await service.create({ nome: 'Banana', ativo: false }, defaultUser);

      const res = await service.findAll({ nome__like: 'app' }, defaultUser);
      expect(res.total).toBe(1);
      expect(res.items[0].nome).toBe('Apple');
    });

    it('should sort', async () => {
      await service.create({ nome: 'B' }, defaultUser);
      await service.create({ nome: 'A' }, defaultUser);

      const res = await service.findAll({ sort: 'nome' }, defaultUser);
      expect(res.items[0].nome).toBe('A');
      expect(res.items[1].nome).toBe('B');
    });

    it('should exclude soft-deleted records', async () => {
      await service.create({ nome: 'Alive' }, defaultUser);
      const c2 = await service.create({ nome: 'Deleted' }, defaultUser);
      await service.remove(c2.id, 1, defaultUser);

      const res = await service.findAll({}, defaultUser);
      expect(res.total).toBe(1);
      expect(res.items[0].nome).toBe('Alive');
    });

    it('should run afterFind hook for each item', async () => {
      await service.create({ nome: 'Item 1' }, defaultUser);
      await service.create({ nome: 'Item 2' }, defaultUser);

      let hookCount = 0;
      service.addAfterFindHook(() => {
        hookCount++;
      });

      await service.findAll({}, defaultUser);
      expect(hookCount).toBe(2);
    });

    it('should mask fields in every item', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set([SENSITIVE_DATA_ROLE]),
      );
      await service.create({ nome: 'Item 1', valor: 100 }, defaultUser);
      await service.create({ nome: 'Item 2', valor: 200 }, defaultUser);

      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set(),
      );
      const res = await service.findAll({}, defaultUser);
      expect(res.items[0].valor).toBe(99999);
      expect(res.items[1].valor).toBe(99999);
    });
  });

  describe('update', () => {
    it('should update scalar fields, increment version and set ultimoUsuarioId', async () => {
      const created = await service.create({ nome: 'Original' }, defaultUser);
      expect(created.version).toBe(1);

      const updated = await service.update(
        created.id,
        { nome: 'Updated', version: 1 },
        defaultUser,
      );

      expect(updated.nome).toBe('Updated');
      expect(updated.version).toBe(2);
      expect(updated.ultimoUsuarioId).toBe(defaultUser.id);
    });

    it('should throw 409 OPTIMISTIC_LOCK_CONFLICT when version differs', async () => {
      const created = await service.create({ nome: 'Ver Test' }, defaultUser);

      await expectAsyncBusinessError(
        service.update(
          created.id,
          { nome: 'Conflict', version: 2 },
          defaultUser,
        ),
        'OPTIMISTIC_LOCK_CONFLICT',
      );
    });

    it('should throw 409 OPTIMISTIC_LOCK_CONFLICT when the conditional UPDATE affects 0 rows (simulated concurrent change)', async () => {
      const created = await service.create({ nome: 'Sim Test' }, defaultUser);

      // Simulate a concurrent update in another connection changing the version directly in DB
      await dataSource
        .getRepository(Categoria)
        .update({ id: created.id }, { version: 99 });

      await expectAsyncBusinessError(
        service.update(
          created.id,
          { nome: 'Will Fail', version: 1 },
          defaultUser,
        ),
        'OPTIMISTIC_LOCK_CONFLICT',
      );
    });

    it('should throw 404 for unknown id', async () => {
      await expectAsyncBusinessError(
        service.update(
          '00000000-0000-0000-0000-000000000000',
          { nome: 'Unknown', version: 1 },
          defaultUser,
        ),
        'RESOURCE_NOT_FOUND',
      );
    });

    it('should call syncRelations after the scalar update', async () => {
      const created = await service.create({ nome: 'Sync Test' }, defaultUser);
      service.testSyncRelationsMock = jest.fn();

      await service.update(
        created.id,
        { nome: 'Sync New', version: 1 },
        defaultUser,
      );
      expect(service.testSyncRelationsMock).toHaveBeenCalled();
    });

    it('should rollback scalar update when syncRelations throws', async () => {
      const created = await service.create(
        { nome: 'Before Rollback' },
        defaultUser,
      );
      service.testSyncRelationsMock = jest
        .fn()
        .mockRejectedValue(new Error('Sync failed'));

      await expect(
        service.update(
          created.id,
          { nome: 'After Rollback', version: 1 },
          defaultUser,
        ),
      ).rejects.toThrow('Sync failed');

      const reloaded = await dataSource
        .getRepository(Categoria)
        .findOneBy({ id: created.id });
      expect(reloaded?.nome).toBe('Before Rollback');
    });

    it('should run validators with ctx.existing populated', async () => {
      const created = await service.create({ nome: 'Existing' }, defaultUser);

      let existingSeenInValidator: Categoria | null = null;
      service.addValidator('update', (ctx) => {
        existingSeenInValidator = ctx.existing;
      });

      await service.update(
        created.id,
        { nome: 'New Name', version: 1 },
        defaultUser,
      );

      expect(existingSeenInValidator).toBeDefined();
      expect((existingSeenInValidator as unknown as Categoria).nome).toBe(
        'Existing',
      );
    });

    it('should throw 403 FORBIDDEN_SENSITIVE_FIELD for masked field without role', async () => {
      const created = await service.create({ nome: 'Cat' }, defaultUser);

      await expectAsyncBusinessError(
        service.update(created.id, { valor: 999, version: 1 }, defaultUser),
        'FORBIDDEN_SENSITIVE_FIELD',
      );
    });

    it('should not change masked field when it is not in the input', async () => {
      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set([SENSITIVE_DATA_ROLE]),
      );
      const created = await service.create(
        { nome: 'Has Valor', valor: 777 },
        defaultUser,
      );

      (permissionsServiceMock.getEffectiveRoles as jest.Mock).mockResolvedValue(
        new Set(), // without role
      );

      // Update without sending valor
      await service.update(
        created.id,
        { nome: 'New Name', version: 1 },
        defaultUser,
      );

      const inDb = await dataSource
        .getRepository(Categoria)
        .findOneBy({ id: created.id });
      expect(inDb?.valor).toBe(777);
    });
  });

  describe('remove', () => {
    it('should soft delete setting deletedAt, ultimoUsuarioId and incrementing version', async () => {
      const created = await service.create(
        { nome: 'Soft Remove' },
        defaultUser,
      );

      await service.remove(created.id, 1, defaultUser);

      const inDb = await dataSource
        .getRepository(Categoria)
        .findOne({ where: { id: created.id }, withDeleted: true });

      expect(inDb?.deletedAt).not.toBeNull();
      expect(inDb?.ultimoUsuarioId).toBe(defaultUser.id);
      expect(inDb?.version).toBe(2);
    });

    it('should hard delete when deleteMode is hard', async () => {
      const hardService = new TestCategoriaService(deps, {
        ...config,
        deleteMode: 'hard',
      });

      const created = await hardService.create(
        { nome: 'Hard Remove' },
        defaultUser,
      );
      await hardService.remove(created.id, 1, defaultUser);

      const inDb = await dataSource
        .getRepository(Categoria)
        .findOne({ where: { id: created.id }, withDeleted: true });

      expect(inDb).toBeNull();
    });

    it('should throw 409 OPTIMISTIC_LOCK_CONFLICT on stale version', async () => {
      const created = await service.create({ nome: 'Stale Del' }, defaultUser);

      await expectAsyncBusinessError(
        service.remove(created.id, 99, defaultUser),
        'OPTIMISTIC_LOCK_CONFLICT',
      );
    });

    it('should run validators with ctx.existing', async () => {
      const created = await service.create({ nome: 'Del Val' }, defaultUser);

      let validatorSawExisting: Categoria | null = null;
      service.addValidator('remove', (ctx) => {
        validatorSawExisting = ctx.existing;
      });

      await service.remove(created.id, 1, defaultUser);
      expect(validatorSawExisting).toBeDefined();
      expect((validatorSawExisting as unknown as Categoria).nome).toBe(
        'Del Val',
      );
    });

    it('should rollback when after hook throws', async () => {
      const created = await service.create(
        { nome: 'Del After Hook' },
        defaultUser,
      );

      service.addAfterHook('remove', () => {
        throw new Error('After remove hook failed');
      });

      await expect(service.remove(created.id, 1, defaultUser)).rejects.toThrow(
        'After remove hook failed',
      );

      const inDb = await dataSource
        .getRepository(Categoria)
        .findOneBy({ id: created.id });
      expect(inDb?.deletedAt).toBeNull();
    });

    it('should throw 409 RESOURCE_IN_USE on foreign key violation in hard mode', async () => {
      await dataSource.query('PRAGMA foreign_keys = ON');
      await dataSource.query(
        'CREATE TABLE test_perfil_ref (id varchar PRIMARY KEY, perfilId varchar, CONSTRAINT FK_test_perfil FOREIGN KEY (perfilId) REFERENCES perfis(id) ON DELETE RESTRICT)',
      );

      const perfilRepo = dataSource.getRepository(Perfil);
      const p = await perfilRepo.save(
        perfilRepo.create({
          nome: 'FK Perfil',
          roles: [],
          ativo: true,
          sistema: false,
        }),
      );

      await dataSource.query(
        'INSERT INTO test_perfil_ref (id, perfilId) VALUES ("ref1", ?)',
        [p.id],
      );

      class HardCreateDto {}
      class HardUpdateDto {
        version!: number;
      }

      class HardPerfilService extends CrudService<
        Perfil,
        HardCreateDto,
        HardUpdateDto
      > {}

      const hardPerfilService = new HardPerfilService(deps, {
        resource: 'perfis',
        entity: Perfil,
        createDto: HardCreateDto,
        updateDto: HardUpdateDto,
        deleteMode: 'hard',
      });

      await expect(
        hardPerfilService.remove(p.id, 1, defaultUser),
      ).rejects.toThrow();
    });
  });

  describe('concorrência', () => {
    it('should serialize two simultaneous updates and let only one succeed with the same version', async () => {
      const created = await service.create({ nome: 'Concurrent' }, defaultUser);

      const update1 = service.update(
        created.id,
        { nome: 'Update 1', version: 1 },
        defaultUser,
      );

      const update2 = service.update(
        created.id,
        { nome: 'Update 2', version: 1 },
        defaultUser,
      );

      const results = await Promise.allSettled([update1, update2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });
});
