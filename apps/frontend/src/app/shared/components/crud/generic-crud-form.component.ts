import {
  ChangeDetectionStrategy,
  Component,
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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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

@Component({
  selector: 'app-generic-crud-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './generic-crud-form.component.html',
  styleUrl: './generic-crud-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCrudFormComponent {
  private readonly http = inject(HttpClient);
  private readonly errorHandler = inject(FormErrorHandlerService);

  readonly schema = input.required<CrudFormSchemaDto>();
  readonly initialData = input<Record<string, unknown> | null>(null);
  readonly submitting = input<boolean>(false);

  readonly formSubmit = output<Record<string, unknown>>();
  readonly formCancel = output<void>();

  form: FormGroup = new FormGroup({});
  readonly bannerError = signal<string | null>(null);
  readonly dynamicOptions = signal<Record<string, FilterOptionItem[]>>({});
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
    const groupControls: Record<string, FormControl<unknown>> = {};
    const sorted = [...schema.fields].sort((a, b) => a.order - b.order);

    for (const field of sorted) {
      const initialVal = this.resolveInitialValue(field, initialData);
      const validators = this.buildValidators(field);
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
          const items = this.extractOptions(
            res,
            field.optionsValueKey || 'id',
            field.optionsLabelKey || 'nome',
          );
          this.dynamicOptions.update((prev) => ({
            ...prev,
            [field.name]: items,
          }));
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
  ): FilterOptionItem[] {
    let list: unknown[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (
      raw &&
      typeof raw === 'object' &&
      Array.isArray((raw as { items?: unknown[] }).items)
    ) {
      list = (raw as { items: unknown[] }).items;
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

  getFieldOptions(field: CrudFormFieldSchema): FilterOptionItem[] {
    if (field.options && field.options.length > 0) {
      return field.options;
    }
    return this.dynamicOptions()[field.name] ?? [];
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
  }

  onSubmit(): void {
    this.bannerError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formStateTick.update((n) => n + 1);
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
}

