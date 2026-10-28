import { DataSource } from 'typeorm';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { User } from '../../users/entities/user.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';
import { Categoria } from '../../categorias/entities/categoria.entity';
import { TransactionRunner } from '../../common/crud/transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { RolesCatalog } from '../../auth/permissions/roles-catalog';
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
      entities: [User, Perfil, Categoria],
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

    return new SeedService(
      transactionRunner,
      permissionsServiceMock as PermissionsService,
      configService,
    );
  };

  it('should create perfil Administrador with sistema=true and all catalog roles except DADOS_SENSIVEIS', async () => {
    const service = createService();
    await service.onApplicationBootstrap();

    const perfilRepo = dataSource.getRepository(Perfil);
    const adminPerfil = await perfilRepo.findOne({
      where: { nome: ADMIN_PERFIL_NOME },
    });

    expect(adminPerfil).toBeDefined();
    expect(adminPerfil?.sistema).toBe(true);
    expect(adminPerfil?.ativo).toBe(true);
    expect(adminPerfil?.roles).toEqual(
      expect.arrayContaining(['users:read', 'users:create', 'categorias:read']),
    );
    expect(adminPerfil?.roles).not.toContain(SENSITIVE_DATA_ROLE);
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
