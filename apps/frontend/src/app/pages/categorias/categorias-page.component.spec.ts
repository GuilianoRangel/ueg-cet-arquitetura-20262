import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { AuthService } from '../../core/auth/auth.service';
import { CategoriasService } from './categorias.service';
import { CategoriasPageComponent } from './categorias-page.component';

describe('CategoriasPageComponent', () => {
  let fixture: ComponentFixture<CategoriasPageComponent>;
  let component: CategoriasPageComponent;
  let categoriasServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    categoriasServiceMock = {
      getMeta: vi.fn().mockReturnValue(
        of({
          resource: 'categorias',
          filters: { resource: 'categorias', fields: [] },
          createForm: { mode: 'create', fields: [] },
          updateForm: { mode: 'update', fields: [] },
        }),
      ),
      findAll: vi.fn().mockReturnValue(
        of({
          items: [
            {
              id: 'c-1',
              nome: 'Material de Escritório',
              valor: 5000,
              ativo: true,
              createdAt: '2026-01-10T12:00:00.000Z',
              version: 1,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [CategoriasPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: CategoriasService, useValue: categoriasServiceMock },
        {
          provide: AuthService,
          useValue: {
            hasRole: vi.fn().mockReturnValue(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriasPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should configure GenericCrudPageComponent for resource categorias with Nome, Valor, Status and Criado em columns', () => {
    expect(component.pageConfig.resource).toBe('categorias');
    expect(component.pageConfig.entityLabel).toBe('Categoria');
    const labels = component.pageConfig.columns.map((c) => c.label);
    expect(labels).toEqual(['Nome', 'Valor', 'Status', 'Criado em']);

    const valorCol = component.pageConfig.columns.find(
      (c) => c.key === 'valor',
    );
    expect(valorCol?.type).toBe('currency-cents');
    expect(valorCol?.requiredRole).toBe(SENSITIVE_DATA_ROLE);
    expect(valorCol?.maskedSentinel).toBe(99999);
  });
});

