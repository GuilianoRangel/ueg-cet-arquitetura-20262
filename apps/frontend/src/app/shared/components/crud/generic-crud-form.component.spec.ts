import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CrudFormSchemaDto } from '@repo/utils';
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
          requiredRole: 'DADOS_SENSIVEIS',
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
});
