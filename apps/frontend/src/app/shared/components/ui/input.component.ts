import { Component, forwardRef, signal, computed, input } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { cn } from '../../utils/cn.util';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent implements ControlValueAccessor {
  id = input<string>(`ui-input-${Math.random().toString(36).substring(2, 9)}`);
  type = input<string>('text');
  placeholder = input<string>('');
  label = input<string>('');
  error = input<string | null>(null);
  class = input<string>('');
  
  value = signal<string>('');
  disabled = signal<boolean>(false);

  inputClasses = computed(() => {
    return cn(
      'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
      this.error() ? 'border-destructive focus-visible:ring-destructive' : '',
      this.class()
    );
  });

  onChange: any = () => {};
  onTouched: any = () => {};

  onInputChange(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  writeValue(val: string): void {
    this.value.set(val || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
