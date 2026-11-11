import { DataSource } from 'typeorm';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { User } from '../../users/entities/user.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';
import { Funcionalidade } from '../../perfis/entities/funcionalidade.entity';
import { FuncionalidadeAcao } from '../../perfis/entities/funcionalidade-acao.entity';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { TransactionRunner } from '../../common/crud/transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { RolesCatalog } from '../../auth/permissions/roles-catalog';
import { RolesSyncService } from '../../perfis/roles-sync.service';
import { ADMIN_PERFIL_NOME, SENSITIVE_DATA_ROLE } from '@repo/utils';

describe('SeedService', () => {
  let dataSource: DataSource;
  let transactionRunner: TransactionRunner;
  let permissionsServiceMock: Partial<PermissionsService>;
  let configService: ConfigService;

  beforeEach(async () => {
    RolesCatalog.clearForTests();
    RolesCatalog.register('users:read');
    RolesCatalog.register('users:create');
    RolesCatalog.register('categorias:read');
    RolesCatalog.register(SENSITIVE_DATA_ROLE);

    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Perfil, Funcionalidade, FuncionalidadeAcao, Categoria],
      migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
      synchronize: false,
      migrationsRun: true,
      logging: false,
    });
    await dataSource.initialize();
    transactionRunner = new TransactionRunner(dataSource);

    permissionsServiceMock = {
      invalidateAll: jest.fn(),
      invalidate: jest.fn(),
    };
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  const createService = (
    envConfig: Record<string, string | undefined> = {},
  ) => {
    configService = {
      get: jest.fn((key: string) => envConfig[key]),
    } as unknown as ConfigService;

    const rolesSyncService = new RolesSyncService(
      transactionRunner,
      permissionsServiceMock as PermissionsService,
    );

    return new SeedService(rolesSyncService, transactionRunner, configService);
  };

  it('should populate funcionalidades and funcionalidades_acoes from RolesCatalog and link all active actions to Administrador perfil', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    const funcRepo = dataSource.getRepository(Funcionalidade);
    const acaoRepo = dataSource.getRepository(FuncionalidadeAcao);
    const perfilRepo = dataSource.getRepository(Perfil);

    const funcionalidades = await funcRepo.find();
    const acoes = await acaoRepo.find({ relations: ['funcionalidade'] });
    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME },
      relations: ['acoes', 'acoes.funcionalidade'],
    });

    expect(funcionalidades.map((f) => f.nome).sort()).toEqual(
      ['categorias', 'global', 'users'].sort(),
    );
    expect(
      acoes.map((a) => `${a.funcionalidade.nome}:${a.acao}`).sort(),
    ).toEqual(
      [
        'users:read',
        'users:create',
        'categorias:read',
        SENSITIVE_DATA_ROLE,
      ].sort(),
    );
    expect(adminPerfil).toBeDefined();
    expect(adminPerfil?.sistema).toBe(true);
    expect(adminPerfil?.acoes.length).toBe(4);
    expect(adminPerfil?.roles.sort()).toEqual(
      [
        'users:read',
        'users:create',
        'categorias:read',
        SENSITIVE_DATA_ROLE,
      ].sort(),
    );
  });

  it('should soft-delete FuncionalidadeAcao (and Funcionalidade when empty) when a role is removed from RolesCatalog', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    // Remove categorias:read and users:create from catalog
    RolesCatalog.clearForTests();
    RolesCatalog.register('users:read');
    await service.onApplicationBootstrap();

    const funcRepo = dataSource.getRepository(Funcionalidade);
    const acaoRepo = dataSource.getRepository(FuncionalidadeAcao);

    const activeAcoes = await acaoRepo.find({
      relations: ['funcionalidade'],
      withDeleted: false,
    });
    expect(
      activeAcoes.map((a) => `${a.funcionalidade.nome}:${a.acao}`),
    ).toEqual(['users:read']);

    // Check soft-deleted acoes exist with deletedAt
    const deletedAcoes = await acaoRepo.find({
      withDeleted: true,
    });
    const softDeleted = deletedAcoes.filter((a) => a.deletedAt !== null);
    expect(softDeleted.length).toBe(3);

    // Funcionalidade "categorias" should be soft-deleted because it has no active actions
    const categoriasFunc = await funcRepo.findOne({
      where: { nome: 'categorias' },
      withDeleted: true,
    });
    expect(categoriasFunc?.deletedAt).not.toBeNull();

    // Funcionalidade "users" should still be active
    const usersFunc = await funcRepo.findOne({
      where: { nome: 'users' },
      withDeleted: false,
    });
    expect(usersFunc).toBeDefined();
    expect(usersFunc?.deletedAt).toBeNull();
  });

  it('should create a brand new UUID when a previously soft-deleted action is re-added to RolesCatalog (never restoring old ID)', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    const acaoRepo = dataSource.getRepository(FuncionalidadeAcao);
    const initialCategoriasRead = await acaoRepo.findOne({
      where: { acao: 'read', funcionalidade: { nome: 'categorias' } },
      relations: ['funcionalidade'],
    });
    const oldId = initialCategoriasRead!.id;

    // Remove it
    RolesCatalog.clearForTests();
    RolesCatalog.register('users:read');
    await service.onApplicationBootstrap();

    // Re-add it
    RolesCatalog.register('categorias:read');
    await service.onApplicationBootstrap();

    const activeCategoriasRead = await acaoRepo.findOne({
      where: { acao: 'read', funcionalidade: { nome: 'categorias' } },
      relations: ['funcionalidade'],
    });
    expect(activeCategoriasRead).toBeDefined();
    expect(activeCategoriasRead?.id).not.toBe(oldId);
  });

  it('should automatically link newly synced actions to Administrador perfil and invalidate permissions cache', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    (permissionsServiceMock.invalidateAll as jest.Mock).mockClear();

    // Add new role to catalog
    RolesCatalog.register('perfis:sync');
    await service.onApplicationBootstrap();

    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME },
      relations: ['acoes', 'acoes.funcionalidade'],
    });

    expect(adminPerfil?.roles).toContain('perfis:sync');
    expect(permissionsServiceMock.invalidateAll).toHaveBeenCalled();
  });

  it('should create perfil Administrador with sistema=true and all catalog roles including DADOS_SENSIVEIS', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME },
      relations: ['acoes', 'acoes.funcionalidade'],
    });

    expect(adminPerfil).toBeDefined();
    expect(adminPerfil?.sistema).toBe(true);
    expect(adminPerfil?.ativo).toBe(true);
    expect(adminPerfil?.roles).toEqual(
      expect.arrayContaining(['users:read', 'users:create', 'categorias:read']),
    );
    expect(adminPerfil?.roles).toContain(SENSITIVE_DATA_ROLE);
  });

  it('should create admin user linked to perfil Administrador with ativo=true and hashed password', async () => {
    const service = createService({ ADMIN_PASSWORD: 'customPassword123' });
    await service.onApplicationBootstrap();

    const userRepo = dataSource.getRepository(User);
    const adminUser = await userRepo.findOne({
      where: { email: 'admin@ueg.br' },
      relations: ['perfis'],
      select: ['id', 'email', 'nome', 'senha', 'ativo'],
    });

    expect(adminUser).toBeDefined();
    expect(adminUser?.nome).toBe('Administrador');
    expect(adminUser?.ativo).toBe(true);
    expect(adminUser?.perfis[0].nome).toBe(ADMIN_PERFIL_NOME);
    expect(await bcrypt.compare('customPassword123', adminUser!.senha)).toBe(
      true,
    );
  });

  it('should be idempotent when executed twice (no duplicate perfil or user)', async () => {
    const service = createService();
    await service.onApplicationBootstrap();
    await service.onApplicationBootstrap();

    const perfilRepo = dataSource.getRepository(Perfil);
    const userRepo = dataSource.getRepository(User);

    const perfis = await perfilRepo.find({
      where: { nome: ADMIN_PERFIL_NOME },
    });
    const users = await userRepo.find({ where: { email: 'admin@ueg.br' } });

    expect(perfis.length).toBe(1);
    expect(users.length).toBe(1);
  });

  it('should re-sync Administrador roles when the catalog gains a new role', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    // Catalog gains a new role
    RolesCatalog.register('categorias:create');
    await service.onApplicationBootstrap();

    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME },
      relations: ['acoes', 'acoes.funcionalidade'],
    });

    expect(adminPerfil?.roles).toContain('categorias:create');
  });

  it('should not modify an existing admin user', async () => {
    const service = createService({ ADMIN_PASSWORD: 'originalPassword' });
    await service.onApplicationBootstrap();

    const userRepo = dataSource.getRepository(User);
    const existing = await userRepo.findOne({
      where: { email: 'admin@ueg.br' },
      select: ['id', 'senha'],
    });

    const secondService = createService({
      ADMIN_PASSWORD: 'differentPassword',
    });
    await secondService.onApplicationBootstrap();

    const afterSecond = await userRepo.findOne({
      where: { email: 'admin@ueg.br' },
      select: ['id', 'senha'],
    });

    expect(afterSecond?.senha).toBe(existing?.senha);
  });

  it('should call permissionsService.invalidateAll after syncing roles', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    expect(permissionsServiceMock.invalidateAll).toHaveBeenCalled();
  });

  it('should use admin123 when ADMIN_PASSWORD is missing and NODE_ENV is not production', async () => {
    const service = createService({ NODE_ENV: 'development' });
    await service.onApplicationBootstrap();

    const userRepo = dataSource.getRepository(User);
    const adminUser = await userRepo.findOne({
      where: { email: 'admin@ueg.br' },
      select: ['senha'],
    });

    expect(await bcrypt.compare('admin123', adminUser!.senha)).toBe(true);
  });

  it('should throw when ADMIN_PASSWORD is missing and NODE_ENV is production', async () => {
    const service = createService({ NODE_ENV: 'production' });
    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      'ADMIN_PASSWORD é obrigatória em ambiente de produção',
    );
  });

  it('should use ADMIN_EMAIL when provided', async () => {
    const service = createService({ ADMIN_EMAIL: 'custom@ueg.br' });
    await service.onApplicationBootstrap();

    const userRepo = dataSource.getRepository(User);
    const adminUser = await userRepo.findOne({
      where: { email: 'custom@ueg.br' },
    });

    expect(adminUser).toBeDefined();
  });
});
