import { DataSource } from 'typeorm';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Categoria } from '../categorias/entities/categoria.entity';

describe('Database Migrations Integration', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Perfil, Categoria],
      migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
      synchronize: false,
      migrationsRun: false,
      logging: false,
    });
    await dataSource.initialize();
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should apply InitialSchema on an empty in-memory database', async () => {
    const executedMigrations = await dataSource.runMigrations();
    expect(executedMigrations.length).toBeGreaterThan(0);
    expect(executedMigrations[0].name).toContain('InitialSchema');
  });

  it('should create tables users, perfis, users_perfis and categorias with the BaseEntity columns (version, deletedAt, ultimoUsuarioId)', async () => {
    await dataSource.runMigrations();
    const queryRunner = dataSource.createQueryRunner();

    const tables = ['users', 'perfis', 'categorias', 'users_perfis'];
    for (const table of tables) {
      const tableExists = await queryRunner.hasTable(table);
      expect(tableExists).toBe(true);
    }

    for (const table of ['users', 'perfis', 'categorias']) {
      const columns = await queryRunner.getTable(table);
      expect(columns?.findColumnByName('id')).toBeDefined();
      expect(columns?.findColumnByName('version')).toBeDefined();
      expect(columns?.findColumnByName('createdAt')).toBeDefined();
      expect(columns?.findColumnByName('updatedAt')).toBeDefined();
      expect(columns?.findColumnByName('deletedAt')).toBeDefined();
      expect(columns?.findColumnByName('ultimoUsuarioId')).toBeDefined();
    }

    await queryRunner.release();
  });

  it('should revert InitialSchema cleanly', async () => {
    await dataSource.runMigrations();
    await dataSource.undoLastMigration();

    const queryRunner = dataSource.createQueryRunner();
    const tables = ['users', 'perfis', 'categorias', 'users_perfis'];
    for (const table of tables) {
      const tableExists = await queryRunner.hasTable(table);
      expect(tableExists).toBe(false);
    }
    await queryRunner.release();
  });

  it('should reject two active categorias with the same nome (partial unique index)', async () => {
    await dataSource.runMigrations();
    const categoriaRepo = dataSource.getRepository(Categoria);

    const c1 = categoriaRepo.create({
      nome: 'Eletrônicos',
      ativo: true,
      valor: 1000,
    });
    await categoriaRepo.save(c1);

    const c2 = categoriaRepo.create({
      nome: 'Eletrônicos',
      ativo: true,
      valor: 2000,
    });

    await expect(categoriaRepo.save(c2)).rejects.toThrow();
  });

  it('should allow reusing a categoria nome after soft delete', async () => {
    await dataSource.runMigrations();
    const categoriaRepo = dataSource.getRepository(Categoria);

    const c1 = categoriaRepo.create({
      nome: 'Roupas',
      ativo: true,
      valor: 500,
    });
    await categoriaRepo.save(c1);

    await categoriaRepo.softRemove(c1);

    const c2 = categoriaRepo.create({
      nome: 'Roupas',
      ativo: true,
      valor: 600,
    });
    const saved = await categoriaRepo.save(c2);
    expect(saved.id).toBeDefined();
    expect(saved.nome).toBe('Roupas');
  });
});
