import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  FilterOperator,
  FilterOptionItem,
  SearchFilterConfigDto,
  SmartFilterFieldMeta,
} from '@repo/utils';
import { environment } from '../../../../environments/environment';
import { CrudFilterItem } from '../../../core/crud/generic-crud.service';
import { withSkipGlobalLoading } from '../../../core/loading/loading.service';
import { BadgeComponent } from '../ui/badge.component';
import { ButtonComponent } from '../ui/button.component';

interface AdvancedFilterRow {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  valueStart: string;
  valueEnd: string;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'Igual a',
  ne: 'Diferente de',
  like: 'Contém',
  gt: 'Maior que',
  gte: 'Maior ou igual a',
  lt: 'Menor que',
  lte: 'Menor ou igual a',
  between: 'Entre (intervalo)',
  in: 'Na lista',
};

@Component({
  selector: 'app-smart-filter-bar',
  standalone: true,
  imports: [ButtonComponent, BadgeComponent],
  templateUrl: './smart-filter-bar.component.html',
  styleUrl: './smart-filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartFilterBarComponent {
  private readonly http = inject(HttpClient);
  protected readonly String = String;

  readonly config = input.required<SearchFilterConfigDto | null>();
  readonly filterChange = output<CrudFilterItem[]>();

  readonly quickValues = signal<Record<string, string>>({});
  readonly masterValues = signal<Record<string, string>>({});
  readonly dynamicOptions = signal<Record<string, FilterOptionItem[]>>({});
  readonly masterOptions = signal<Record<string, FilterOptionItem[]>>({});
  readonly childOptions = signal<Record<string, FilterOptionItem[]>>({});
  readonly advancedOpen = signal<boolean>(false);
  readonly advancedRows = signal<AdvancedFilterRow[]>([]);

  readonly quickFields = computed(() => {
    const cfg = this.config();
    if (!cfg) {
      return [];
    }
    return cfg.fields.filter((f) => f.quickFilter);
  });

  readonly activeAdvancedCount = computed(() => {
    return this.advancedRows().filter((r) =>
      r.operator === 'between'
        ? r.valueStart.trim() !== '' && r.valueEnd.trim() !== ''
        : r.value.trim() !== '',
    ).length;
  });

  constructor() {
    effect(() => {
      const cfg = this.config();
      if (!cfg) {
        return;
      }
      for (const field of cfg.fields) {
        if (field.optionsEndpoint) {
          this.loadDynamicOptionsForField(field);
        }
        if (field.controlType === 'master-detail' && field.masterDetail) {
          this.loadMasterOptionsForField(field);
        }
      }
    });
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${environment.apiUrl}${normalized}`;
  }

  private extractOptionItems(
    rawResponse: unknown,
    valueKey: string = 'id',
    labelKey: string = 'nome',
  ): FilterOptionItem[] {
    let list: unknown[] = [];
    if (Array.isArray(rawResponse)) {
      list = rawResponse;
    } else if (
      rawResponse &&
      typeof rawResponse === 'object' &&
      Array.isArray((rawResponse as { items?: unknown[] }).items)
    ) {
      list = (rawResponse as { items: unknown[] }).items;
    }

    return list.map((item) => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { label: String(item), value: item };
      }
      const obj = item as Record<string, unknown>;
      const val = obj[valueKey] ?? obj['value'] ?? obj['id'] ?? '';
      const lbl = obj[labelKey] ?? obj['label'] ?? obj['nome'] ?? val;
      return {
        label: String(lbl),
        value: val as string | number | boolean,
      };
    });
  }

  private loadDynamicOptionsForField(field: SmartFilterFieldMeta): void {
    if (!field.optionsEndpoint) {
      return;
    }
    const url = this.resolveUrl(field.optionsEndpoint);
    const params = new HttpParams().set('limit', '1000');
    this.http
      .get<unknown>(url, { params, context: withSkipGlobalLoading() })
      .subscribe({
        next: (res) => {
          const items = this.extractOptionItems(
            res,
            field.optionsValueKey || 'id',
            field.optionsLabelKey || 'nome',
          );
          this.dynamicOptions.update((prev) => ({
            ...prev,
            [field.field]: items,
          }));
        },
        error: () => {
          // Keep empty on error
        },
      });
  }

  private loadMasterOptionsForField(field: SmartFilterFieldMeta): void {
    const md = field.masterDetail;
    if (!md) {
      return;
    }
    const url = this.resolveUrl(md.parentEndpoint);
    const params = new HttpParams().set('limit', '1000');
    this.http
      .get<unknown>(url, { params, context: withSkipGlobalLoading() })
      .subscribe({
        next: (res) => {
          const items = this.extractOptionItems(
            res,
            md.parentValueKey || 'id',
            md.parentLabelKey || 'nome',
          );
          this.masterOptions.update((prev) => ({
            ...prev,
            [field.field]: items,
          }));
        },
        error: () => {
          // Keep empty on error
        },
      });
  }

  getFieldOptions(field: SmartFilterFieldMeta): FilterOptionItem[] {
    if (field.options && field.options.length > 0) {
      return field.options;
    }
    return this.dynamicOptions()[field.field] ?? [];
  }

  getMasterOptions(fieldName: string): FilterOptionItem[] {
    return this.masterOptions()[fieldName] ?? [];
  }

  getChildOptions(fieldName: string): FilterOptionItem[] {
    return this.childOptions()[fieldName] ?? [];
  }

  getQuickValue(fieldName: string): string {
    return this.quickValues()[fieldName] ?? '';
  }

  getMasterValue(fieldName: string): string {
    return this.masterValues()[fieldName] ?? '';
  }

  onQuickInputChange(fieldName: string, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.quickValues.update((prev) => ({ ...prev, [fieldName]: val }));
  }

  onQuickSelectChange(fieldName: string, event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.quickValues.update((prev) => ({ ...prev, [fieldName]: val }));
  }

  onMasterSelectChange(field: SmartFilterFieldMeta, event: Event): void {
    const parentVal = (event.target as HTMLSelectElement).value;
    this.masterValues.update((prev) => ({
      ...prev,
      [field.field]: parentVal,
    }));
    // Reset detail value when master changes
    this.quickValues.update((prev) => ({
      ...prev,
      [field.field]: '',
    }));

    const md = field.masterDetail;
    if (!md || !parentVal) {
      this.childOptions.update((prev) => ({
        ...prev,
        [field.field]: [],
      }));
      return;
    }

    const url = this.resolveUrl(md.childEndpoint);
    const params = new HttpParams()
      .set(md.parentParamName, parentVal)
      .set('limit', '1000');

    this.http
      .get<unknown>(url, { params, context: withSkipGlobalLoading() })
      .subscribe({
        next: (res) => {
          const items = this.extractOptionItems(
            res,
            md.childValueKey || 'id',
            md.childLabelKey || 'nome',
          );
          this.childOptions.update((prev) => ({
            ...prev,
            [field.field]: items,
          }));
        },
        error: () => {
          this.childOptions.update((prev) => ({
            ...prev,
            [field.field]: [],
          }));
        },
      });
  }

  toggleAdvancedPanel(): void {
    this.advancedOpen.update((v) => !v);
  }

  addAdvancedRow(): void {
    const cfg = this.config();
    if (!cfg || cfg.fields.length === 0) {
      return;
    }
    const firstField = cfg.fields[0];
    const row: AdvancedFilterRow = {
      id: Math.random().toString(36).substring(2, 9),
      field: firstField.field,
      operator: firstField.defaultOperator || firstField.operators[0] || 'eq',
      value: '',
      valueStart: '',
      valueEnd: '',
    };
    this.advancedRows.update((rows) => [...rows, row]);
  }

  removeAdvancedRow(index: number): void {
    this.advancedRows.update((rows) => rows.filter((_, i) => i !== index));
  }

  getFieldMeta(fieldName: string): SmartFilterFieldMeta | undefined {
    return this.config()?.fields.find((f) => f.field === fieldName);
  }

  getOperatorLabel(op: FilterOperator): string {
    return OPERATOR_LABELS[op] ?? op;
  }

  getAdvancedInputType(field: SmartFilterFieldMeta | undefined): string {
    if (!field) {
      return 'text';
    }
    if (field.controlType === 'number' || field.controlType === 'currency') {
      return 'number';
    }
    if (field.controlType === 'date') {
      return 'date';
    }
    return 'text';
  }

  onAdvancedFieldChange(index: number, event: Event): void {
    const fieldName = (event.target as HTMLSelectElement).value;
    const meta = this.getFieldMeta(fieldName);
    const defaultOp = meta?.defaultOperator || meta?.operators[0] || 'eq';
    this.advancedRows.update((rows) => {
      const next = [...rows];
      next[index] = {
        ...next[index],
        field: fieldName,
        operator: defaultOp,
        value: '',
        valueStart: '',
        valueEnd: '',
      };
      return next;
    });
  }

  onAdvancedOperatorChange(index: number, event: Event): void {
    const op = (event.target as HTMLSelectElement).value as FilterOperator;
    this.advancedRows.update((rows) => {
      const next = [...rows];
      next[index] = {
        ...next[index],
        operator: op,
      };
      return next;
    });
  }

  onAdvancedValueChange(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.advancedRows.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], value: val };
      return next;
    });
  }

  onAdvancedValueStartChange(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.advancedRows.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], valueStart: val };
      return next;
    });
  }

  onAdvancedValueEndChange(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.advancedRows.update((rows) => {
      const next = [...rows];
      next[index] = { ...next[index], valueEnd: val };
      return next;
    });
  }

  private coerceValue(
    raw: string,
    field: SmartFilterFieldMeta | undefined,
  ): unknown {
    if (!field) {
      return raw;
    }
    if (field.type === 'boolean' || field.controlType === 'boolean') {
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return raw;
    }
    if (field.controlType === 'currency') {
      const num = Number(raw);
      return Number.isNaN(num) ? raw : Math.round(num * 100);
    }
    if (field.type === 'number') {
      const num = Number(raw);
      return Number.isNaN(num) ? raw : num;
    }
    return raw;
  }

  onSearch(): void {
    const cfg = this.config();
    if (!cfg) {
      this.filterChange.emit([]);
      return;
    }

    const result: CrudFilterItem[] = [];
    const quickVals = this.quickValues();
    const masterVals = this.masterValues();

    for (const field of this.quickFields()) {
      if (field.controlType === 'master-detail' && field.masterDetail) {
        const detailVal = quickVals[field.field]?.trim() ?? '';
        const masterVal = masterVals[field.field]?.trim() ?? '';
        if (detailVal !== '') {
          result.push({
            field: field.field,
            operator: field.defaultOperator || 'eq',
            value: this.coerceValue(detailVal, field),
          });
        } else if (masterVal !== '') {
          result.push({
            field: field.masterDetail.parentField,
            operator: 'eq',
            value: masterVal,
          });
        }
        continue;
      }

      const raw = quickVals[field.field]?.trim() ?? '';
      if (raw !== '') {
        result.push({
          field: field.field,
          operator: field.defaultOperator || 'eq',
          value: this.coerceValue(raw, field),
        });
      }
    }

    for (const row of this.advancedRows()) {
      const meta = this.getFieldMeta(row.field);
      if (row.operator === 'between') {
        const start = row.valueStart.trim();
        const end = row.valueEnd.trim();
        if (start !== '' && end !== '') {
          result.push({
            field: row.field,
            operator: 'between',
            value: [
              this.coerceValue(start, meta),
              this.coerceValue(end, meta),
            ],
          });
        }
      } else if (row.operator === 'in') {
        const raw = row.value.trim();
        if (raw !== '') {
          const items = raw
            .split(',')
            .map((part) => this.coerceValue(part.trim(), meta));
          result.push({
            field: row.field,
            operator: 'in',
            value: items,
          });
        }
      } else {
        const raw = row.value.trim();
        if (raw !== '') {
          result.push({
            field: row.field,
            operator: row.operator,
            value: this.coerceValue(raw, meta),
          });
        }
      }
    }

    this.filterChange.emit(result);
  }

  onClear(): void {
    this.quickValues.set({});
    this.masterValues.set({});
    this.childOptions.set({});
    this.advancedRows.set([]);
    this.filterChange.emit([]);
  }
}
