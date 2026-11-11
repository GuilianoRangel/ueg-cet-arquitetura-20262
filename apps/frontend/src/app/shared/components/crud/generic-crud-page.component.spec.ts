import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { CrudResourceMetaDto, PageResult } from '@repo/utils';
import { AuthService } from '../../../core/auth/auth.service';
import { GenericCrudService } from '../../../core/crud/generic-crud.service';
import { UiDialogService } from '../ui/dialog/ui-dialog.service';
import { ToastService } from '../ui/toast.service';
import { GenericCrudFormModalComponent } from './generic-crud-form-modal.component';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from './generic-crud-page.component';

class MockCustomModalComponent {}

interface MockCategoria {
  id: string;
  nome: string;
  ativo: boolean;
  version: number;
}

describe('GenericCrudPageComponent', () => {
  let fixture: ComponentFixture<GenericCrudPageComponent<MockCategoria>>;
  let component: GenericCrudPageComponent<MockCategoria>;
  let authServiceMock: {
    hasRole: ReturnType<typeof vi.fn>;
  };
  let dialogServiceMock: {
    open: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
  };
  let toastServiceMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let crudServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let modalClosed$: Subject<unknown>;
  let pageConfig: CrudPageConfig<MockCategoria>;
  let mockMeta: CrudResourceMetaDto;

  beforeEach(async () => {
    modalClosed$ = new Subject<unknown>();

    mockMeta = {
      resource: 'categorias',
      filters: {
        resource: 'categorias',
        fields: [
          {
            field: 'nome',
            label: 'Nome',
            type: 'string',
            controlType: 'text',
            operators: ['eq', 'like'],
            defaultOperator: 'like',
            quickFilter: true,
          },
        ],
      },
      createForm: {
        mode: 'create',
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
        ],
      },
      updateForm: {
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
            name: 'version',
            label: 'Versão',
            inputType: 'hidden',
            required: false,
            order: 999,
            hidden: true,
            readOnly: false,
            validations: [],
          },
        ],
      },
    };

    authServiceMock = {
      hasRole: vi.fn((role: string) =>
        [
          'categorias:read',
          'categorias:create',
          'categorias:update',
          'categorias:delete',
        ].includes(role),
      ),
    };

    dialogServiceMock = {
      open: vi.fn().mockImplementation(() => ({
        closed: modalClosed$.asObservable(),
        close: (val?: unknown) => {
          modalClosed$.next(val);
          modalClosed$.complete();
        },
      })),
      confirm: vi.fn().mockReturnValue(of(true)),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    crudServiceMock = {
      getMeta: vi.fn().mockReturnValue(of(mockMeta)),
      findAll: vi.fn().mockReturnValue(
        of({
          items: [{ id: 'cat-1', nome: 'Categoria 1', ativo: true, version: 2 }],
          total: 1,
          page: 1,
          limit: 10,
        } satisfies PageResult<MockCategoria>),
      ),
      findOne: vi.fn().mockReturnValue(
        of({ id: 'cat-1', nome: 'Categoria 1', ativo: true, version: 2 }),
      ),
      create: vi.fn().mockReturnValue(
        of({ id: 'cat-2', nome: 'Nova Categoria', ativo: true, version: 1 }),
      ),
      update: vi.fn().mockReturnValue(
        of({
          id: 'cat-1',
          nome: 'Categoria Atualizada',
          ativo: true,
          version: 3,
        }),
      ),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };

    pageConfig = {
      title: 'Gerenciamento de Categorias',
      subtitle: 'Administração de categorias do sistema',
      entityLabel: 'Categoria',
      resource: 'categorias',
      service: crudServiceMock as unknown as GenericCrudService<MockCategoria>,
      columns: [
        { key: 'nome', label: 'Nome', sortable: true },
        { key: 'ativo', label: 'Status', type: 'boolean' },
      ],
    };

    await TestBed.configureTestingModule({
      imports: [GenericCrudPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: UiDialogService, useValue: dialogServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericCrudPageComponent<MockCategoria>);
    component = fixture.componentInstance;
  });

  it('should load metadata and initial table page on init', () => {
    fixture.componentRef.setInput('config', pageConfig);
    fixture.detectChanges();

    expect(crudServiceMock.getMeta).toHaveBeenCalledTimes(1);
    expect(crudServiceMock.findAll).toHaveBeenCalledTimes(1);
    expect(component.dataSource().items().length).toBe(1);
  });

  it('should show Novo button only when user has <resource>:create role', () => {
    fixture.componentRef.setInput('config', pageConfig);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[data-testid="crud-page-create-btn"]')).not.toBeNull();

    // When user lacks 'categorias:create', button should not be rendered
    authServiceMock.hasRole.mockImplementation(
      (role: string) => role === 'categorias:read',
    );
    const fixture2 = TestBed.createComponent(
      GenericCrudPageComponent<MockCategoria>,
    );
    fixture2.componentRef.setInput('config', pageConfig);
    fixture2.detectChanges();

    const host2 = fixture2.nativeElement as HTMLElement;
    expect(host2.querySelector('[data-testid="crud-page-create-btn"]')).toBeNull();
  });

  it('should open GenericCrudFormModal in create mode and refresh table after successful creation', () => {
    fixture.componentRef.setInput('config', pageConfig);
    fixture.detectChanges();

    crudServiceMock.findAll.mockClear();

    const host = fixture.nativeElement as HTMLElement;
    const createBtn = host.querySelector(
      '[data-testid="crud-page-create-btn"]',
    ) as HTMLButtonElement;
    createBtn.click();

    expect(dialogServiceMock.open).toHaveBeenCalledWith(
      GenericCrudFormModalComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          schema: mockMeta.createForm,
        }),
      }),
    );

    const modalData = (
      dialogServiceMock.open.mock.calls[0][1] as {
        data: { submitHandler: (p: Record<string, unknown>) => unknown };
      }
    ).data;
    modalData.submitHandler({ nome: 'Nova Categoria' });
    expect(crudServiceMock.create).toHaveBeenCalledWith({
      nome: 'Nova Categoria',
    });

    modalClosed$.next(true);
    modalClosed$.complete();

    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(crudServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should fetch latest entity via findOne, open GenericCrudFormModal in update mode and refresh table after update', () => {
    fixture.componentRef.setInput('config', pageConfig);
    fixture.detectChanges();

    crudServiceMock.findAll.mockClear();

    const row = component.dataSource().items()[0];
    component.openEditModal(row);

    expect(crudServiceMock.findOne).toHaveBeenCalledWith('cat-1');
    expect(dialogServiceMock.open).toHaveBeenCalledWith(
      GenericCrudFormModalComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          schema: mockMeta.updateForm,
          initialData: expect.objectContaining({ id: 'cat-1', version: 2 }),
        }),
      }),
    );

    const modalData = (
      dialogServiceMock.open.mock.calls[0][1] as {
        data: { submitHandler: (p: Record<string, unknown>) => unknown };
      }
    ).data;
    modalData.submitHandler({ nome: 'Categoria Atualizada', version: 2 });
    expect(crudServiceMock.update).toHaveBeenCalledWith('cat-1', {
      nome: 'Categoria Atualizada',
      version: 2,
    });

    modalClosed$.next(true);
    modalClosed$.complete();

    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(crudServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should open confirmation dialog on delete, call service.remove(id, version) and show success toast', () => {
    fixture.componentRef.setInput('config', pageConfig);
    fixture.detectChanges();

    crudServiceMock.findAll.mockClear();

    const row = component.dataSource().items()[0];
    component.confirmDelete(row);

    expect(dialogServiceMock.confirm).toHaveBeenCalled();
    expect(crudServiceMock.remove).toHaveBeenCalledWith('cat-1', 2);
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(crudServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should render headerActions only when user has the required permission and execute handler on click', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const configWithActions: CrudPageConfig<MockCategoria> = {
      ...pageConfig,
      headerActions: [
        {
          id: 'sync',
          label: 'Sincronizar',
          permission: 'perfis:sync',
          handler: handler1,
        },
        {
          id: 'secret',
          label: 'Secret Action',
          permission: 'admin:secret',
          handler: handler2,
        },
      ],
    };

    authServiceMock.hasRole.mockImplementation((role: string) =>
      ['categorias:create', 'perfis:sync'].includes(role),
    );

    fixture.componentRef.setInput('config', configWithActions);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const syncBtn = host.querySelector(
      '[data-testid="crud-page-header-action-sync"]',
    ) as HTMLButtonElement;
    const secretBtn = host.querySelector(
      '[data-testid="crud-page-header-action-secret"]',
    );

    expect(syncBtn).not.toBeNull();
    expect(secretBtn).toBeNull();

    syncBtn.click();
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should open customModalComponent when configured instead of GenericCrudFormModalComponent', () => {
    const configWithCustomModal: CrudPageConfig<MockCategoria> = {
      ...pageConfig,
      customModalComponent: MockCustomModalComponent,
    };

    fixture.componentRef.setInput('config', configWithCustomModal);
    fixture.detectChanges();

    component.openCreateModal();
    expect(dialogServiceMock.open).toHaveBeenCalledWith(
      MockCustomModalComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'create',
          initialData: null,
          readOnly: false,
          entityLabel: 'Categoria',
        }),
      }),
    );
  });

  it('should keep Editar button enabled when isRowReadOnly(row) is true and pass readOnly: true to modal data', () => {
    const configWithReadOnly: CrudPageConfig<MockCategoria> = {
      ...pageConfig,
      customModalComponent: MockCustomModalComponent,
      isRowReadOnly: (row: MockCategoria) => row.id === 'cat-1',
    };

    fixture.componentRef.setInput('config', configWithReadOnly);
    fixture.detectChanges();

    const row = component.dataSource().items()[0];
    const actions = component.dataSource().actions();
    const editAction = actions.find((a) => a.id === 'edit');
    expect(editAction).toBeDefined();
    expect(editAction?.disabled ? editAction.disabled(row) : false).toBe(false);

    component.openEditModal(row);
    expect(crudServiceMock.findOne).toHaveBeenCalledWith('cat-1');
    expect(dialogServiceMock.open).toHaveBeenCalledWith(
      MockCustomModalComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'edit',
          initialData: expect.objectContaining({ id: 'cat-1' }),
          readOnly: true,
          entityLabel: 'Categoria',
        }),
      }),
    );
  });
});

