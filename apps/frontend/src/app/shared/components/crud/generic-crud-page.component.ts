import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { CrudResourceMetaDto } from '@repo/utils';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CrudFilterItem,
  GenericCrudService,
} from '../../../core/crud/generic-crud.service';
import { FormErrorHandlerService } from '../../../core/errors/form-error-handler.service';
import { ButtonComponent } from '../ui/button.component';
import { UiDialogService } from '../ui/dialog/ui-dialog.service';
import { ToastService } from '../ui/toast.service';
import {
  CrudTableDataSource,
  TableColumnDef,
  TableRowAction,
} from './crud-table-data-source';
import {
  GenericCrudFormModalComponent,
  GenericCrudFormModalData,
} from './generic-crud-form-modal.component';
import { SmartFilterBarComponent } from './smart-filter-bar.component';
import { UiDataTableComponent } from './ui-data-table.component';
import { UiPaginatorComponent } from './ui-paginator.component';

export interface CrudPageConfig<
  E extends { id: string; version?: number } = { id: string; version?: number },
> {
  title: string;
  subtitle?: string;
  entityLabel: string;
  resource: string;
  service: GenericCrudService<E>;
  columns: TableColumnDef<E>[];
  extraRowActions?: TableRowAction<E>[];
  canEditRow?: (row: E) => boolean;
  canDeleteRow?: (row: E) => boolean;
  disabledRowTooltip?: string;
}

@Component({
  selector: 'app-generic-crud-page',
  standalone: true,
  imports: [
    ButtonComponent,
    SmartFilterBarComponent,
    UiDataTableComponent,
    UiPaginatorComponent,
  ],
  templateUrl: './generic-crud-page.component.html',
  styleUrl: './generic-crud-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCrudPageComponent<
  E extends { id: string; version?: number } = { id: string; version?: number },
> {
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(UiDialogService);
  private readonly toastService = inject(ToastService);
  private readonly errorHandler = inject(FormErrorHandlerService);

  readonly config = input.required<CrudPageConfig<E>>();
  readonly meta = signal<CrudResourceMetaDto | null>(null);
  readonly dataSource = signal<CrudTableDataSource<E>>(
    null as unknown as CrudTableDataSource<E>,
  );

  readonly paginatorDataSource = computed(
    () =>
      this.dataSource() as unknown as CrudTableDataSource<{
        id: string;
        version?: number;
      }>,
  );

  readonly canCreate = computed(() => {
    const cfg = this.config();
    return this.authService.hasRole(`${cfg.resource}:create`);
  });

  readonly createButtonLabel = computed(() => {
    const label = this.config().entityLabel;
    const isFeminine = label.endsWith('a') || label.endsWith('ão');
    return `${isFeminine ? 'Nova' : 'Novo'} ${label}`;
  });

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (cfg) {
        this.initPage(cfg);
      }
    });
  }

  private initPage(cfg: CrudPageConfig<E>): void {
    const standardActions: TableRowAction<E>[] = [
      ...(cfg.extraRowActions ?? []),
      {
        id: 'edit',
        label: 'Editar',
        variant: 'outline',
        permission: `${cfg.resource}:update`,
        disabled: cfg.canEditRow ? (row) => !cfg.canEditRow!(row) : undefined,
        disabledTooltip:
          cfg.disabledRowTooltip || 'Este registro não pode ser editado',
        handler: (row) => this.openEditModal(row),
      },
      {
        id: 'delete',
        label: 'Excluir',
        variant: 'destructive',
        permission: `${cfg.resource}:delete`,
        disabled: cfg.canDeleteRow
          ? (row) => !cfg.canDeleteRow!(row)
          : undefined,
        disabledTooltip:
          cfg.disabledRowTooltip || 'Este registro não pode ser excluído',
        handler: (row) => this.confirmDelete(row),
      },
    ];

    const ds = new CrudTableDataSource<E>({
      service: cfg.service,
      columns: cfg.columns,
      actions: standardActions,
    });

    this.dataSource.set(ds);
    ds.refresh();

    cfg.service.getMeta().subscribe({
      next: (metaDto) => {
        this.meta.set(metaDto);
      },
      error: () => {
        // Error handled by interceptor
      },
    });
  }

  refreshTable(): void {
    this.dataSource()?.refresh();
  }

  onFilterChange(filters: CrudFilterItem[]): void {
    this.dataSource().setFilters(filters);
  }

  openCreateModal(): void {
    const currentMeta = this.meta();
    const cfg = this.config();
    if (!currentMeta) {
      return;
    }

    const ref = this.dialogService.open<boolean, GenericCrudFormModalData>(
      GenericCrudFormModalComponent,
      {
        width: '540px',
        data: {
          title: this.createButtonLabel(),
          subtitle: `Preencha os dados para cadastrar ${cfg.entityLabel.toLowerCase()}.`,
          schema: currentMeta.createForm,
          initialData: null,
          submitHandler: (payload) => cfg.service.create(payload),
        },
      },
    );

    ref.closed.subscribe((saved) => {
      if (saved) {
        this.toastService.success(`${cfg.entityLabel} criado(a) com sucesso!`);
        this.refreshTable();
      }
    });
  }

  openEditModal(row: E): void {
    const currentMeta = this.meta();
    const cfg = this.config();
    if (!currentMeta) {
      return;
    }

    cfg.service.findOne(row.id).subscribe({
      next: (freshEntity) => {
        const ref = this.dialogService.open<boolean, GenericCrudFormModalData>(
          GenericCrudFormModalComponent,
          {
            width: '540px',
            data: {
              title: `Editar ${cfg.entityLabel}`,
              subtitle: `Atualize as informações do registro selecionado.`,
              schema: currentMeta.updateForm,
              initialData: freshEntity as unknown as Record<string, unknown>,
              submitHandler: (payload) => cfg.service.update(row.id, payload),
            },
          },
        );

        ref.closed.subscribe((saved) => {
          if (saved) {
            this.toastService.success(
              `${cfg.entityLabel} atualizado(a) com sucesso!`,
            );
            this.refreshTable();
          }
        });
      },
      error: (err: unknown) => {
        this.errorHandler.handleNonFormError(err);
      },
    });
  }

  confirmDelete(row: E): void {
    const cfg = this.config();
    const record = row as Record<string, unknown>;
    const displayName =
      typeof record['nome'] === 'string'
        ? `"${record['nome']}"`
        : 'este registro';

    this.dialogService
      .confirm({
        title: `Excluir ${cfg.entityLabel}`,
        message: `Tem certeza que deseja excluir ${displayName}? Esta ação não poderá ser desfeita.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        variant: 'destructive',
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        cfg.service.remove(row.id, row.version).subscribe({
          next: () => {
            this.toastService.success(
              `${cfg.entityLabel} excluído(a) com sucesso!`,
            );
            this.refreshTable();
          },
          error: (err: unknown) => {
            this.errorHandler.handleNonFormError(err);
          },
        });
      });
  }
}

