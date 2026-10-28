import { DataSource } from 'typeorm';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { CategoriasService } from './categorias.service';
import { Categoria } from './entities/categoria.entity';
import { User } from '../users/entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { TransactionRunner } from '../common/crud/transaction-runner';
import { MaskService } from '../common/crud/masking/mask.service';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { AuthenticatedUser } from '../common/crud/crud.types';
import { BusinessException } from '../common/exceptions/business.exception';
import { DtoValidationPipe } from '../common/crud/pipes/dto-validation.pipe';
import { CreateCategoriaDto } from './dto/categoria.dto';
import { ValidationException } from '../common/exceptions/validation.exception';

async function expectAsyncBusinessError(
  promise: Promise<unknown>,
  expectedCode: string,
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
  }
}

describe('CategoriasService', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;
  let permissionsServiceMock: {
    getEffectiveRoles: jest.Mock;
  };
  let maskService: MaskService;
  let service: CategoriasService;

  const defaultUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'user@ueg.br',
    nome: 'User',
  };

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [Categoria, User, Perfil],
      logging: false,
    });
    await dataSource.initialize();

    runner = new TransactionRunner(dataSource);
    maskService = new MaskService();
    permissionsServiceMock = {
      getEffectiveRoles: jest.fn().mockResolvedValue(new Set()),
    };

    service = new CategoriasService({
      runner,
      mask: maskService,
      permissions: permissionsServiceMock as unknown as PermissionsService,
    });
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should create a categoria and return version 1', async () => {
    const created = await service.create(
      {
        nome: 'Livros',
        ativo: true,
      },
      defaultUser,
    );

    expect(created.id).toBeDefined();
    expect(created.nome).toBe('Livros');
    expect(created.version).toBe(1);
    expect(created.ativo).toBe(true);
    expect(created.valor).toBeNull();
  });

  it('should throw 409 CATEGORIA_NOME_EXISTS for duplicated nome (case-insensitive) via validator', async () => {
    await service.create(
      {
        nome: 'Eletrônicos',
      },
      defaultUser,
    );

    await expectAsyncBusinessError(
      service.create(
        {
          nome: 'eletrônicos',
        },
        defaultUser,
      ),
      'CATEGORIA_NOME_EXISTS',
    );
  });

  it('should not throw on update that keeps its own nome', async () => {
    const created = await service.create(
      {
        nome: 'Informática',
      },
      defaultUser,
    );

    const updated = await service.update(
      created.id,
      {
        nome: 'Informática',
        version: 1,
        ativo: false,
      },
      defaultUser,
    );

    expect(updated.id).toBe(created.id);
    expect(updated.ativo).toBe(false);
    expect(updated.version).toBe(2);
  });

  it('should throw CATEGORIA_NOME_EXISTS when update renames to an existing nome', async () => {
    await service.create({ nome: 'Móveis' }, defaultUser);
    const cat2 = await service.create({ nome: 'Decoração' }, defaultUser);

    await expectAsyncBusinessError(
      service.update(
        cat2.id,
        {
          nome: 'móveis',
          version: 1,
        },
        defaultUser,
      ),
      'CATEGORIA_NOME_EXISTS',
    );
  });

  it('should allow reusing the nome after soft delete', async () => {
    const created = await service.create({ nome: 'Descartável' }, defaultUser);
    await service.remove(created.id, 1, defaultUser);

    const recreated = await service.create(
      { nome: 'descartável' },
      defaultUser,
    );
    expect(recreated.id).toBeDefined();
    expect(recreated.nome).toBe('descartável');
  });

  it('should return valor 99999 for users without DADOS_SENSIVEIS in findAll, findOne, create and update responses', async () => {
    // 1. Create with role
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(
      new Set([SENSITIVE_DATA_ROLE]),
    );
    const created = await service.create(
      { nome: 'Premium', valor: 45000 },
      defaultUser,
    );
    expect(created.valor).toBe(45000);

    // 2. Read without role
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(new Set());
    const findOneRes = await service.findOne(created.id, defaultUser);
    expect(findOneRes.valor).toBe(99999);

    const findAllRes = await service.findAll({}, defaultUser);
    expect(findAllRes.items[0].valor).toBe(99999);

    // 3. Update without role (not touching valor) returns masked valor
    const updated = await service.update(
      created.id,
      { nome: 'Premium Plus', version: 1 },
      defaultUser,
    );
    expect(updated.valor).toBe(99999);
  });

  it('should return the real valor for users with DADOS_SENSIVEIS', async () => {
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(
      new Set([SENSITIVE_DATA_ROLE]),
    );

    const created = await service.create(
      { nome: 'Real Valor', valor: 12345 },
      defaultUser,
    );
    expect(created.valor).toBe(12345);

    const found = await service.findOne(created.id, defaultUser);
    expect(found.valor).toBe(12345);

    const list = await service.findAll({}, defaultUser);
    expect(list.items[0].valor).toBe(12345);
  });

  it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when creating with valor without the role', async () => {
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(new Set());

    await expectAsyncBusinessError(
      service.create({ nome: 'Sem Permissao', valor: 100 }, defaultUser),
      'FORBIDDEN_SENSITIVE_FIELD',
    );
  });

  it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when updating valor without the role', async () => {
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(
      new Set([SENSITIVE_DATA_ROLE]),
    );
    const created = await service.create({ nome: 'Base' }, defaultUser);

    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(new Set());
    await expectAsyncBusinessError(
      service.update(created.id, { valor: 500, version: 1 }, defaultUser),
      'FORBIDDEN_SENSITIVE_FIELD',
    );
  });

  it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when filtering or sorting by valor without the role', async () => {
    permissionsServiceMock.getEffectiveRoles.mockResolvedValue(new Set());

    await expectAsyncBusinessError(
      service.findAll({ valor: '100' }, defaultUser),
      'FORBIDDEN_SENSITIVE_FIELD',
    );

    await expectAsyncBusinessError(
      service.findAll({ sort: 'valor' }, defaultUser),
      'FORBIDDEN_SENSITIVE_FIELD',
    );
  });

  it('should create without valor and store null (null stays null in the response)', async () => {
    const created = await service.create({ nome: 'Sem Valor' }, defaultUser);
    expect(created.valor).toBeNull();

    const found = await service.findOne(created.id, defaultUser);
    expect(found.valor).toBeNull();
  });

  it('should reject negative or non-integer valor with VALIDATION_ERROR via DtoValidationPipe', async () => {
    const pipe = new DtoValidationPipe(CreateCategoriaDto);

    await expect(
      pipe.transform({ nome: 'Invalido', valor: -10 }),
    ).rejects.toBeInstanceOf(ValidationException);

    await expect(
      pipe.transform({ nome: 'Invalido', valor: 10.5 }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
