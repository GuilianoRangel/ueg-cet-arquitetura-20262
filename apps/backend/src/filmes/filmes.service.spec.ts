import { DataSource } from 'typeorm';
import { FilmesService } from './filmes.service';
import { Filme } from './entities/filme.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { User } from '../users/entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import { Funcionalidade } from '../perfis/entities/funcionalidade.entity';
import { FuncionalidadeAcao } from '../perfis/entities/funcionalidade-acao.entity';
import { TransactionRunner } from '../common/crud/transaction-runner';
import { MaskService } from '../common/crud/masking/mask.service';
import { AuthenticatedUser } from '../common/crud/crud.types';
import { BusinessException } from '../common/exceptions/business.exception';
import { PermissionsService } from '../auth/permissions/permissions.service';

async function expectAsyncBusinessError(
  promise: Promise<unknown>,
  expectedCode: string,
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
    if (expectedField) {
      expect(be.details).toEqual([
        expect.objectContaining({ field: expectedField }),
      ]);
    }
  }
}

describe('FilmesService', () => {
  let dataSource: DataSource;
  let runner: TransactionRunner;
  let maskService: MaskService;
  let permissionsServiceMock: {
    getEffectiveRoles: jest.Mock;
  };
  let service: FilmesService;

  const defaultUser: AuthenticatedUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@ueg.br',
    nome: 'Admin',
  };

  let catSciFi: Categoria;
  let catDrama: Categoria;
  let catInativa: Categoria;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      entities: [
        Filme,
        Categoria,
        User,
        Perfil,
        Funcionalidade,
        FuncionalidadeAcao,
      ],
      logging: false,
    });
    await dataSource.initialize();

    runner = new TransactionRunner(dataSource);
    maskService = new MaskService();
    permissionsServiceMock = {
      getEffectiveRoles: jest.fn().mockResolvedValue(new Set()),
    };

    service = new FilmesService({
      runner,
      mask: maskService,
      permissions: permissionsServiceMock as unknown as PermissionsService,
    });

    const catRepo = dataSource.getRepository(Categoria);
    catSciFi = await catRepo.save(
      catRepo.create({ nome: 'Ficção Científica', ativo: true }),
    );
    catDrama = await catRepo.save(
      catRepo.create({ nome: 'Drama', ativo: true }),
    );
    catInativa = await catRepo.save(
      catRepo.create({ nome: 'Antiga', ativo: false }),
    );
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  it('should create a filme with valid categorias, generos and sanitized sinopse HTML', async () => {
    const created = await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse:
          '<p>Uma equipe de <strong>exploradores</strong> viaja através de um buraco de minhoca.</p>',
        generos: ['Ficção Científica', 'Drama'],
        categoriaIds: [catSciFi.id, catDrama.id],
        ativo: true,
      },
      defaultUser,
    );

    expect(created.id).toBeDefined();
    expect(created.titulo).toBe('Interestelar');
    expect(created.ano).toBe(2014);
    expect(created.diretor).toBe('Christopher Nolan');
    expect(created.duracao).toBe(169);
    expect(created.ativo).toBe(true);
    expect(created.version).toBe(1);
    expect(created.generos).toEqual(['Ficção Científica', 'Drama']);
    expect(created.categorias).toHaveLength(2);
    expect(created.sinopse).toBe(
      '<p>Uma equipe de <strong>exploradores</strong> viaja através de um buraco de minhoca.</p>',
    );
  });

  it('should serialize categoriaIds via toJSON() on returned Filme entity', async () => {
    const created = await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse: '<p>Sinopse</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    const json = created.toJSON();
    expect(json.categoriaIds).toEqual([catSciFi.id]);
    expect(json.categoriaNomes).toEqual(['Ficção Científica']);
  });

  it('should list filmes via findAll with relations (categorias) and filter by categoriaId and titulo', async () => {
    await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse: '<p>Sinopse Interestelar</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    await service.create(
      {
        titulo: 'O Poderoso Chefão',
        ano: 1972,
        diretor: 'Francis Ford Coppola',
        duracao: 175,
        sinopse: '<p>Sinopse Chefão</p>',
        generos: ['Drama', 'Crime'],
        categoriaIds: [catDrama.id],
      },
      defaultUser,
    );

    const filterByCat = await service.findAll(
      { categoriaId: catSciFi.id },
      defaultUser,
    );
    expect(filterByCat.items).toHaveLength(1);
    expect(filterByCat.items[0].titulo).toBe('Interestelar');

    const filterByTitulo = await service.findAll(
      { titulo__like: 'Chefão' },
      defaultUser,
    );
    expect(filterByTitulo.items).toHaveLength(1);
    expect(filterByTitulo.items[0].titulo).toBe('O Poderoso Chefão');
  });

  it('should reject creation and update when (titulo, ano) already exists (FILME_TITULO_ANO_EXISTS with field "titulo")', async () => {
    await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse: '<p>Sinopse</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    // Duplicated on create (case-insensitive)
    await expectAsyncBusinessError(
      service.create(
        {
          titulo: 'interestelar',
          ano: 2014,
          diretor: 'Outro Diretor',
          duracao: 120,
          sinopse: '<p>Outra sinopse</p>',
          generos: ['Ficção Científica'],
          categoriaIds: [catSciFi.id],
        },
        defaultUser,
      ),
      'FILME_TITULO_ANO_EXISTS',
      'titulo',
    );

    // Create another different film
    const outro = await service.create(
      {
        titulo: 'A Origem',
        ano: 2010,
        diretor: 'Christopher Nolan',
        duracao: 148,
        sinopse: '<p>Sinopse</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    // Duplicated on update
    await expectAsyncBusinessError(
      service.update(
        outro.id,
        {
          titulo: 'Interestelar',
          ano: 2014,
          version: outro.version,
        },
        defaultUser,
      ),
      'FILME_TITULO_ANO_EXISTS',
      'titulo',
    );
  });

  it('should allow reusing (titulo, ano) after previous filme is soft-deleted', async () => {
    const f1 = await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse: '<p>Sinopse</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    await service.remove(f1.id, f1.version, defaultUser);

    const f2 = await service.create(
      {
        titulo: 'Interestelar',
        ano: 2014,
        diretor: 'Christopher Nolan',
        duracao: 169,
        sinopse: '<p>Sinopse recriada</p>',
        generos: ['Ficção Científica'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    expect(f2.id).toBeDefined();
    expect(f2.id).not.toBe(f1.id);
  });

  it('should reject creation and update when any categoriaId is non-existent or inactive (FILME_CATEGORIA_INVALID with field "categoriaIds")', async () => {
    // Non-existent categoria
    await expectAsyncBusinessError(
      service.create(
        {
          titulo: 'Filme Invalido 1',
          ano: 2020,
          diretor: 'Diretor',
          duracao: 90,
          sinopse: '<p>Sinopse</p>',
          generos: ['Ação'],
          categoriaIds: ['99999999-9999-9999-9999-999999999999'],
        },
        defaultUser,
      ),
      'FILME_CATEGORIA_INVALID',
      'categoriaIds',
    );

    // Inactive categoria
    await expectAsyncBusinessError(
      service.create(
        {
          titulo: 'Filme Invalido 2',
          ano: 2020,
          diretor: 'Diretor',
          duracao: 90,
          sinopse: '<p>Sinopse</p>',
          generos: ['Ação'],
          categoriaIds: [catInativa.id],
        },
        defaultUser,
      ),
      'FILME_CATEGORIA_INVALID',
      'categoriaIds',
    );

    // Inactive categoria on update
    const valido = await service.create(
      {
        titulo: 'Filme Valido',
        ano: 2021,
        diretor: 'Diretor',
        duracao: 100,
        sinopse: '<p>Sinopse</p>',
        generos: ['Comédia'],
        categoriaIds: [catDrama.id],
      },
      defaultUser,
    );

    await expectAsyncBusinessError(
      service.update(
        valido.id,
        {
          categoriaIds: [catInativa.id],
          version: valido.version,
        },
        defaultUser,
      ),
      'FILME_CATEGORIA_INVALID',
      'categoriaIds',
    );
  });

  it('should strip unsafe HTML tags (<script>, onerror) from sinopse and reject empty sinopse HTML (e.g. "<p><br></p>") with field "sinopse"', async () => {
    // Strips unsafe HTML
    const created = await service.create(
      {
        titulo: 'Filme Seguro',
        ano: 2022,
        diretor: 'Diretor',
        duracao: 100,
        sinopse:
          '<p>Texto seguro</p><script>alert("hack")</script><img src="x" onerror="alert(1)" /><iframe src="http://evil.com"></iframe>',
        generos: ['Ação'],
        categoriaIds: [catDrama.id],
      },
      defaultUser,
    );

    expect(created.sinopse).not.toContain('<script');
    expect(created.sinopse).not.toContain('onerror');
    expect(created.sinopse).not.toContain('<iframe');
    expect(created.sinopse).toContain('Texto seguro');

    // Rejects empty HTML (e.g. <p><br></p>)
    await expectAsyncBusinessError(
      service.create(
        {
          titulo: 'Filme Sem Sinopse',
          ano: 2023,
          diretor: 'Diretor',
          duracao: 100,
          sinopse: '<p><br></p>',
          generos: ['Drama'],
          categoriaIds: [catDrama.id],
        },
        defaultUser,
      ),
      'VALIDATION_ERROR',
      'sinopse',
    );
  });

  it('should sync categorias relation on update and enforce optimistic lock (version)', async () => {
    const created = await service.create(
      {
        titulo: 'Filme Sync',
        ano: 2020,
        diretor: 'Diretor',
        duracao: 110,
        sinopse: '<p>Sinopse</p>',
        generos: ['Suspense'],
        categoriaIds: [catSciFi.id],
      },
      defaultUser,
    );

    expect(created.categorias).toHaveLength(1);
    expect(created.categorias[0].id).toBe(catSciFi.id);

    // Update with new categoriaIds
    const updated = await service.update(
      created.id,
      {
        categoriaIds: [catDrama.id],
        version: created.version,
      },
      defaultUser,
    );

    expect(updated.version).toBe(2);
    expect(updated.categorias).toHaveLength(1);
    expect(updated.categorias[0].id).toBe(catDrama.id);

    // Optimistic lock conflict
    await expectAsyncBusinessError(
      service.update(
        created.id,
        {
          titulo: 'Novo Titulo',
          version: 1, // Stale version
        },
        defaultUser,
      ),
      'OPTIMISTIC_LOCK_CONFLICT',
    );
  });
});
