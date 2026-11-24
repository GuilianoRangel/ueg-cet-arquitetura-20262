import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../utils/cn.util';

@Component({
  selector: 'ui-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiRichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-col gap-1.5 w-full">
      @if (label()) {
        <label [for]="id()" class="text-sm font-medium text-foreground">
          {{ label() }}
        </label>
      }

      <div
        data-testid="editor-container"
        [class]="containerClasses()"
      >
        <!-- Toolbar -->
        <div class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-1.5">
          <button
            type="button"
            data-testid="toolbar-bold"
            title="Negrito (Ctrl+B)"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('bold')"
            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-bold text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            B
          </button>

          <button
            type="button"
            data-testid="toolbar-italic"
            title="Itálico (Ctrl+I)"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('italic')"
            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-semibold italic text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            I
          </button>

          <button
            type="button"
            data-testid="toolbar-underline"
            title="Sublinhado (Ctrl+U)"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('underline')"
            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm font-semibold underline text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            U
          </button>

          <div class="h-4 w-px bg-border mx-1"></div>

          <button
            type="button"
            data-testid="toolbar-ul"
            title="Lista com marcadores"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('insertUnorderedList')"
            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            type="button"
            data-testid="toolbar-ol"
            title="Lista numerada"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('insertOrderedList')"
            class="h-8 w-8 inline-flex items-center justify-center rounded-md text-sm text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </button>

          <div class="h-4 w-px bg-border mx-1"></div>

          <button
            type="button"
            data-testid="toolbar-clear"
            title="Limpar formatação"
            [disabled]="effectiveDisabled()"
            (click)="executeCommand('removeFormat')"
            class="h-8 px-2 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Limpar
          </button>
        </div>

        <!-- Editable Area -->
        <div
          #editableArea
          [id]="id()"
          [attr.contenteditable]="!effectiveDisabled()"
          role="textbox"
          aria-multiline="true"
          (input)="onContentInput()"
          (blur)="onBlur()"
          class="p-3 min-h-32 text-sm text-foreground focus:outline-none overflow-y-auto"
        ></div>
      </div>

      @if (error(); as err) {
        <p class="text-sm text-destructive font-medium" data-testid="editor-error">
          {{ err }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiRichTextEditorComponent implements ControlValueAccessor {
  @ViewChild('editableArea', { static: true })
  editableArea!: ElementRef<HTMLDivElement>;

  readonly id = input<string>(`ui-editor-${Math.random().toString(36).substring(2, 9)}`);
  readonly label = input<string>('');
  readonly placeholder = input<string>('Digite aqui...');
  readonly error = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  private readonly formControlDisabled = signal<boolean>(false);
  readonly effectiveDisabled = computed(
    () => this.disabled() || this.formControlDisabled(),
  );

  readonly containerClasses = computed(() => {
    return cn(
      'rounded-md border bg-background transition-colors overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
      this.error()
        ? 'border-destructive focus-within:ring-destructive focus-within:border-destructive'
        : 'border-border',
      this.effectiveDisabled() ? 'opacity-50 cursor-not-allowed' : '',
    );
  });

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string | null): void {
    const raw = val || '';
    if (this.editableArea?.nativeElement) {
      this.editableArea.nativeElement.innerHTML = raw;
    }
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formControlDisabled.set(isDisabled);
  }

  onContentInput(): void {
    if (!this.editableArea?.nativeElement) return;
    const raw = this.editableArea.nativeElement.innerHTML;
    const sanitized = this.sanitizarHtml(raw);
    const textOnly = this.extrairTextoHtml(raw);

    const emitted = textOnly.length === 0 ? '' : sanitized;
    this.onChange(emitted);
  }

  onBlur(): void {
    this.onTouched();
  }

  executeCommand(command: string): void {
    if (this.effectiveDisabled()) return;
    if (this.editableArea?.nativeElement) {
      this.editableArea.nativeElement.focus();
    }
    document.execCommand(command, false);
    this.onContentInput();
  }

  private sanitizarHtml(html: string): string {
    if (!html) return '';
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

    clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    clean = clean.replace(/javascript\s*:[^"'>]*/gi, '');

    const allowed = [
      'p',
      'br',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ul',
      'ol',
      'li',
      'div',
      'span',
    ];

    clean = clean.replace(
      /<\/?([a-z0-9]+)(?:\s+[^>]*)?>/gi,
      (match, tag: string) => {
        if (allowed.includes(tag.toLowerCase())) {
          if (match.startsWith('</')) {
            return `</${tag.toLowerCase()}>`;
          }
          if (tag.toLowerCase() === 'br') {
            return '<br>';
          }
          return `<${tag.toLowerCase()}>`;
        }
        return '';
      },
    );

    return clean.trim();
  }

  private extrairTextoHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}