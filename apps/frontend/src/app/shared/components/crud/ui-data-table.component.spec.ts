import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PageResult } from '@repo/utils';
import { AuthService } from '../../../core/auth/auth.service';
import { GenericCrudService } from '../../../core/crud/generic-crud.service';
import { CrudTableDataSource } from './crud-table-data-source';
import { UiDataTableComponent } from './ui-data-table.component';

interface TestRow {
  id: string;
  nome: string;
  valor: number | null;
  ativo: boolean;
  sistema?: boolean;
  version?: number;
}

describe('UiDataTableComponent', () => {
  let fixture: ComponentFixture<UiDataTableComponent<TestRow>>;
  let dataSource: CrudTableDataSource<TestRow>;
  let authServiceMock: {
    hasRole: ReturnType<typeof vi.fn>;
  };
  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let rows: TestRow[];

  beforeEach(async () => {
    rows = [
      { id: '1', nome: 'Categoria A', valor: 15000, ativo: true, sistema: true },
      { id: '2', nome: 'Categoria B', valor: 99999, ativo: false, sistema: false },
    ];

    authServiceMock = {
      hasRole: vi.fn((role: string) =>
        ['categorias:update', 'categorias:delete', 'DADOS_SENSIVEIS'].includes(
          role,
        ),
      ),
    };

    mockService = {
      findAll: vi.fn().mockImplementation(() => {
        const res: PageResult<TestRow> = {
          items: rows,
          total: rows.length,
          page: 1,
          limit: 10,
        };
        return of(res);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [UiDataTableComponent],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(UiDataTableComponent<TestRow>);

    dataSource = new CrudTableDataSource<TestRow>({
      service: mockService as unknown as GenericCrudService<TestRow>,
      columns: [
        { key: 'nome', label: 'Nome', sortable: true },
        {
          key: 'valor',
          label: 'Valor',
          sortable: true,
          type: 'currency-cents',
          requiredRole: 'DADOS_SENSIVEIS',
          maskedSentinel: 99999,
        },
        {
          key: 'ativo',
          label: 'Status',
          sortable: true,
          type: 'boolean',
          booleanLabels: {
            trueLabel: 'Ativa',
            falseLabel: 'Inativa',
            trueVariant: 'success',
            falseVariant: 'secondary',
          },
        },
      ],
      actions: [
        {
          id: 'edit',
          label: 'Editar',
          permission: 'categorias:update',
          disabled: (row) => row.sistema === true,
          handler: vi.fn(),
        },
        {
          id: 'delete',
          label: 'Excluir',
          permission: 'categorias:delete',
          visible: (row) => !row.sistema,
          handler: vi.fn(),
        },
        {
          id: 'secret',
          label: 'Ação Secreta',
          permission: 'permissao:inexistente',
          handler: vi.fn(),
        },
      ],
    });

    dataSource.refresh();
    fixture.componentRef.setInput('dataSource', dataSource);
    fixture.detectChanges();
  });

  it('should render striped rows (zebra pattern) and column headers', () => {
    const host = fixture.nativeElement as HTMLElement;
    const headers = Array.from(host.querySelectorAll('thead th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toContain('Nome');
    expect(headers).toContain('Valor');
    expect(headers).toContain('Status');
    expect(headers).toContain('Operações');

    const bodyRows = host.querySelectorAll('tbody tr');
    expect(bodyRows.length).toBe(2);
    expect(bodyRows[0].className).toContain('odd:bg-background');
    expect(bodyRows[0].className).toContain('even:bg-muted/30');
  });

  it('should trigger single sort on header click and multi-sort on shift+click, showing priority badges (1, 2)', () => {
    const host = fixture.nativeElement as HTMLElement;
    const nomeHeader = host.querySelector(
      '[data-testid="sort-header-nome"]',
    ) as HTMLElement;
    const statusHeader = host.querySelector(
      '[data-testid="sort-header-ativo"]',
    ) as HTMLElement;

    // Single click on 'Nome'
    nomeHeader.dispatchEvent(new MouseEvent('click', { shiftKey: false }));
    fixture.detectChanges();
    expect(dataSource.sorts()).toEqual([{ field: 'nome', direction: 'ASC' }]);

    // Shift + Click on 'Status'
    statusHeader.dispatchEvent(new MouseEvent('click', { shiftKey: true }));
    fixture.detectChanges();
    expect(dataSource.sorts()).toEqual([
      { field: 'nome', direction: 'ASC' },
      { field: 'ativo', direction: 'ASC' },
    ]);

    const priorityBadges = host.querySelectorAll('[data-testid^="sort-priority-"]');
    expect(priorityBadges.length).toBe(2);
    expect(priorityBadges[0].textContent?.trim()).toBe('1');
    expect(priorityBadges[1].textContent?.trim()).toBe('2');
  });

  it('should format boolean columns as badges, currency-cents as BRL (R$) and masked values (99999 or missing role) as restricted badge', () => {
    const host = fixture.nativeElement as HTMLElement;
    const bodyRows = host.querySelectorAll('tbody tr');

    // Row 1: valor = 15000 (R$ 150,00), ativo = true ('Ativa')
    const row1Text = bodyRows[0].textContent ?? '';
    expect(row1Text).toMatch(/R\$\s*150,00/);
    expect(row1Text).toContain('Ativa');

    // Row 2: valor = 99999 (maskedSentinel -> 'R$ •••••'), ativo = false ('Inativa')
    const row2Text = bodyRows[1].textContent ?? '';
    expect(row2Text).toContain('R$ •••••');
    expect(row2Text).toContain('Inativa');
  });

  it('should render row actions respecting permission, visible(row) and disabled(row) predicates', () => {
    const host = fixture.nativeElement as HTMLElement;
    const bodyRows = host.querySelectorAll('tbody tr');

    // Row 1 (sistema: true):
    // - 'edit' is visible but disabled (disabled(row) === true)
    // - 'delete' is hidden (visible(row) === false)
    // - 'secret' is hidden (missing permission)
    const row1EditBtn = bodyRows[0].querySelector(
      '[data-testid="action-edit"]',
    ) as HTMLButtonElement | null;
    const row1DeleteBtn = bodyRows[0].querySelector(
      '[data-testid="action-delete"]',
    ) as HTMLButtonElement | null;
    const row1SecretBtn = bodyRows[0].querySelector(
      '[data-testid="action-secret"]',
    ) as HTMLButtonElement | null;

    expect(row1EditBtn).not.toBeNull();
    expect(row1EditBtn?.disabled).toBe(true);
    expect(row1DeleteBtn).toBeNull();
    expect(row1SecretBtn).toBeNull();

    // Row 2 (sistema: false):
    // - 'edit' is visible and enabled
    // - 'delete' is visible and enabled
    const row2EditBtn = bodyRows[1].querySelector(
      '[data-testid="action-edit"]',
    ) as HTMLButtonElement | null;
    const row2DeleteBtn = bodyRows[1].querySelector(
      '[data-testid="action-delete"]',
    ) as HTMLButtonElement | null;

    expect(row2EditBtn).not.toBeNull();
    expect(row2EditBtn?.disabled).toBe(false);
    expect(row2DeleteBtn).not.toBeNull();
    expect(row2DeleteBtn?.disabled).toBe(false);
  });
});

