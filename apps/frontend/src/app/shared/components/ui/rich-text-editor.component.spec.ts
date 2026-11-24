import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UiRichTextEditorComponent } from './rich-text-editor.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, UiRichTextEditorComponent],
  template: `
    <ui-rich-text-editor
      id="test-editor"
      label="Sinopse"
      placeholder="Digite a sinopse..."
      [formControl]="control"
      [error]="error()"
    ></ui-rich-text-editor>
  `,
})
class TestHostComponent {
  control = new FormControl<string>('');
  readonly error = signal<string | null>(null);
}

describe('UiRichTextEditorComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, UiRichTextEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render toolbar buttons (bold, italic, underline, unordered list, ordered list, clear) and editable area', () => {
    const boldBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-bold"]'));
    const italicBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-italic"]'));
    const underlineBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-underline"]'));
    const ulBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-ul"]'));
    const olBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-ol"]'));
    const clearBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-clear"]'));
    const editableArea = fixture.debugElement.query(By.css('[contenteditable]'));

    expect(boldBtn).toBeTruthy();
    expect(italicBtn).toBeTruthy();
    expect(underlineBtn).toBeTruthy();
    expect(ulBtn).toBeTruthy();
    expect(olBtn).toBeTruthy();
    expect(clearBtn).toBeTruthy();
    expect(editableArea).toBeTruthy();
  });

  it('should bind initial HTML value via ControlValueAccessor and emit sanitized HTML on input', () => {
    const initialHtml = '<p>Texto <b>em negrito</b> inicial</p>';
    host.control.setValue(initialHtml);
    fixture.detectChanges();

    const editable = fixture.debugElement.query(By.css('[contenteditable]')).nativeElement as HTMLDivElement;
    expect(editable.innerHTML).toContain('Texto <b>em negrito</b> inicial');

    // User types new content
    editable.innerHTML = '<p>Novo texto formatado</p>';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.control.value).toBe('<p>Novo texto formatado</p>');
  });

  it('should emit empty string when editable content has only whitespace or empty tags', () => {
    const editable = fixture.debugElement.query(By.css('[contenteditable]')).nativeElement as HTMLDivElement;

    editable.innerHTML = '<p><br></p>';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.control.value).toBe('');

    editable.innerHTML = '   <div><br>   </div>   ';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.control.value).toBe('');
  });

  it('should strip unsafe <script> tags and inline event handlers when sanitizing HTML', () => {
    const editable = fixture.debugElement.query(By.css('[contenteditable]')).nativeElement as HTMLDivElement;

    editable.innerHTML = '<p>Texto</p><script>alert("hack")</script><img src="x" onerror="alert(1)" /><iframe src="evil.com"></iframe>';
    editable.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.control.value).not.toContain('<script');
    expect(host.control.value).not.toContain('onerror');
    expect(host.control.value).not.toContain('<iframe');
    expect(host.control.value).toContain('Texto');
  });

  it('should disable toolbar buttons and contenteditable when form control is disabled', () => {
    host.control.disable();
    fixture.detectChanges();

    const editable = fixture.debugElement.query(By.css('[contenteditable]')).nativeElement as HTMLDivElement;
    expect(editable.getAttribute('contenteditable')).toBe('false');

    const boldBtn = fixture.debugElement.query(By.css('[data-testid="toolbar-bold"]')).nativeElement as HTMLButtonElement;
    expect(boldBtn.disabled).toBe(true);
  });

  it('should display error message and destructive border when error input is provided', () => {
    host.error.set('A sinopse não pode estar vazia');
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('[data-testid="editor-error"]'));
    expect(errorEl).toBeTruthy();
    expect(errorEl.nativeElement.textContent).toContain('A sinopse não pode estar vazia');

    const container = fixture.debugElement.query(By.css('[data-testid="editor-container"]'));
    expect(container.nativeElement.className).toContain('border-destructive');
  });
});