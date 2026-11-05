import { describe, it, expect, beforeEach } from 'vitest';
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CrudResourceMetaDto, PageResult } from '@repo/utils';
import { SKIP_GLOBAL_LOADING } from '../loading/loading.service';
import { GenericCrudService } from './generic-crud.service';

interface TestCategoria {
  id: string;
  nome: string;
  ativo: boolean;
  valor: number | null;
  version?: number;
}

@Injectable({ providedIn: 'root' })
class TestCategoriasService extends GenericCrudService<TestCategoria> {
  constructor() {
    super('categorias');
  }
}

describe('GenericCrudService', () => {
  let service: TestCategoriasService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TestCategoriasService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(TestCategoriasService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should serialize page, limit, multi-column sorts (field1:ASC,field2:DESC) and filters (field__op=value) in findAll', () => {
    let response: PageResult<TestCategoria> | undefined;

    service
      .findAll({
        page: 2,
        limit: 25,
        sorts: [
          { field: 'nome', direction: 'ASC' },
          { field: 'createdAt', direction: 'DESC' },
        ],
        filters: [
          { field: 'nome', operator: 'like', value: 'cat' },
          { field: 'ativo', operator: 'eq', value: true },
        ],
      })
      .subscribe((res) => {
        response = res;
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/categorias') &&
        r.params.get('page') === '2' &&
        r.params.get('limit') === '25' &&
        r.params.get('sort') === 'nome:ASC,createdAt:DESC' &&
        r.params.get('nome__like') === 'cat' &&
        r.params.get('ativo__eq') === 'true',
    );
    expect(req.request.method).toBe('GET');

    const mockPage: PageResult<TestCategoria> = {
      items: [{ id: '1', nome: 'Categoria 1', ativo: true, valor: 1000 }],
      total: 1,
      page: 2,
      limit: 25,
    };
    req.flush(mockPage);

    expect(response).toEqual(mockPage);
  });

  it('should serialize between and in filter arrays as comma-separated values', () => {
    service
      .findAll({
        page: 1,
        limit: 10,
        filters: [
          { field: 'valor', operator: 'between', value: [100, 500] },
          { field: 'perfilId', operator: 'in', value: ['p1', 'p2'] },
        ],
      })
      .subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/categorias') &&
        r.params.get('valor__between') === '100,500' &&
        r.params.get('perfilId__in') === 'p1,p2',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });

  it('should call GET /:resource/meta and cache result', () => {
    const mockMeta: CrudResourceMetaDto = {
      resource: 'categorias',
      filters: {
        resource: 'categorias',
        fields: [],
      },
      createForm: { mode: 'create', fields: [] },
      updateForm: { mode: 'update', fields: [] },
    };

    let firstResult: CrudResourceMetaDto | undefined;
    let secondResult: CrudResourceMetaDto | undefined;

    service.getMeta().subscribe((res) => (firstResult = res));
    service.getMeta().subscribe((res) => (secondResult = res));

    const req = httpMock.expectOne((r) => r.url.endsWith('/categorias/meta'));
    expect(req.request.method).toBe('GET');
    req.flush(mockMeta);

    expect(firstResult).toEqual(mockMeta);
    expect(secondResult).toEqual(mockMeta);
    httpMock.verify();
  });

  it('should pass version query param on remove(id, version)', () => {
    service.remove('cat-1', 3).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url.endsWith('/categorias/cat-1') && r.params.get('version') === '3',
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should pass SKIP_GLOBAL_LOADING context when skipGlobalLoading option is true', () => {
    service
      .findAll({ page: 1, limit: 10 }, { skipGlobalLoading: true })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/categorias'));
    expect(req.request.context.get(SKIP_GLOBAL_LOADING)).toBe(true);
    req.flush({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  });
});
