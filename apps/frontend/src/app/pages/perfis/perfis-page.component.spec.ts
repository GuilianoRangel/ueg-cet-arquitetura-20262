import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/components/ui/toast.service';
import { PerfisService, PerfilDto } from './perfis.service';
import { PerfisPageComponent } from './perfis-page.component';
import { PerfilFormModalComponent } from './perfil-form-modal.component';

describe('PerfisPageComponent', () => {
  let fixture: ComponentFixture<PerfisPageComponent>;
  let component: PerfisPageComponent;
  let perfisServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    syncRoles: ReturnType<typeof vi.fn>;
  };
  let toastServiceMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    perfisServiceMock = {
      getMeta: vi.fn().mockReturnValue(
        of({
          resource: 'perfis',
          filters: { resource: 'perfis', fields: [] },
          createForm: { mode: 'create', fields: [] },
          updateForm: { mode: 'update', fields: [] },
        }),
      ),
      findAll: vi.fn().mockReturnValue(
        of({
          items: [
            {
              id: 'p-1',
              nome: 'ADMIN',
              funcionalidades: ['categorias', 'users'],
              roles: ['users:read', 'users:create'],
              sistema: true,
              ativo: true,
              version: 1,
            },
            {
              id: 'p-2',
              nome: 'CUSTOM',
              funcionalidades: ['categorias'],
              roles: ['categorias:read'],
              sistema: false,
              ativo: true,
              version: 1,
            },
          ],
          total: 2,
          page: 1,
          limit: 10,
        }),
      ),
      syncRoles: vi.fn().mockReturnValue(
        of({
          addedActions: 3,
          removedActions: 1,
          totalActiveActions: 10,
        }),
      ),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [PerfisPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PerfisService, useValue: perfisServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: AuthService,
          useValue: {
            hasRole: vi.fn().mockReturnValue(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfisPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should configure customModalComponent and isRowReadOnly for sistema profiles', () => {
    expect(component.pageConfig.resource).toBe('perfis');
    expect(component.pageConfig.entityLabel).toBe('Perfil');
    expect(component.pageConfig.customModalComponent).toBe(
      PerfilFormModalComponent,
    );

    const sistemaPerfil: PerfilDto = {
      id: 'p-1',
      nome: 'ADMIN',
      sistema: true,
      ativo: true,
    };
    const customPerfil: PerfilDto = {
      id: 'p-2',
      nome: 'CUSTOM',
      sistema: false,
      ativo: true,
    };

    expect(component.pageConfig.isRowReadOnly?.(sistemaPerfil)).toBe(true);
    expect(component.pageConfig.isRowReadOnly?.(customPerfil)).toBe(false);

    expect(component.pageConfig.canDeleteRow?.(sistemaPerfil)).toBe(false);
    expect(component.pageConfig.canDeleteRow?.(customPerfil)).toBe(true);
  });

  it('should configure headerAction for Sincronizar Permissões with permission perfis:sync', () => {
    const headerActions = component.pageConfig.headerActions;
    expect(headerActions).toBeDefined();
    expect(headerActions?.length).toBe(1);

    const syncAction = headerActions?.[0];
    expect(syncAction?.id).toBe('sync-roles');
    expect(syncAction?.permission).toBe('perfis:sync');

    syncAction?.handler();
    expect(perfisServiceMock.syncRoles).toHaveBeenCalledTimes(1);
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      expect.stringContaining('10'),
    );
  });

  it('should display unique funcionalidades badges limited to at most 10 items in table column', () => {
    const col = component.pageConfig.columns.find(
      (c) => c.key === 'funcionalidades',
    );
    expect(col).toBeDefined();
    expect(col?.type).toBe('badges');

    const rowWith15Funcs: PerfilDto = {
      id: 'p-large',
      nome: 'Large',
      ativo: true,
      sistema: false,
      funcionalidades: Array.from({ length: 15 }, (_, i) => `func-${i + 1}`),
    };

    const badges = col?.badgeExtractor ? col.badgeExtractor(rowWith15Funcs) : [];
    expect(badges.length).toBe(10);
    expect(badges[0].label).toBe('func-1');
    expect(badges[9].label).toBe('func-10');
  });
});
