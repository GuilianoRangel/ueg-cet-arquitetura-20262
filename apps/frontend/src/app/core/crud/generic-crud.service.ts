import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  CrudResourceMetaDto,
  FilterOperator,
  PageResult,
  SearchFilterConfigDto,
} from '@repo/utils';
import { environment } from '../../../environments/environment';
import { withSkipGlobalLoading } from '../loading/loading.service';

export interface CrudSortItem {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface CrudFilterItem {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface CrudQueryState {
  page: number;
  limit: number;
  sorts: CrudSortItem[];
  filters: CrudFilterItem[];
}

export interface CrudRequestOptions {
  skipGlobalLoading?: boolean;
  forceRefresh?: boolean;
}

export abstract class GenericCrudService<
  E extends { id: string; version?: number },
  C = Record<string, unknown>,
  U = Record<string, unknown>,
> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl: string;
  private metaCache$: Observable<CrudResourceMetaDto> | null = null;

  protected constructor(protected readonly resource: string) {
    this.baseUrl = `${environment.apiUrl}/${resource}`;
  }

  protected buildContext(options?: CrudRequestOptions): HttpContext {
    if (options?.skipGlobalLoading) {
      return withSkipGlobalLoading();
    }
    return new HttpContext();
  }

  getMeta(options?: CrudRequestOptions): Observable<CrudResourceMetaDto> {
    if (!this.metaCache$ || options?.forceRefresh) {
      this.metaCache$ = this.http
        .get<CrudResourceMetaDto>(`${this.baseUrl}/meta`, {
          context: this.buildContext(options),
        })
        .pipe(shareReplay(1));
    }
    return this.metaCache$;
  }

  clearMetaCache(): void {
    this.metaCache$ = null;
  }

  getFilterMeta(options?: CrudRequestOptions): Observable<SearchFilterConfigDto> {
    return this.http.get<SearchFilterConfigDto>(`${this.baseUrl}/meta/filters`, {
      context: this.buildContext(options),
    });
  }

  findAll(
    state: Partial<CrudQueryState> = {},
    options?: CrudRequestOptions,
  ): Observable<PageResult<E>> {
    let params = new HttpParams();

    if (state.page !== undefined) {
      params = params.set('page', String(state.page));
    }
    if (state.limit !== undefined) {
      params = params.set('limit', String(state.limit));
    }
    if (state.sorts && state.sorts.length > 0) {
      const sortString = state.sorts
        .map((s) => `${s.field}:${s.direction}`)
        .join(',');
      params = params.set('sort', sortString);
    }
    if (state.filters && state.filters.length > 0) {
      for (const filter of state.filters) {
        if (
          filter.value === undefined ||
          filter.value === null ||
          filter.value === ''
        ) {
          continue;
        }
        const key = `${filter.field}__${filter.operator}`;
        const serializedValue = Array.isArray(filter.value)
          ? filter.value.map((v) => String(v)).join(',')
          : String(filter.value);
        if (serializedValue.trim() !== '') {
          params = params.set(key, serializedValue);
        }
      }
    }

    return this.http.get<PageResult<E>>(this.baseUrl, {
      params,
      context: this.buildContext(options),
    });
  }

  findOne(id: string, options?: CrudRequestOptions): Observable<E> {
    return this.http.get<E>(`${this.baseUrl}/${id}`, {
      context: this.buildContext(options),
    });
  }

  create(dto: C, options?: CrudRequestOptions): Observable<E> {
    return this.http.post<E>(this.baseUrl, dto, {
      context: this.buildContext(options),
    });
  }

  update(id: string, dto: U, options?: CrudRequestOptions): Observable<E> {
    return this.http.patch<E>(`${this.baseUrl}/${id}`, dto, {
      context: this.buildContext(options),
    });
  }

  remove(
    id: string,
    version?: number,
    options?: CrudRequestOptions,
  ): Observable<void> {
    let params = new HttpParams();
    if (version !== undefined && version !== null) {
      params = params.set('version', String(version));
    }
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      params,
      context: this.buildContext(options),
    });
  }
}
