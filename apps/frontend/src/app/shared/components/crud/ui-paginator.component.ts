import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { ButtonComponent } from '../ui/button.component';
import { CrudTableDataSource } from './crud-table-data-source';

@Component({
  selector: 'ui-paginator',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './ui-paginator.component.html',
  styleUrl: './ui-paginator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiPaginatorComponent {
  readonly dataSource = input<CrudTableDataSource<{ id: string; version?: number }> | null>(null);
  readonly page = input<number>(1);
  readonly limit = input<number>(10);
  readonly total = input<number>(0);
  readonly pageSizeOptions = input<number[]>([10, 25, 50, 100]);

  readonly pageChange = output<number>();
  readonly limitChange = output<number>();

  readonly effectivePage = computed(() => {
    const ds = this.dataSource();
    return ds ? ds.page() : this.page();
  });

  readonly effectiveLimit = computed(() => {
    const ds = this.dataSource();
    return ds ? ds.limit() : this.limit();
  });

  readonly effectiveTotal = computed(() => {
    const ds = this.dataSource();
    return ds ? ds.total() : this.total();
  });

  readonly effectivePageSizeOptions = computed(() => {
    const ds = this.dataSource();
    return ds ? ds.pageSizeOptions() : this.pageSizeOptions();
  });

  readonly totalPages = computed(() => {
    const total = this.effectiveTotal();
    const limit = this.effectiveLimit();
    if (total <= 0 || limit <= 0) {
      return 1;
    }
    return Math.ceil(total / limit);
  });

  readonly startItem = computed(() => {
    const total = this.effectiveTotal();
    if (total === 0) {
      return 0;
    }
    return (this.effectivePage() - 1) * this.effectiveLimit() + 1;
  });

  readonly endItem = computed(() => {
    const total = this.effectiveTotal();
    if (total === 0) {
      return 0;
    }
    return Math.min(total, this.effectivePage() * this.effectiveLimit());
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.effectivePage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    const adjustedStart = Math.max(1, end - 4);
    for (let i = adjustedStart; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  goToPage(targetPage: number): void {
    const clamped = Math.max(1, Math.min(this.totalPages(), targetPage));
    const ds = this.dataSource();
    if (ds) {
      ds.setPage(clamped);
    }
    this.pageChange.emit(clamped);
  }

  onLimitSelect(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(value) && value > 0) {
      const ds = this.dataSource();
      if (ds) {
        ds.setPageSize(value);
      }
      this.limitChange.emit(value);
    }
  }
}
