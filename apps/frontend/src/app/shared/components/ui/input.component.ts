import {
  AfterViewInit,
  Component,
  DestroyRef,
  Injector,
  OnChanges,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NgControl,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { cn } from '../../utils/cn.util';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent
  implements ControlValueAccessor, AfterViewInit, OnChanges
{
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private ngControl: NgControl | null = null;
  private controlSub: Subscription | null = null;

  id = input<string>(`ui-input-${Math.random().toString(36).substring(2, 9)}`);
  type = input<string>('text');
  placeholder = input<string>('');
  label = input<string>('');
  error = input<string | null>(null);
  control = input<AbstractControl | null>(null);
  class = input<string>('');

  value = signal<string>('');
  disabled = signal<boolean>(false);
  private readonly controlError = signal<string | null>(null);

  readonly displayError = computed(() => this.error() || this.controlError());

  inputClasses = computed(() => {
    return cn(
      'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
      this.displayError()
        ? 'border-destructive focus-visible:ring-destructive'
        : '',
      this.class(),
    );
  });

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.controlSub?.unsubscribe();
    });
  }

  ngAfterViewInit(): void {
    try {
      this.ngControl = this.injector.get(NgControl, null, {
        self: true,
        optional: true,
      });
    } catch {
      this.ngControl = null;
    }
    this.bindControlEvents();
  }

  ngOnChanges(): void {
    this.bindControlEvents();
  }

  private getActiveControl(): AbstractControl | null {
    return this.control() ?? this.ngControl?.control ?? null;
  }

  private bindControlEvents(): void {
    this.controlSub?.unsubscribe();
    const ctrl = this.getActiveControl();
    if (!ctrl) {
      this.controlError.set(null);
      return;
    }

    this.syncControlError(ctrl);
    this.controlSub = ctrl.events.subscribe(() => {
      this.syncControlError(ctrl);
    });
  }

  private syncControlError(ctrl: AbstractControl): void {
    const errors = ctrl.errors;
    if (!errors) {
      this.controlError.set(null);
      return;
    }

    if (typeof errors['serverError'] === 'string') {
      this.controlError.set(errors['serverError']);
      return;
    }

    if (!ctrl.touched && !ctrl.dirty) {
      this.controlError.set(null);
      return;
    }

    if (errors['required']) {
      this.controlError.set('Campo obrigatório');
      return;
    }
    if (errors['email']) {
      this.controlError.set('Informe um e-mail válido');
      return;
    }
    if (errors['minlength']) {
      const reqLen = (errors['minlength'] as { requiredLength?: number })
        .requiredLength;
      this.controlError.set(`Mínimo de ${reqLen ?? 0} caracteres`);
      return;
    }
    if (errors['maxlength']) {
      const reqLen = (errors['maxlength'] as { requiredLength?: number })
        .requiredLength;
      this.controlError.set(`Máximo de ${reqLen ?? 0} caracteres`);
      return;
    }
    if (errors['min']) {
      const minVal = (errors['min'] as { min?: number }).min;
      this.controlError.set(`Valor mínimo permitido: ${minVal ?? 0}`);
      return;
    }
    if (errors['max']) {
      const maxVal = (errors['max'] as { max?: number }).max;
      this.controlError.set(`Valor máximo permitido: ${maxVal ?? 0}`);
      return;
    }

    this.controlError.set('Valor inválido');
  }

  onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  handleBlur(): void {
    this.onTouched();
    const ctrl = this.getActiveControl();
    if (ctrl) {
      this.syncControlError(ctrl);
    }
  }

  writeValue(val: string | number | null | undefined): void {
    this.value.set(val !== null && val !== undefined ? String(val) : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
