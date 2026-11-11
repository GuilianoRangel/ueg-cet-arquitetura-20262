import { describe, it, expect, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { FuncionalidadeGroupDto } from '@repo/utils';
import {
  UI_DIALOG_DATA,
  UiCdkDialogRef,
} from '../../shared/components/ui/dialog/ui-dialog.types';
import { FormErrorHandlerService } from '../../core/errors/form-error-handler.service';
import {
  PerfilFormModalComponent,
  PerfilFormModalData,
} from './perfil-form-modal.component';
import { PerfisService, PerfilDto } from './perfis.service';

describe('PerfilFormModalComponent', () => {
  let fixture: ComponentFixture<PerfilFormModalComponent>;
  let component: PerfilFormModalComponent;
  let dialogRefMock: { close: ReturnType<typeof vi.fn> };
  let perfisServiceMock: {
    getRolesCatalog: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let errorHandlerMock: {
    handleNonFormError: ReturnType<typeof vi.fn>;
  };

  const mockFuncionalidades: FuncionalidadeGroupDto[] = [
    {
      id: 'f-categorias',
      nome: 'categorias',
      acoes: [
        { id: 'a-cat-create', acao: 'create', role: 'categorias:create' },
        { id: 'a-cat-read', acao: 'read', role: 'categorias:read' },
      ],
    },
    {
      id: 'f-users',
      nome: 'users',
      acoes: [
        { id: 'a-usr-create', acao: 'create', role: 'users:create' },
        { id: 'a-usr-read', acao: 'read', role: 'users:read' },
      ],
    },
  ];

  const setupModal = async (modalData: PerfilFormModalData) => {
    dialogRefMock = { close: vi.fn() };
    perfisServiceMock = {
      getRolesCatalog: vi.fn().mockReturnValue(of({ funcionalidades: mockFuncionalidades })),
      create: vi.fn().mockReturnValue(of({ id: 'p-new', nome: 'Novo Perfil' })),
      update: vi.fn().mockReturnValue(of({ id: 'p-1', nome: 'Perfil Atualizado' })),
    };
    errorHandlerMock = {
      handleNonFormError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PerfilFormModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UI_DIALOG_DATA, useValue: { ...modalData, service: perfisServiceMock as unknown as PerfisService } },
        { provide: UiCdkDialogRef, useValue: dialogRefMock },
        { provide: FormErrorHandlerService, useValue: errorHandlerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should render a card for each funcionalidade and toggle buttons for each acao', async () => {
    await setupModal({
      mode: 'create',
      initialData: null,
      readOnly: false,
      entityLabel: 'Perfil',
      service: {} as PerfisService,
    });

    const host = fixture.nativeElement as HTMLElement;
    const cards = host.querySelectorAll('[data-testid^="funcionalidade-card-"]');
    expect(cards.length).toBe(2);

    const catCard = host.querySelector('[data-testid="funcionalidade-card-categorias"]');
    expect(catCard).not.toBeNull();
    const actionToggles = catCard!.querySelectorAll('[data-testid^="action-toggle-"]');
    expect(actionToggles.length).toBe(2);
  });

  it('should mark acao toggles as active when their id is in initialData.acaoIds and inactive otherwise', async () => {
    const existingPerfil: PerfilDto = {
      id: 'p-1',
      nome: 'Editor',
      ativo: true,
      sistema: false,
      acaoIds: ['a-cat-read'],
      version: 1,
    };

    await setupModal({
      mode: 'edit',
      initialData: existingPerfil,
      readOnly: false,
      entityLabel: 'Perfil',
      service: {} as PerfisService,
    });

    const host = fixture.nativeElement as HTMLElement;
    const catReadToggle = host.querySelector(
      '[data-testid="action-toggle-a-cat-read"]',
    ) as HTMLElement;
    const catCreateToggle = host.querySelector(
      '[data-testid="action-toggle-a-cat-create"]',
    ) as HTMLElement;

    expect(catReadToggle.getAttribute('aria-checked')).toBe('true');
    expect(catCreateToggle.getAttribute('aria-checked')).toBe('false');
  });

  it('should toggle all actions of a funcionalidade when clicking the card global toggle', async () => {
    await setupModal({
      mode: 'create',
      initialData: null,
      readOnly: false,
      entityLabel: 'Perfil',
      service: {} as PerfisService,
    });

    const host = fixture.nativeElement as HTMLElement;
    const globalToggleCat = host.querySelector(
      '[data-testid="global-toggle-categorias"]',
    ) as HTMLButtonElement;

    expect(globalToggleCat.getAttribute('aria-checked')).toBe('false');

    // Click global toggle -> should activate both actions in 'categorias'
    globalToggleCat.click();
    fixture.detectChanges();

    expect(globalToggleCat.getAttribute('aria-checked')).toBe('true');
    expect(component.isActionSelected('a-cat-create')).toBe(true);
    expect(component.isActionSelected('a-cat-read')).toBe(true);

    // Click global toggle again -> should deactivate all actions in 'categorias'
    globalToggleCat.click();
    fixture.detectChanges();

    expect(globalToggleCat.getAttribute('aria-checked')).toBe('false');
    expect(component.isActionSelected('a-cat-create')).toBe(false);
    expect(component.isActionSelected('a-cat-read')).toBe(false);
  });

  it('should submit payload with selected acaoIds only when clicking Salvar button', async () => {
    await setupModal({
      mode: 'create',
      initialData: null,
      readOnly: false,
      entityLabel: 'Perfil',
      service: {} as PerfisService,
    });

    const host = fixture.nativeElement as HTMLElement;
    const nomeInput = host.querySelector('[data-testid="perfil-nome-input"]') as HTMLInputElement;
    nomeInput.value = 'Novo Perfil Personalizado';
    nomeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Select one action
    const catReadBtn = host.querySelector('[data-testid="action-toggle-a-cat-read"]') as HTMLButtonElement;
    catReadBtn.click();
    fixture.detectChanges();

    const saveBtn = host.querySelector('[data-testid="perfil-save-btn"]') as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(perfisServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Novo Perfil Personalizado',
        ativo: true,
        acaoIds: ['a-cat-read'],
      }),
    );
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should disable all inputs and toggles and hide Salvar button when opened in readOnly mode (sistema=true)', async () => {
    const adminPerfil: PerfilDto = {
      id: 'p-admin',
      nome: 'Administrador',
      ativo: true,
      sistema: true,
      acaoIds: ['a-cat-create', 'a-cat-read', 'a-usr-create', 'a-usr-read'],
      version: 1,
    };

    await setupModal({
      mode: 'edit',
      initialData: adminPerfil,
      readOnly: true,
      entityLabel: 'Perfil',
      service: {} as PerfisService,
    });

    const host = fixture.nativeElement as HTMLElement;
    const nomeInput = host.querySelector('[data-testid="perfil-nome-input"]') as HTMLInputElement;
    expect(nomeInput.disabled).toBe(true);

    const toggle = host.querySelector('[data-testid="action-toggle-a-cat-read"]') as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);

    const globalToggle = host.querySelector('[data-testid="global-toggle-categorias"]') as HTMLButtonElement;
    expect(globalToggle.disabled).toBe(true);

    const saveBtn = host.querySelector('[data-testid="perfil-save-btn"]');
    expect(saveBtn).toBeNull();
  });
});
