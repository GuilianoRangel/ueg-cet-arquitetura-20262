import { DataSource } from 'typeorm';
import { join } from 'path';
import { User } from '../users/entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Funcionalidade } from '../perfis/entities/funcionalidade.entity';
import { FuncionalidadeAcao } from '../perfis/entities/funcionalidade-acao.entity';
import { Categoria } from '../categorias/entities/categoria.entity';

describe('Database Migrations Integration', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Perfil, Funcionalidade, FuncionalidadeAcao, Categoria],
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

  it('should apply all migrations on an empty in-memory database', async () => {
    const executedMigrations = await dataSource.runMigrations();
    expect(executedMigrations.length).toBe(2);
    expect(executedMigrations[0].name).toContain('InitialSchema');
    expect(executedMigrations[1].name).toContain(
      'CreateFuncionalidadesAndAcoes',
    );
  });

  it('should create tables users, perfis, users_perfis, categorias, funcionalidades, funcionalidades_acoes and perfis_funcionalidades_acoes', async () => {
    await dataSource.runMigrations();
    const queryRunner = dataSource.createQueryRunner();

    const tables = [
      'users',
      'perfis',
      'categorias',
      'users_perfis',
      'funcionalidades',
      'funcionalidades_acoes',
      'perfis_funcionalidades_acoes',
    ];
    for (const table of tables) {
      const tableExists = await queryRunner.hasTable(table);
      expect(tableExists).toBe(true);
    }

    for (const table of [
      'users',
      'perfis',
      'categorias',
      'funcionalidades',
      'funcionalidades_acoes',
    ]) {
      const columns = await queryRunner.getTable(table);
      expect(columns?.findColumnByName('id')).toBeDefined();
      expect(columns?.findColumnByName('version')).toBeDefined();
      expect(columns?.findColumnByName('createdAt')).toBeDefined();
      expect(columns?.findColumnByName('updatedAt')).toBeDefined();
      expect(columns?.findColumnByName('deletedAt')).toBeDefined();
      expect(columns?.findColumnByName('ultimoUsuarioId')).toBeDefined();
    }

    const perfilTable = await queryRunner.getTable('perfis');
    expect(perfilTable?.findColumnByName('roles')).toBeUndefined();

    await queryRunner.release();
  });

  it('should revert all migrations cleanly', async () => {
    await dataSource.runMigrations();
    await dataSource.undoLastMigration(); // Undo CreateFuncionalidadesAndAcoes
    await dataSource.undoLastMigration(); // Undo InitialSchema

    const queryRunner = dataSource.createQueryRunner();
    const tables = [
      'users',
      'perfis',
      'categorias',
      'users_perfis',
      'funcionalidades',
      'funcionalidades_acoes',
      'perfis_funcionalidades_acoes',
    ];
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

  it('should reject two active funcionalidades with the same nome, but allow reusing after soft-delete', async () => {
    await dataSource.runMigrations();
    const repo = dataSource.getRepository(Funcionalidade);

    const f1 = repo.create({ nome: 'categorias' });
    await repo.save(f1);

    const f2 = repo.create({ nome: 'categorias' });
    await expect(repo.save(f2)).rejects.toThrow();

    await repo.softRemove(f1);

    const f3 = repo.create({ nome: 'categorias' });
    const saved = await repo.save(f3);
    expect(saved.id).toBeDefined();
    expect(saved.id).not.toBe(f1.id);
  });

  it('should reject duplicate active (funcionalidadeId, acao), but allow after soft-delete with new ID', async () => {
    await dataSource.runMigrations();
    const funcRepo = dataSource.getRepository(Funcionalidade);
    const acaoRepo = dataSource.getRepository(FuncionalidadeAcao);

    const func = await funcRepo.save(funcRepo.create({ nome: 'categorias' }));

    const a1 = await acaoRepo.save(
      acaoRepo.create({ funcionalidadeId: func.id, acao: 'create' }),
    );

    const a2 = acaoRepo.create({ funcionalidadeId: func.id, acao: 'create' });
    await expect(acaoRepo.save(a2)).rejects.toThrow();

    await acaoRepo.softRemove(a1);

    const a3 = acaoRepo.create({ funcionalidadeId: func.id, acao: 'create' });
    const saved = await acaoRepo.save(a3);
    expect(saved.id).toBeDefined();
    expect(saved.id).not.toBe(a1.id);
  });
});
