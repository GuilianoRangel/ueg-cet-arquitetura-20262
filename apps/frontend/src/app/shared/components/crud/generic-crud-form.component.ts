import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  CrudFormFieldSchema,
  CrudFormSchemaDto,
  FilterOptionItem,
} from '@repo/utils';
import { environment } from '../../../../environments/environment';
import { FormErrorHandlerService } from '../../../core/errors/form-error-handler.service';
import { withSkipGlobalLoading } from '../../../core/loading/loading.service';
import { ButtonComponent } from '../ui/button.component';
import { InputComponent } from '../ui/input.component';
import { UiRichTextEditorComponent } from '../ui/rich-text-editor.component';

export interface FormOptionItem extends FilterOptionItem {
  inactive?: boolean;
  removed?: boolean;
}

interface FieldOptionsState {
  items: FormOptionItem[];
  loaded: boolean;
  complete: boolean;
}

@Component({
  selector: 'app-generic-crud-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    UiRichTextEditorComponent,
  ],
  templateUrl: './generic-crud-form.component.html',
  styleUrl: './generic-crud-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCrudFormComponent {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly http = inject(HttpClient);
  private readonly errorHandler = inject(FormErrorHandlerService);

  readonly schema = input.required<CrudFormSchemaDto>();
  readonly initialData = input<Record<string, unknown> | null>(null);
  readonly submitting = input<boolean>(false);

  readonly formSubmit = output<Record<string, unknown>>();
  readonly formCancel = output<void>();

  form: FormGroup = new FormGroup({});
  readonly bannerError = signal<string | null>(null);
  private readonly dynamicOptionsMeta = signal<
    Record<string, FieldOptionsState>
  >({});
  private initialSelectedByField: Record<string, Set<unknown>> = {};
  private relationFallbackByField: Record<string, FormOptionItem[]> = {};
  private readonly formStateTick = signal<number>(0);

  readonly orderedFields = computed(() => {
    const currentSchema = this.schema();
    if (!currentSchema?.fields) {
      return [];
    }
    return [...currentSchema.fields].sort((a, b) => a.order - b.order);
  });

  constructor() {
    effect(() => {
      const currentSchema = this.schema();
      const data = this.initialData();
      if (currentSchema) {
        untracked(() => {
          this.rebuildForm(currentSchema, data);
        });
      }
    });
  }

  private rebuildForm(
    schema: CrudFormSchemaDto,
    initialData: Record<string, unknown> | null,
  ): void {
    this.bannerError.set(null);
    this.dynamicOptionsMeta.set({});
    this.initialSelectedByField = {};
    this.relationFallbackByField = {};

    const groupControls: Record<string, FormControl<unknown>> = {};
    const sorted = [...schema.fields].sort((a, b) => a.order - b.order);

    for (const field of sorted) {
      const initialVal = this.resolveInitialValue(field, initialData);
      this.recordInitialSelection(field.name, initialVal);
      if (schema.mode === 'update' && initialData) {
        this.recordRelationFallbackOptions(field, initialData);
      }

      const validators = this.buildValidators(field);
      if (field.inputType === 'select' || field.inputType === 'multiselect') {
        validators.push(this.buildInactiveOptionValidator(field));
      }
      const isDisabled = Boolean(field.readOnly || field.masked);

      const ctrl = new FormControl<unknown>(
        { value: initialVal, disabled: isDisabled },
        validators,
      );

      ctrl.events.subscribe(() => {
        this.formStateTick.update((n) => n + 1);
      });

      groupControls[field.name] = ctrl;

      if (field.optionsEndpoint) {
        this.loadOptionsForField(field);
      }
    }

    this.form = new FormGroup(groupControls);
    this.formStateTick.update((n) => n + 1);
  }

  private resolveInitialValue(
    field: CrudFormFieldSchema,
    initialData: Record<string, unknown> | null,
  ): unknown {
    if (initialData) {
      if (field.entityRelationProperty) {
        const relList = initialData[field.entityRelationProperty];
        if (Array.isArray(relList)) {
          const valKey = field.entityRelationValueKey || 'id';
          return relList.map((item) => {
            if (item && typeof item === 'object') {
              return (item as Record<string, unknown>)[valKey];
            }
            return item;
          });
        }
      }

      const raw = initialData[field.name];
      if (field.inputType === 'currency' && !field.masked) {
        if (typeof raw === 'number') {
          return raw / 100;
        }
        return null;
      }

      if (raw !== undefined) {
        return raw;
      }
    }

    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    if (field.inputType === 'multiselect') {
      return [];
    }
    if (field.inputType === 'boolean') {
      return false;
    }
    return '';
  }

  private buildValidators(field: CrudFormFieldSchema): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (field.required) {
      validators.push(Validators.required);
    }

    for (const rule of field.validations ?? []) {
      switch (rule.type) {
        case 'required':
          if (!validators.includes(Validators.required)) {
            validators.push(Validators.required);
          }
          break;
        case 'minLength':
          if (typeof rule.value === 'number') {
            validators.push(Validators.minLength(rule.value));
          }
          break;
        case 'maxLength':
          if (typeof rule.value === 'number') {
            validators.push(Validators.maxLength(rule.value));
          }
          break;
        case 'min':
          if (typeof rule.value === 'number') {
            validators.push(Validators.min(rule.value));
          }
          break;
        case 'max':
          if (typeof rule.value === 'number') {
            validators.push(Validators.max(rule.value));
          }
          break;
        case 'email':
          validators.push(Validators.email);
          break;
      }
    }

    return validators;
  }

  private loadOptionsForField(field: CrudFormFieldSchema): void {
    if (!field.optionsEndpoint) {
      return;
    }
    const endpoint = field.optionsEndpoint.startsWith('/')
      ? field.optionsEndpoint
      : `/${field.optionsEndpoint}`;
    const url = `${environment.apiUrl}${endpoint}`;
    const params = new HttpParams().set('limit', '1000');

    this.http
      .get<unknown>(url, { params, context: withSkipGlobalLoading() })
      .subscribe({
        next: (res) => {
          const { items, complete } = this.extractOptions(
            res,
            field.optionsValueKey || 'id',
            field.optionsLabelKey || 'nome',
            field,
          );
          this.dynamicOptionsMeta.update((prev) => ({
            ...prev,
            [field.name]: { items, loaded: true, complete },
          }));
          this.form
            .get(field.name)
            ?.updateValueAndValidity({ emitEvent: false });
          this.formStateTick.update((n) => n + 1);
        },
        error: () => {
          // Keep empty on error
        },
      });
  }

  private extractOptions(
    raw: unknown,
    valueKey: string,
    labelKey: string,
    field: CrudFormFieldSchema,
  ): { items: FormOptionItem[]; complete: boolean } {
    let list: unknown[] = [];
    let complete = true;
    if (Array.isArray(raw)) {
      list = raw;
    } else if (
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { items?: unknown[] }).items)
    ) {
      const paginated = raw as { items: unknown[]; total?: number };
      list = paginated.items;
      if (typeof paginated.total === 'number') {
        complete = paginated.total <= list.length;
      }
    }

    const statusMeta = field.optionsStatusField;
    const items = list.map((item): FormOptionItem => {
      if (typeof item === 'string' || typeof item === 'number') {
        return { label: String(item), value: item };
      }
      const obj = item as Record<string, unknown>;
      const val = obj[valueKey] ?? obj['value'] ?? obj['id'] ?? '';
      const lbl = obj[labelKey] ?? obj['label'] ?? obj['nome'] ?? val;
      const isInactive =
        statusMeta !== undefined &&
        statusMeta.inactiveValues.some((v) => v === obj[statusMeta.field]);

      return isInactive
        ? {
            label: String(lbl),
            value: val as string | number | boolean,
            inactive: true,
          }
        : {
            label: String(lbl),
            value: val as string | number | boolean,
          };
    });

    return { items, complete };
  }

  getFieldOptions(field: CrudFormFieldSchema): FormOptionItem[] {
    this.formStateTick();
    const merged = this.getMergedOptionsForField(field);
    const isUpdateMode = this.schema()?.mode === 'update';

    return merged.filter((opt) => {
      if (!opt.inactive && !opt.removed) {
        return true;
      }
      if (!isUpdateMode) {
        return false;
      }
      return (
        this.isOptionCurrentlySelected(field.name, opt.value) ||
        this.wasOptionInitiallySelected(field.name, opt.value)
      );
    });
  }

  getInactiveLabel(field: CrudFormFieldSchema): string {
    return field.optionsStatusField?.inactiveLabel || 'Inativo';
  }

  isOptionDisabled(fieldName: string, opt: FormOptionItem): boolean {
    if (this.isControlDisabled(fieldName)) {
      return true;
    }
    if (opt.inactive || opt.removed) {
      return !this.isMultiSelectOptionChecked(fieldName, opt.value);
    }
    return false;
  }

  private recordInitialSelection(fieldName: string, initialVal: unknown): void {
    const selected = new Set<unknown>();
    if (Array.isArray(initialVal)) {
      for (const v of initialVal) {
        if (v !== null && v !== undefined && v !== '') {
          selected.add(v);
        }
      }
    } else if (
      initialVal !== null &&
      initialVal !== undefined &&
      initialVal !== ''
    ) {
      selected.add(initialVal);
    }
    this.initialSelectedByField[fieldName] = selected;
  }

  private recordRelationFallbackOptions(
    field: CrudFormFieldSchema,
    initialData: Record<string, unknown>,
  ): void {
    if (!field.entityRelationProperty) {
      return;
    }
    const rawRel = initialData[field.entityRelationProperty];
    const itemsList = Array.isArray(rawRel)
      ? rawRel
      : rawRel && typeof rawRel === 'object'
        ? [rawRel]
        : [];
    if (itemsList.length === 0) {
      return;
    }

    const valueKey =
      field.entityRelationValueKey || field.optionsValueKey || 'id';
    const labelKey = field.optionsLabelKey || 'nome';
    const statusMeta = field.optionsStatusField;

    const fallbacks: FormOptionItem[] = [];
    for (const item of itemsList) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const obj = item as Record<string, unknown>;
      const val = obj[valueKey] ?? obj['id'];
      if (val === undefined || val === null) {
        continue;
      }
      const lbl = obj[labelKey] ?? obj['nome'] ?? obj['label'] ?? val;
      const isInactive =
        statusMeta !== undefined &&
        statusMeta.inactiveValues.some((v) => v === obj[statusMeta.field]);
      fallbacks.push(
        isInactive
          ? {
              label: String(lbl),
              value: val as string | number | boolean,
              inactive: true,
            }
          : {
              label: String(lbl),
              value: val as string | number | boolean,
            },
      );
    }
    this.relationFallbackByField[field.name] = fallbacks;
  }

  private getMergedOptionsForField(
    field: CrudFormFieldSchema,
  ): FormOptionItem[] {
    if (field.options && field.options.length > 0) {
      return field.options;
    }

    const state = this.dynamicOptionsMeta()[field.name];
    const baseItems = state?.items ?? [];
    const fallbacks = this.relationFallbackByField[field.name] ?? [];

    const byValue = new Map<unknown, FormOptionItem>();
    for (const item of baseItems) {
      byValue.set(item.value, item);
    }
    for (const fb of fallbacks) {
      if (!byValue.has(fb.value)) {
        byValue.set(fb.value, fb);
      }
    }

    if (
      this.schema()?.mode === 'update' &&
      state?.loaded &&
      state.complete &&
      field.optionsEndpoint
    ) {
      const initialSet =
        this.initialSelectedByField[field.name] ?? new Set<unknown>();
      for (const initVal of initialSet) {
        if (!byValue.has(initVal)) {
          byValue.set(initVal, {
            label: `Opção removida (${String(initVal).slice(0, 8)}...)`,
            value: initVal as string | number | boolean,
            inactive: true,
            removed: true,
          });
        }
      }
    }

    return Array.from(byValue.values());
  }

  private isOptionCurrentlySelected(
    fieldName: string,
    optionValue: string | number | boolean,
  ): boolean {
    const val = this.form.get(fieldName)?.value;
    if (Array.isArray(val)) {
      return val.includes(optionValue);
    }
    return val === optionValue;
  }

  private wasOptionInitiallySelected(
    fieldName: string,
    optionValue: string | number | boolean,
  ): boolean {
    return (
      this.initialSelectedByField[fieldName]?.has(optionValue) ?? false
    );
  }

  private buildInactiveOptionValidator(
    field: CrudFormFieldSchema,
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const selectedValues = Array.isArray(value) ? value : [value];
      if (selectedValues.length === 0) {
        return null;
      }

      const merged = this.getMergedOptionsForField(field);
      const optionByValue = new Map<unknown, FormOptionItem>();
      for (const opt of merged) {
        optionByValue.set(opt.value, opt);
      }

      const invalidLabels: string[] = [];
      for (const val of selectedValues) {
        const opt = optionByValue.get(val);
        if (opt && (opt.inactive || opt.removed)) {
          invalidLabels.push(opt.label);
        }
      }

      if (invalidLabels.length === 0) {
        return null;
      }

      const message =
        invalidLabels.length === 1
          ? `Não é possível salvar com a opção inativa/removida selecionada: "${invalidLabels[0]}". Remova a seleção para continuar.`
          : `Não é possível salvar com as opções inativas/removidas selecionadas: ${invalidLabels.join(', ')}. Remova-as para continuar.`;

      return {
        inactiveOption: {
          labels: invalidLabels,
          message,
        },
      };
    };
  }

  getHtmlInputType(field: CrudFormFieldSchema): string {
    switch (field.inputType) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'number':
      case 'currency':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  isControlDisabled(fieldName: string): boolean {
    return this.form.get(fieldName)?.disabled ?? false;
  }

  isMultiSelectOptionChecked(
    fieldName: string,
    optionValue: string | number | boolean,
  ): boolean {
    const val = this.form.get(fieldName)?.value;
    if (!Array.isArray(val)) {
      return false;
    }
    return val.includes(optionValue);
  }

  onMultiSelectToggle(
    fieldName: string,
    optionValue: string | number | boolean,
    event: Event,
  ): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ctrl = this.form.get(fieldName);
    if (!ctrl) {
      return;
    }
    const current = Array.isArray(ctrl.value) ? [...ctrl.value] : [];
    const next = checked
      ? [...current, optionValue]
      : current.filter((v) => v !== optionValue);
    ctrl.setValue(next);
    ctrl.markAsTouched();
  }

  getControlErrorMessage(fieldName: string): string | null {
    // Depend on formStateTick signal for OnPush reactivity
    this.formStateTick();
    const ctrl = this.form.get(fieldName);
    if (!ctrl || !ctrl.errors) {
      return null;
    }

    if (typeof ctrl.errors['serverError'] === 'string') {
      return ctrl.errors['serverError'];
    }

    const inactiveErr = ctrl.errors['inactiveOption'] as
      | { message?: string }
      | undefined;
    if (typeof inactiveErr?.message === 'string') {
      return inactiveErr.message;
    }

    if (!ctrl.touched && !ctrl.dirty) {
      return null;
    }

    if (ctrl.errors['required']) {
      return 'Campo obrigatório';
    }
    if (ctrl.errors['email']) {
      return 'Informe um e-mail válido';
    }
    if (ctrl.errors['minlength']) {
      const reqLen = (ctrl.errors['minlength'] as { requiredLength?: number })
        .requiredLength;
      return `Mínimo de ${reqLen ?? 0} caracteres`;
    }
    if (ctrl.errors['maxlength']) {
      const reqLen = (ctrl.errors['maxlength'] as { requiredLength?: number })
        .requiredLength;
      return `Máximo de ${reqLen ?? 0} caracteres`;
    }
    if (ctrl.errors['min']) {
      const minVal = (ctrl.errors['min'] as { min?: number }).min;
      return `Valor mínimo permitido: ${minVal ?? 0}`;
    }
    if (ctrl.errors['max']) {
      const maxVal = (ctrl.errors['max'] as { max?: number }).max;
      return `Valor máximo permitido: ${maxVal ?? 0}`;
    }

    return 'Valor inválido';
  }

  applyBackendError(err: unknown): void {
    const outcome = this.errorHandler.applyToForm(this.form, err);
    this.bannerError.set(outcome.bannerMessage);
    this.formStateTick.update((n) => n + 1);
    if (outcome.level === 'field') {
      this.scrollToFirstInvalidField();
    }
  }

  onSubmit(): void {
    this.bannerError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formStateTick.update((n) => n + 1);
      this.scrollToFirstInvalidField();
      return;
    }

    const rawValues = this.form.getRawValue() as Record<string, unknown>;
    const payload: Record<string, unknown> = {};

    for (const field of this.orderedFields()) {
      if (field.omitOnSubmit || field.readOnly || field.masked) {
        continue;
      }

      const val = rawValues[field.name];
      if (field.inputType === 'currency') {
        if (val === '' || val === null || val === undefined) {
          payload[field.name] = null;
        } else {
          const num = Number(val);
          payload[field.name] = Number.isNaN(num) ? null : Math.round(num * 100);
        }
      } else if (field.inputType === 'number') {
        if (val === '' || val === null || val === undefined) {
          payload[field.name] = null;
        } else {
          payload[field.name] = Number(val);
        }
      } else {
        payload[field.name] = val;
      }
    }

    this.formSubmit.emit(payload);
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  private scrollToFirstInvalidField(): void {
    const firstInvalid = this.orderedFields().find((field) => {
      if (field.hidden || field.inputType === 'hidden') {
        return false;
      }
      return Boolean(this.form.get(field.name)?.invalid);
    });

    if (!firstInvalid) {
      return;
    }

    const host = this.elementRef.nativeElement;
    const fieldEl = host.querySelector<HTMLElement>(
      `[data-testid="form-field-${firstInvalid.name}"]`,
    );
    if (!fieldEl) {
      return;
    }

    fieldEl.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const focusTarget = fieldEl.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [contenteditable="true"]',
    );
    focusTarget?.focus?.({ preventScroll: true });
  }
}

