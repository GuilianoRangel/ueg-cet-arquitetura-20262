import { signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  CrudFilterItem,
  CrudSortItem,
  GenericCrudService,
} from '../../../core/crud/generic-crud.service';

export interface TableColumnDef<E> {
  /** Chave da propriedade na entidade (suporta caminhos ou chave virtual) */
  key: (keyof E & string) | string;
  /** Título exibido no cabeçalho */
  label: string;
  /** Indica se a coluna permite ordenação */
  sortable?: boolean;
  /** Campo enviado no parâmetro sort (padrão = key) */
  sortField?: string;
  /** Tipo de renderização da célula */
  type?:
    | 'text'
    | 'boolean'
    | 'currency-cents'
    | 'date'
    | 'datetime'
    | 'badges'
    | 'custom';
  /** Alinhamento da coluna */
  align?: 'left' | 'center' | 'right';
  /** Role exigida para exibir a coluna de forma desmascarada */
  requiredRole?: string;
  /** Valor de máscara retornado pelo backend (ex: 99999) */
  maskedSentinel?: unknown;
  /** Configuração para tipo boolean */
  booleanLabels?: {
    trueLabel: string;
    falseLabel: string;
    trueVariant?: 'success' | 'info' | 'default';
    falseVariant?: 'warning' | 'secondary' | 'destructive' | 'outline';
  };
  /** Extrator de itens para tipo 'badges' (ex: user.perfis.map(p => p.nome)) */
  badgeExtractor?: (
    row: E,
  ) => {
    label: string;
    variant?:
      | 'info'
      | 'secondary'
      | 'default'
      | 'success'
      | 'warning'
      | 'destructive'
      | 'outline';
  }[];
  /** Formatador customizado de texto */
  formatter?: (row: E) => string;
}

export interface TableRowAction<E> {
  id: string;
  label: string | ((row: E) => string);
  icon?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  /** Role necessária para exibir a ação */
  permission?: string;
  /** Condição para exibir o botão na linha */
  visible?: (row: E) => boolean;
  /** Condição para desabilitar o botão na linha (ex: perfil.sistema === true) */
  disabled?: (row: E) => boolean;
  disabledTooltip?: string;
  handler: (row: E) => void;
}

export interface CrudTableDataSourceOptions<
  E extends { id: string; version?: number },
> {
  service: GenericCrudService<E>;
  columns: TableColumnDef<E>[];
  actions?: TableRowAction<E>[];
  initialLimit?: number;
  pageSizeOptions?: number[];
  initialSorts?: CrudSortItem[];
}

export class CrudTableDataSource<
  E extends { id: string; version?: number } = { id: string; version?: number },
> {
  private readonly service: GenericCrudService<E>;

  readonly items = signal<E[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly limit = signal<number>(10);
  readonly pageSizeOptions = signal<number[]>([10, 25, 50, 100]);
  readonly sorts = signal<CrudSortItem[]>([]);
  readonly filters = signal<CrudFilterItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly columns = signal<TableColumnDef<E>[]>([]);
  readonly actions = signal<TableRowAction<E>[]>([]);

  constructor(options: CrudTableDataSourceOptions<E>) {
    this.service = options.service;
    this.columns.set(options.columns);
    if (options.actions) {
      this.actions.set(options.actions);
    }
    if (options.initialLimit) {
      this.limit.set(options.initialLimit);
    }
    if (options.pageSizeOptions) {
      this.pageSizeOptions.set(options.pageSizeOptions);
    }
    if (options.initialSorts) {
      this.sorts.set(options.initialSorts);
    }
  }

  toggleSort(field: string, multiSort: boolean = false): void {
    const current = this.sorts();

    if (!multiSort) {
      if (current.length === 1 && current[0].field === field) {
        if (current[0].direction === 'ASC') {
          this.sorts.set([{ field, direction: 'DESC' }]);
        } else {
          this.sorts.set([]);
        }
      } else {
        this.sorts.set([{ field, direction: 'ASC' }]);
      }
    } else {
      const idx = current.findIndex((s) => s.field === field);
      if (idx === -1) {
        this.sorts.set([...current, { field, direction: 'ASC' }]);
      } else {
        const existing = current[idx];
        if (existing.direction === 'ASC') {
          const updated = [...current];
          updated[idx] = { field, direction: 'DESC' };
          this.sorts.set(updated);
        } else {
          this.sorts.set(current.filter((_, i) => i !== idx));
        }
      }
    }

    this.page.set(1);
    this.refresh();
  }

  setPage(page: number): void {
    this.page.set(Math.max(1, page));
    this.refresh();
  }

  setPageSize(limit: number): void {
    this.limit.set(limit);
    this.page.set(1);
    this.refresh();
  }

  setFilters(filters: CrudFilterItem[]): void {
    this.filters.set(filters);
    this.page.set(1);
    this.refresh();
  }

  refresh(): void {
    this.isLoading.set(true);
    this.service
      .findAll({
        page: this.page(),
        limit: this.limit(),
        sorts: this.sorts(),
        filters: this.filters(),
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
        },
        error: () => {
          // Handled by errorInterceptor / page handler
        },
      });
  }
}
