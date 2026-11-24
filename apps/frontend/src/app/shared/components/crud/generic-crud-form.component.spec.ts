import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CrudFormSchemaDto, SENSITIVE_DATA_ROLE } from '@repo/utils';
import { GenericCrudFormComponent } from './generic-crud-form.component';

describe('GenericCrudFormComponent', () => {
  let fixture: ComponentFixture<GenericCrudFormComponent>;
  let component: GenericCrudFormComponent;
  let httpMock: HttpTestingController;

  const userCreateSchema: CrudFormSchemaDto = {
    mode: 'create',
    fields: [
      {
        name: 'nome',
        label: 'Nome Completo',
        inputType: 'text',
        required: true,
        order: 1,
        hidden: false,
        readOnly: false,
        validations: [
          { type: 'required' },
          { type: 'maxLength', value: 100 },
        ],
      },
      {
        name: 'email',
        label: 'E-mail',
        inputType: 'email',
        required: true,
        order: 2,
        hidden: false,
        readOnly: false,
        validations: [{ type: 'required' }, { type: 'email' }],
      },
      {
        name: 'senha',
        label: 'Senha Inicial',
        inputType: 'password',
        required: true,
        order: 3,
        hidden: false,
        readOnly: false,
        validations: [
          { type: 'required' },
          { type: 'minLength', value: 6 },
        ],
      },
      {
        name: 'perfilIds',
        label: 'Perfis de Acesso',
        inputType: 'multiselect',
        required: false,
        order: 4,
        hidden: false,
        readOnly: false,
        optionsEndpoint: '/perfis',
        optionsValueKey: 'id',
        optionsLabelKey: 'nome',
        entityRelationProperty: 'perfis',
        entityRelationValueKey: 'id',
        validations: [],
      },
      {
        name: 'ativo',
        label: 'Usuário Ativo',
        inputType: 'boolean',
        required: false,
        defaultValue: true,
        order: 5,
        hidden: false,
        readOnly: false,
        validations: [],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericCrudFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericCrudFormComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushPerfis(): void {
    const reqs = httpMock.match((r) => r.url.includes('/perfis'));
    for (const r of reqs) {
      r.flush({
        items: [
          { id: 'p-1', nome: 'ADMIN' },
          { id: 'p-2', nome: 'OPERADOR' },
        ],
        total: 2,
        page: 1,
        limit: 1000,
      });
    }
  }

  it('should dynamically build FormGroup controls and validators from CrudFormSchemaDto (create vs update)', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();

    expect(component.form.contains('nome')).toBe(true);
    expect(component.form.contains('email')).toBe(true);
    expect(component.form.contains('senha')).toBe(true);
    expect(component.form.contains('perfilIds')).toBe(true);
    expect(component.form.contains('ativo')).toBe(true);
    expect(component.form.get('ativo')?.value).toBe(true);

    // Invalid initially because required fields are empty
    expect(component.form.valid).toBe(false);

    // Switch to update schema (without 'senha', with 'version')
    const userUpdateSchema: CrudFormSchemaDto = {
      mode: 'update',
      fields: [
        ...userCreateSchema.fields.filter((f) => f.name !== 'senha'),
        {
          name: 'version',
          label: 'Versão',
          inputType: 'hidden',
          required: false,
          order: 999,
          hidden: true,
          readOnly: false,
          validations: [{ type: 'int' }],
        },
      ],
    };

    fixture.componentRef.setInput('schema', userUpdateSchema);
    fixture.detectChanges();
    flushPerfis();

    expect(component.form.contains('senha')).toBe(false);
    expect(component.form.contains('version')).toBe(true);
  });

  it('should load options from optionsEndpoint for select and multiselect fields (e.g. /perfis and /roles)', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();
    fixture.detectChanges();

    const options = component.getFieldOptions(
      userCreateSchema.fields.find((f) => f.name === 'perfilIds')!,
    );
    expect(options).toEqual([
      { label: 'ADMIN', value: 'p-1' },
      { label: 'OPERADOR', value: 'p-2' },
    ]);
  });

  it('should map entityRelationProperty (e.g. perfis -> perfilIds) when populating initialData in update mode', () => {
    const userUpdateSchema: CrudFormSchemaDto = {
      mode: 'update',
      fields: userCreateSchema.fields.filter((f) => f.name !== 'senha'),
    };

    fixture.componentRef.setInput('schema', userUpdateSchema);
    fixture.componentRef.setInput('initialData', {
      id: 'u-1',
      nome: 'Carlos Silva',
      email: 'carlos@ueg.br',
      ativo: true,
      perfis: [
        { id: 'p-1', nome: 'ADMIN' },
        { id: 'p-2', nome: 'OPERADOR' },
      ],
    });
    fixture.detectChanges();
    flushPerfis();

    expect(component.form.get('nome')?.value).toBe('Carlos Silva');
    expect(component.form.get('email')?.value).toBe('carlos@ueg.br');
    expect(component.form.get('perfilIds')?.value).toEqual(['p-1', 'p-2']);
  });

  it('should convert currency field between BRL decimal display and integer cents on submit', () => {
    const categoriaSchema: CrudFormSchemaDto = {
      mode: 'update',
      fields: [
        {
          name: 'nome',
          label: 'Nome',
          inputType: 'text',
          required: true,
          order: 1,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
        {
          name: 'valor',
          label: 'Valor (R$)',
          inputType: 'currency',
          required: false,
          order: 2,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'min', value: 0 }],
        },
      ],
    };

    fixture.componentRef.setInput('schema', categoriaSchema);
    fixture.componentRef.setInput('initialData', {
      id: 'c-1',
      nome: 'Categoria X',
      valor: 12550, // 125.50 BRL in cents
    });
    fixture.detectChanges();

    // Displayed in form control as BRL decimal (125.5)
    expect(Number(component.form.get('valor')?.value)).toBe(125.5);

    // Update control to 250.75 BRL and submit
    component.form.get('valor')?.setValue(250.75);
    const submitSpy = vi.fn();
    component.formSubmit.subscribe(submitSpy);

    component.onSubmit();
    expect(submitSpy).toHaveBeenCalledWith({
      nome: 'Categoria X',
      valor: 25075,
    });
  });

  it('should disable masked/readOnly fields and omit fields marked with omitOnSubmit from payload', () => {
    const maskedSchema: CrudFormSchemaDto = {
      mode: 'update',
      fields: [
        {
          name: 'nome',
          label: 'Nome',
          inputType: 'text',
          required: true,
          order: 1,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
        {
          name: 'valor',
          label: 'Valor (R$)',
          inputType: 'currency',
          required: false,
          order: 2,
          hidden: false,
          readOnly: true,
          masked: true,
          omitOnSubmit: true,
          requiredRole: SENSITIVE_DATA_ROLE,
          validations: [],
        },
      ],
    };

    fixture.componentRef.setInput('schema', maskedSchema);
    fixture.componentRef.setInput('initialData', {
      id: 'c-1',
      nome: 'Categoria Restrita',
      valor: 99999,
    });
    fixture.detectChanges();

    expect(component.form.get('valor')?.disabled).toBe(true);

    const submitSpy = vi.fn();
    component.formSubmit.subscribe(submitSpy);
    component.onSubmit();

    expect(submitSpy).toHaveBeenCalledWith({
      nome: 'Categoria Restrita',
    });
  });

  it('should display field-level backend error (e.g. USER_EMAIL_EXISTS on email) directly below the field and clear it on edit', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();

    const httpError = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_EMAIL_EXISTS',
        message: 'Já existe um usuário com este e-mail',
        details: [
          { field: 'email', message: 'Já existe um usuário com este e-mail' },
        ],
      },
    });

    component.applyBackendError(httpError);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Já existe um usuário com este e-mail');
    expect(component.bannerError()).toBeNull();

    // Editing email clears the serverError
    component.form.get('email')?.setValue('outro@ueg.br');
    fixture.detectChanges();
    expect(component.form.get('email')?.errors).toBeNull();
  });

  it('should display non-field business error (e.g. USER_LAST_ADMIN) in the top alert banner of the form', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();

    const httpError = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'USER_LAST_ADMIN',
        message:
          'Não é possível inativar ou remover o único administrador ativo do sistema',
      },
    });

    component.applyBackendError(httpError);
    fixture.detectChanges();

    expect(component.bannerError()).toBe(
      'Não é possível inativar ou remover o único administrador ativo do sistema',
    );
    const host = fixture.nativeElement as HTMLElement;
    const banner = host.querySelector('[data-testid="form-error-banner"]');
    expect(banner?.textContent).toContain(
      'Não é possível inativar ou remover o único administrador ativo do sistema',
    );
  });

  it('should render ui-rich-text-editor when field inputType is richtext and include its HTML value in formSubmit payload', () => {
    const filmeSchema: CrudFormSchemaDto = {
      mode: 'create',
      fields: [
        {
          name: 'titulo',
          label: 'Título',
          inputType: 'text',
          required: true,
          order: 1,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
        {
          name: 'sinopse',
          label: 'Sinopse',
          inputType: 'richtext',
          required: true,
          order: 2,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
      ],
    };

    fixture.componentRef.setInput('schema', filmeSchema);
    fixture.detectChanges();

    const editorEl = fixture.debugElement.query(By.css('ui-rich-text-editor'));
    expect(editorEl).toBeTruthy();

    let submittedData: Record<string, unknown> | null = null;
    component.formSubmit.subscribe((data) => {
      submittedData = data;
    });

    component.form.get('titulo')?.setValue('Interestelar');
    component.form.get('sinopse')?.setValue('<p>Sinopse Interestelar</p>');
    fixture.detectChanges();

    component.onSubmit();
    fixture.detectChanges();

    expect(submittedData).toEqual({
      titulo: 'Interestelar',
      sinopse: '<p>Sinopse Interestelar</p>',
    });
  });

  describe('@EntityStatus filtering and inactive option validation', () => {
    const createSchemaWithStatus: CrudFormSchemaDto = {
      mode: 'create',
      fields: [
        {
          name: 'titulo',
          label: 'Título',
          inputType: 'text',
          required: true,
          order: 1,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
        {
          name: 'categoriaIds',
          label: 'Categorias',
          inputType: 'multiselect',
          required: true,
          order: 2,
          hidden: false,
          readOnly: false,
          optionsEndpoint: '/categorias',
          optionsValueKey: 'id',
          optionsLabelKey: 'nome',
          entityRelationProperty: 'categorias',
          entityRelationValueKey: 'id',
          optionsStatusField: {
            field: 'ativo',
            type: 'boolean',
            inactiveValues: [false],
            inactiveLabel: 'Inativo',
          },
          validations: [{ type: 'required' }],
        },
        {
          name: 'parceiroId',
          label: 'Parceiro',
          inputType: 'select',
          required: false,
          order: 3,
          hidden: false,
          readOnly: false,
          optionsEndpoint: '/parceiros',
          optionsValueKey: 'id',
          optionsLabelKey: 'nome',
          optionsStatusField: {
            field: 'situacao',
            type: 'enum',
            inactiveValues: ['INATIVO', 'BLOQUEADO'],
            inactiveLabel: 'Indisponível',
          },
          validations: [],
        },
      ],
    };

    const updateSchemaWithStatus: CrudFormSchemaDto = {
      ...createSchemaWithStatus,
      mode: 'update',
    };

    function flushCategoriasAndParceiros(): void {
      const catReqs = httpMock.match((r) => r.url.includes('/categorias'));
      for (const r of catReqs) {
        r.flush({
          items: [
            { id: 'c-1', nome: 'Eletrônicos', ativo: true },
            { id: 'c-2', nome: 'Material Escolar222', ativo: false },
            { id: 'c-3', nome: 'Lançamentos', ativo: true },
          ],
          total: 3,
          page: 1,
          limit: 1000,
        });
      }

      const parcReqs = httpMock.match((r) => r.url.includes('/parceiros'));
      for (const r of parcReqs) {
        r.flush({
          items: [
            { id: 'pa-1', nome: 'Parceiro Ativo', situacao: 'ATIVO' },
            { id: 'pa-2', nome: 'Parceiro Inativo', situacao: 'INATIVO' },
            { id: 'pa-3', nome: 'Parceiro Bloqueado', situacao: 'BLOQUEADO' },
          ],
          total: 3,
          page: 1,
          limit: 1000,
        });
      }
    }

    it('should hide inactive options (boolean and enum) in create mode', () => {
      fixture.componentRef.setInput('schema', createSchemaWithStatus);
      fixture.detectChanges();
      flushCategoriasAndParceiros();
      fixture.detectChanges();

      const catField = createSchemaWithStatus.fields.find(
        (f) => f.name === 'categoriaIds',
      )!;
      const parcField = createSchemaWithStatus.fields.find(
        (f) => f.name === 'parceiroId',
      )!;

      expect(component.getFieldOptions(catField)).toEqual([
        { label: 'Eletrônicos', value: 'c-1' },
        { label: 'Lançamentos', value: 'c-3' },
      ]);
      expect(component.getFieldOptions(parcField)).toEqual([
        { label: 'Parceiro Ativo', value: 'pa-1' },
      ]);
    });

    it('should hide unselected inactive options in update mode and display selected inactive option with disabled re-selection after unchecking', () => {
      fixture.componentRef.setInput('schema', updateSchemaWithStatus);
      fixture.componentRef.setInput('initialData', {
        id: 'f-1',
        titulo: 'Interstelar',
        categorias: [
          { id: 'c-1', nome: 'Eletrônicos', ativo: true },
          { id: 'c-2', nome: 'Material Escolar222', ativo: false },
        ],
        parceiroId: 'pa-3',
      });
      fixture.detectChanges();
      flushCategoriasAndParceiros();
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      const catContainer = host.querySelector(
        '[data-testid="multiselect-categoriaIds"]',
      );
      expect(catContainer?.textContent).toContain('Eletrônicos');
      expect(catContainer?.textContent).toContain('Material Escolar222');
      expect(catContainer?.textContent).toContain('Inativo');
      expect(catContainer?.textContent).toContain('Lançamentos');

      const parcSelect = host.querySelector(
        '[data-testid="input-parceiroId"]',
      ) as HTMLSelectElement;
      const optionTexts = Array.from(parcSelect.options).map((o) => o.textContent);
      expect(optionTexts.some((t) => t?.includes('Parceiro Bloqueado'))).toBe(true);
      expect(optionTexts.some((t) => t?.includes('Parceiro Inativo'))).toBe(false);

      // Should block submit while inactive options remain selected and show field errors
      const submitSpy = vi.fn();
      component.formSubmit.subscribe(submitSpy);
      component.onSubmit();
      fixture.detectChanges();

      expect(submitSpy).not.toHaveBeenCalled();
      expect(component.getControlErrorMessage('categoriaIds')).toContain(
        'Material Escolar222',
      );
      expect(component.getControlErrorMessage('parceiroId')).toContain(
        'Parceiro Bloqueado',
      );

      // Uncheck inactive category c-2 and switch parceiroId to active pa-1
      const c2Checkbox = catContainer?.querySelectorAll(
        'input[type="checkbox"]',
      )[1] as HTMLInputElement;
      expect(c2Checkbox.checked).toBe(true);
      expect(c2Checkbox.disabled).toBe(false);

      c2Checkbox.checked = false;
      c2Checkbox.dispatchEvent(new Event('change'));
      component.form.get('parceiroId')?.setValue('pa-1');
      fixture.detectChanges();

      // Now c-2 stays visible but disabled so it cannot be re-selected
      const c2CheckboxAfter = catContainer?.querySelectorAll(
        'input[type="checkbox"]',
      )[1] as HTMLInputElement;
      expect(c2CheckboxAfter.checked).toBe(false);
      expect(c2CheckboxAfter.disabled).toBe(true);

      // Validation errors cleared and submit succeeds
      expect(component.getControlErrorMessage('categoriaIds')).toBeNull();
      expect(component.getControlErrorMessage('parceiroId')).toBeNull();

      component.onSubmit();
      expect(submitSpy).toHaveBeenCalledWith({
        titulo: 'Interstelar',
        categoriaIds: ['c-1'],
        parceiroId: 'pa-1',
      });
    });

    it('should detect and block saving when a previously selected option was soft-deleted (missing from complete endpoint list)', () => {
      fixture.componentRef.setInput('schema', updateSchemaWithStatus);
      fixture.componentRef.setInput('initialData', {
        id: 'f-2',
        titulo: 'Filme Antigo',
        categoriaIds: ['c-deleted'],
        parceiroId: '',
      });
      fixture.detectChanges();
      flushCategoriasAndParceiros();
      fixture.detectChanges();

      const submitSpy = vi.fn();
      component.formSubmit.subscribe(submitSpy);
      component.onSubmit();
      fixture.detectChanges();

      expect(submitSpy).not.toHaveBeenCalled();
      expect(component.getControlErrorMessage('categoriaIds')).toBeTruthy();
    });
  });

  it('should display field-level backend error on boolean fields (e.g. CATEGORIA_IN_USE on ativo) and clear it on change', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();

    const httpError = new HttpErrorResponse({
      status: 409,
      error: {
        statusCode: 409,
        error: 'CATEGORIA_IN_USE',
        message: 'Não é possível inativar uma categoria vinculada a filmes ativos',
        details: [
          {
            field: 'ativo',
            message:
              'Não é possível inativar uma categoria vinculada a filmes ativos',
          },
        ],
      },
    });

    component.applyBackendError(httpError);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const ativoField = host.querySelector('[data-testid="form-field-ativo"]');
    const fieldError = ativoField?.querySelector('[data-testid="field-error"]');
    expect(fieldError?.textContent).toContain(
      'Não é possível inativar uma categoria vinculada a filmes ativos',
    );
    expect(component.bannerError()).toBeNull();

    // Toggling ativo clears the serverError
    component.form.get('ativo')?.setValue(true);
    fixture.detectChanges();
    expect(component.form.get('ativo')?.errors).toBeNull();
  });

  it('should scroll to the first invalid field (e.g. inactive option error) when onSubmit is clicked', () => {
    const updateSchema: CrudFormSchemaDto = {
      mode: 'update',
      fields: [
        {
          name: 'titulo',
          label: 'Título',
          inputType: 'text',
          required: true,
          order: 1,
          hidden: false,
          readOnly: false,
          validations: [{ type: 'required' }],
        },
        {
          name: 'categoriaIds',
          label: 'Categorias',
          inputType: 'multiselect',
          required: true,
          order: 2,
          hidden: false,
          readOnly: false,
          optionsEndpoint: '/categorias',
          optionsValueKey: 'id',
          optionsLabelKey: 'nome',
          entityRelationProperty: 'categorias',
          entityRelationValueKey: 'id',
          optionsStatusField: {
            field: 'ativo',
            type: 'boolean',
            inactiveValues: [false],
            inactiveLabel: 'Inativo',
          },
          validations: [{ type: 'required' }],
        },
      ],
    };

    fixture.componentRef.setInput('schema', updateSchema);
    fixture.componentRef.setInput('initialData', {
      id: 'f-1',
      titulo: 'Interstelar',
      categorias: [{ id: 'c-2', nome: 'Material Escolar222', ativo: false }],
    });
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.url.includes('/categorias'));
    req.flush({
      items: [
        { id: 'c-1', nome: 'Eletrônicos', ativo: true },
        { id: 'c-2', nome: 'Material Escolar222', ativo: false },
      ],
      total: 2,
      page: 1,
      limit: 1000,
    });
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const catFieldEl = host.querySelector(
      '[data-testid="form-field-categoriaIds"]',
    ) as HTMLElement;
    const scrollSpy = vi.fn();
    catFieldEl.scrollIntoView = scrollSpy;

    component.onSubmit();

    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
    });
  });

  it('should render form fields inside an internal scrollable container with fixed footer actions', () => {
    fixture.componentRef.setInput('schema', userCreateSchema);
    fixture.detectChanges();
    flushPerfis();

    const host = fixture.nativeElement as HTMLElement;
    const fieldsContainer = host.querySelector('[data-testid="crud-form-fields"]');
    const actionsContainer = host.querySelector('[data-testid="crud-form-actions"]');

    expect(fieldsContainer?.className).toContain('overflow-y-auto');
    expect(fieldsContainer?.className).toContain('flex-1');
    expect(fieldsContainer?.className).toContain('min-h-0');
    expect(actionsContainer?.className).toContain('shrink-0');
  });
});

