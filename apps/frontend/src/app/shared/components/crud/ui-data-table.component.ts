import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { BadgeComponent } from '../ui/badge.component';
import { ButtonComponent } from '../ui/button.component';
import {
  CrudTableDataSource,
  TableColumnDef,
  TableRowAction,
} from './crud-table-data-source';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

@Component({
  selector: 'ui-data-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent],
  templateUrl: './ui-data-table.component.html',
  styleUrl: './ui-data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiDataTableComponent<
  E extends { id: string; version?: number } = { id: string; version?: number },
> {
  private readonly authService = inject(AuthService);

  readonly dataSource = input.required<CrudTableDataSource<E>>();
  readonly emptyTitle = input<string>('Nenhum registro encontrado');
  readonly emptyDescription = input<string>(
    'Tente ajustar os filtros de busca ou adicione um novo registro.',
  );

  readonly hasPermittedActions = computed(() => {
    const actions = this.dataSource().actions();
    return actions.some(
      (action) =>
        !action.permission || this.authService.hasRole(action.permission),
    );
  });

  isColumnSortable(col: TableColumnDef<E>): boolean {
    if (!col.sortable) {
      return false;
    }
    if (col.requiredRole && !this.authService.hasRole(col.requiredRole)) {
      return false;
    }
    return true;
  }

  onHeaderClick(col: TableColumnDef<E>, event: MouseEvent): void {
    if (!this.isColumnSortable(col)) {
      return;
    }
    const sortField = col.sortField || col.key;
    this.dataSource().toggleSort(sortField, event.shiftKey);
  }

  getSortInfo(col: TableColumnDef<E>): {
    direction: 'ASC' | 'DESC' | null;
    priority: number | null;
  } {
    const sortField = col.sortField || col.key;
    const sorts = this.dataSource().sorts();
    const idx = sorts.findIndex((s) => s.field === sortField);
    if (idx === -1) {
      return { direction: null, priority: null };
    }
    return {
      direction: sorts[idx].direction,
      priority: idx + 1,
    };
  }

  getRawCellValue(row: E, col: TableColumnDef<E>): unknown {
    const record = row as Record<string, unknown>;
    return record[col.key];
  }

  getBooleanValue(row: E, col: TableColumnDef<E>): boolean {
    return Boolean(this.getRawCellValue(row, col));
  }

  isMaskedCell(row: E, col: TableColumnDef<E>): boolean {
    if (col.requiredRole && !this.authService.hasRole(col.requiredRole)) {
      return true;
    }
    const val = this.getRawCellValue(row, col);
    if (col.maskedSentinel !== undefined && val === col.maskedSentinel) {
      return true;
    }
    return false;
  }

  formatCurrencyCents(row: E, col: TableColumnDef<E>): string {
    const val = this.getRawCellValue(row, col);
    if (val === null || val === undefined || val === '') {
      return '—';
    }
    const numeric = Number(val);
    if (Number.isNaN(numeric)) {
      return '—';
    }
    return brlFormatter.format(numeric / 100);
  }

  formatDate(row: E, col: TableColumnDef<E>, includeTime: boolean): string {
    const val = this.getRawCellValue(row, col);
    if (!val) {
      return '—';
    }
    const date = val instanceof Date ? val : new Date(String(val));
    if (Number.isNaN(date.getTime())) {
      return String(val);
    }
    return includeTime
      ? date.toLocaleString('pt-BR')
      : date.toLocaleDateString('pt-BR');
  }

  getBadges(
    row: E,
    col: TableColumnDef<E>,
  ): {
    label: string;
    variant?:
      | 'info'
      | 'secondary'
      | 'default'
      | 'success'
      | 'warning'
      | 'destructive'
      | 'outline';
  }[] {
    if (col.badgeExtractor) {
      return col.badgeExtractor(row);
    }
    const val = this.getRawCellValue(row, col);
    if (Array.isArray(val)) {
      return val.map((item) => ({
        label: String(item),
        variant: 'info' as const,
      }));
    }
    return [];
  }

  formatTextCell(row: E, col: TableColumnDef<E>): string {
    if (col.formatter) {
      return col.formatter(row);
    }
    const val = this.getRawCellValue(row, col);
    if (val === null || val === undefined || val === '') {
      return '—';
    }
    return String(val);
  }

  getVisibleActionsForRow(row: E): TableRowAction<E>[] {
    return this.dataSource()
      .actions()
      .filter((action) => {
        if (
          action.permission &&
          !this.authService.hasRole(action.permission)
        ) {
          return false;
        }
        if (action.visible && !action.visible(row)) {
          return false;
        }
        return true;
      });
  }

  isActionDisabled(action: TableRowAction<E>, row: E): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getActionLabel(action: TableRowAction<E>, row: E): string {
    return typeof action.label === 'function'
      ? action.label(row)
      : action.label;
  }
}
