import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PerfisService } from './perfis.service';
import { PerfisPageComponent } from './perfis-page.component';

describe('PerfisPageComponent', () => {
  let fixture: ComponentFixture<PerfisPageComponent>;
  let component: PerfisPageComponent;
  let perfisServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
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
              roles: ['users:read', 'users:create'],
              sistema: true,
              ativo: true,
              version: 1,
            },
            {
              id: 'p-2',
              nome: 'CUSTOM',
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
    };

    await TestBed.configureTestingModule({
      imports: [PerfisPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PerfisService, useValue: perfisServiceMock },
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

  it('should configure GenericCrudPageComponent for resource perfis and disable edit/delete when row.sistema is true', () => {
    expect(component.pageConfig.resource).toBe('perfis');
    expect(component.pageConfig.entityLabel).toBe('Perfil');

    const sistemaPerfil = {
      id: 'p-1',
      nome: 'ADMIN',
      roles: ['users:read'],
      sistema: true,
      ativo: true,
      version: 1,
    };
    const customPerfil = {
      id: 'p-2',
      nome: 'CUSTOM',
      roles: ['categorias:read'],
      sistema: false,
      ativo: true,
      version: 1,
    };

    expect(component.pageConfig.canEditRow?.(sistemaPerfil)).toBe(false);
    expect(component.pageConfig.canDeleteRow?.(sistemaPerfil)).toBe(false);
    expect(component.pageConfig.canEditRow?.(customPerfil)).toBe(true);
    expect(component.pageConfig.canDeleteRow?.(customPerfil)).toBe(true);
  });
});
