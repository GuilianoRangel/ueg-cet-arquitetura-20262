import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { FilmeDto } from '@repo/utils';
import { AuthService } from '../../core/auth/auth.service';
import { FilmesService } from './filmes.service';
import { FilmesPageComponent } from './filmes-page.component';

describe('FilmesPageComponent', () => {
  let fixture: ComponentFixture<FilmesPageComponent>;
  let component: FilmesPageComponent;
  let filmesServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };

  const sampleFilme: FilmeDto = {
    id: 'f-1',
    titulo: 'Interestelar',
    ano: 2014,
    diretor: 'Christopher Nolan',
    duracao: 169,
    sinopse: '<p>Sinopse</p>',
    generos: ['Ficção Científica', 'Drama'],
    ativo: true,
    categorias: [
      {
        id: 'c-1',
        nome: 'Sci-Fi',
        ativo: true,
        valor: null,
        version: 1,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        ultimoUsuarioId: null,
      },
    ],
    categoriaIds: ['c-1'],
    version: 1,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ultimoUsuarioId: null,
  };

  beforeEach(async () => {
    filmesServiceMock = {
      getMeta: vi.fn().mockReturnValue(
        of({
          resource: 'filmes',
          filters: { resource: 'filmes', fields: [] },
          createForm: { mode: 'create', fields: [] },
          updateForm: { mode: 'update', fields: [] },
        }),
      ),
      findAll: vi.fn().mockReturnValue(
        of({
          items: [sampleFilme],
          total: 1,
          page: 1,
          limit: 10,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [FilmesPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            hasRole: vi.fn().mockReturnValue(true),
            isAuth: vi.fn().mockReturnValue(true),
          },
        },
        {
          provide: FilmesService,
          useValue: filmesServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilmesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should configure GenericCrudPageComponent for resource filmes with Titulo, Categorias, Generos, Ano, Diretor, Duracao and Status columns', () => {
    const config = component.pageConfig;
    expect(config.resource).toBe('filmes');
    expect(config.entityLabel).toBe('Filme');

    const columnKeys = config.columns.map((c) => c.key);
    expect(columnKeys).toContain('titulo');
    expect(columnKeys).toContain('categorias');
    expect(columnKeys).toContain('generos');
    expect(columnKeys).toContain('ano');
    expect(columnKeys).toContain('diretor');
    expect(columnKeys).toContain('duracao');
    expect(columnKeys).toContain('ativo');
    expect(config.columns.length).toBe(7);
  });

  it('should format categorias as names array, generos as array and duracao with min suffix', () => {
    const config = component.pageConfig;

    const categoriasCol = config.columns.find((c) => c.key === 'categorias');
    expect(categoriasCol?.type).toBe('badges');
    expect(categoriasCol?.badgeExtractor).toBeDefined();
    const formattedCategorias = categoriasCol?.badgeExtractor!(sampleFilme);
    expect(formattedCategorias?.map((b) => b.label)).toEqual(['Sci-Fi']);

    const generosCol = config.columns.find((c) => c.key === 'generos');
    expect(generosCol?.type).toBe('badges');
    expect(generosCol?.badgeExtractor).toBeDefined();
    const formattedGeneros = generosCol?.badgeExtractor!(sampleFilme);
    expect(formattedGeneros?.map((b) => b.label)).toEqual([
      'Ficção Científica',
      'Drama',
    ]);

    const duracaoCol = config.columns.find((c) => c.key === 'duracao');
    expect(duracaoCol?.formatter).toBeDefined();
    const formattedDuracao = duracaoCol?.formatter!(sampleFilme);
    expect(formattedDuracao).toBe('169 min');
  });
});