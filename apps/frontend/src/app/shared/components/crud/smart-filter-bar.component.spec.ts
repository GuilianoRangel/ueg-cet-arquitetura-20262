import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { SearchFilterConfigDto } from '@repo/utils';
import { SmartFilterBarComponent } from './smart-filter-bar.component';

describe('SmartFilterBarComponent', () => {
  let fixture: ComponentFixture<SmartFilterBarComponent>;
  let component: SmartFilterBarComponent;
  let httpMock: HttpTestingController;
  let mockConfig: SearchFilterConfigDto;

  beforeEach(async () => {
    mockConfig = {
      resource: 'users',
      fields: [
        {
          field: 'nome',
          label: 'Nome',
          type: 'string',
          controlType: 'text',
          operators: ['eq', 'like'],
          defaultOperator: 'like',
          quickFilter: true,
          placeholder: 'Buscar por nome...',
        },
        {
          field: 'ativo',
          label: 'Status',
          type: 'boolean',
          controlType: 'boolean',
          operators: ['eq'],
          defaultOperator: 'eq',
          quickFilter: true,
          options: [
            { label: 'Ativo', value: true },
            { label: 'Inativo', value: false },
          ],
        },
        {
          field: 'perfilId',
          label: 'Perfil',
          type: 'uuid',
          controlType: 'select',
          operators: ['eq', 'in'],
          defaultOperator: 'eq',
          quickFilter: true,
          optionsEndpoint: '/perfis',
          optionsValueKey: 'id',
          optionsLabelKey: 'nome',
        },
        {
          field: 'subcategoriaId',
          label: 'Subcategoria',
          type: 'uuid',
          controlType: 'master-detail',
          operators: ['eq'],
          defaultOperator: 'eq',
          quickFilter: true,
          masterDetail: {
            parentField: 'categoriaId',
            parentLabel: 'Categoria',
            parentEndpoint: '/categorias',
            parentValueKey: 'id',
            parentLabelKey: 'nome',
            childEndpoint: '/subcategorias',
            parentParamName: 'categoriaId',
            childValueKey: 'id',
            childLabelKey: 'nome',
          },
        },
        {
          field: 'valor',
          label: 'Valor (R$)',
          type: 'number',
          controlType: 'currency',
          operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
          defaultOperator: 'eq',
          quickFilter: false,
        },
      ],
    };

    await TestBed.configureTestingModule({
      imports: [SmartFilterBarComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartFilterBarComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  function initWithConfig(cfg: SearchFilterConfigDto = mockConfig): void {
    fixture.componentRef.setInput('config', cfg);
    fixture.detectChanges();

    const perfisReqs = httpMock.match((r) => r.url.includes('/perfis'));
    for (const req of perfisReqs) {
      req.flush({
        items: [
          { id: 'p-admin', nome: 'Administrador' },
          { id: 'p-op', nome: 'Operador' },
        ],
        total: 2,
        page: 1,
        limit: 100,
      });
    }

    const catReqs = httpMock.match((r) => r.url.includes('/categorias'));
    for (const req of catReqs) {
      req.flush({
        items: [
          { id: 'cat-1', nome: 'Eletrônicos' },
          { id: 'cat-2', nome: 'Móveis' },
        ],
        total: 2,
        page: 1,
        limit: 100,
      });
    }

    fixture.detectChanges();
  }

  it('should render quick filter inputs (text, select/boolean and master-detail) defined in SearchFilterConfigDto', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('[data-testid="quick-filter-nome"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="quick-filter-ativo"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="quick-filter-perfilId"]')).not.toBeNull();
    expect(
      host.querySelector('[data-testid="quick-filter-master-subcategoriaId"]'),
    ).not.toBeNull();
    expect(
      host.querySelector('[data-testid="quick-filter-detail-subcategoriaId"]'),
    ).not.toBeNull();
  });

  it('should load dynamic options from optionsEndpoint for select quick filters', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;
    const perfilSelect = host.querySelector(
      '[data-testid="quick-filter-perfilId"]',
    ) as HTMLSelectElement;

    const optionTexts = Array.from(perfilSelect.options).map((o) =>
      o.textContent?.trim(),
    );
    expect(optionTexts).toContain('Todos');
    expect(optionTexts).toContain('Administrador');
    expect(optionTexts).toContain('Operador');
  });

  it('should handle master-detail cascade: selecting parent loads child options from childEndpoint with parentParamName and resets child value', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;

    const masterSelect = host.querySelector(
      '[data-testid="quick-filter-master-subcategoriaId"]',
    ) as HTMLSelectElement;
    const detailSelect = host.querySelector(
      '[data-testid="quick-filter-detail-subcategoriaId"]',
    ) as HTMLSelectElement;

    // Initially detail select is disabled until parent is selected
    expect(detailSelect.disabled).toBe(true);

    // Select 'cat-1' in master select
    masterSelect.value = 'cat-1';
    masterSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const childReq = httpMock.expectOne(
      (r) =>
        r.url.includes('/subcategorias') &&
        r.params.get('categoriaId') === 'cat-1',
    );
    childReq.flush({
      items: [
        { id: 'sub-1', nome: 'Notebooks' },
        { id: 'sub-2', nome: 'Smartphones' },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
    fixture.detectChanges();

    expect(detailSelect.disabled).toBe(false);
    const detailOptions = Array.from(detailSelect.options).map((o) =>
      o.textContent?.trim(),
    );
    expect(detailOptions).toContain('Notebooks');
    expect(detailOptions).toContain('Smartphones');
  });

  it('should emit combined quick and advanced filters when clicking Buscar', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;
    const filterChangeSpy = vi.fn();
    component.filterChange.subscribe(filterChangeSpy);

    const nomeInput = host.querySelector(
      '[data-testid="quick-filter-nome"]',
    ) as HTMLInputElement;
    nomeInput.value = 'Maria';
    nomeInput.dispatchEvent(new Event('input'));

    const ativoSelect = host.querySelector(
      '[data-testid="quick-filter-ativo"]',
    ) as HTMLSelectElement;
    ativoSelect.value = 'true';
    ativoSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const searchBtn = host.querySelector(
      '[data-testid="smart-filter-search"]',
    ) as HTMLButtonElement;
    searchBtn.click();

    expect(filterChangeSpy).toHaveBeenCalledWith([
      { field: 'nome', operator: 'like', value: 'Maria' },
      { field: 'ativo', operator: 'eq', value: true },
    ]);
  });

  it('should open Advanced Filters panel, allow adding/removing filter rows with field, allowed operators and value (including two inputs for between)', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;
    const filterChangeSpy = vi.fn();
    component.filterChange.subscribe(filterChangeSpy);

    const toggleAdvBtn = host.querySelector(
      '[data-testid="smart-filter-toggle-advanced"]',
    ) as HTMLButtonElement;
    toggleAdvBtn.click();
    fixture.detectChanges();

    const addRuleBtn = host.querySelector(
      '[data-testid="advanced-filter-add"]',
    ) as HTMLButtonElement;
    addRuleBtn.click();
    fixture.detectChanges();

    const fieldSelect = host.querySelector(
      '[data-testid="adv-field-0"]',
    ) as HTMLSelectElement;
    fieldSelect.value = 'valor';
    fieldSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const opSelect = host.querySelector(
      '[data-testid="adv-operator-0"]',
    ) as HTMLSelectElement;
    opSelect.value = 'between';
    opSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const valStartInput = host.querySelector(
      '[data-testid="adv-value-start-0"]',
    ) as HTMLInputElement;
    const valEndInput = host.querySelector(
      '[data-testid="adv-value-end-0"]',
    ) as HTMLInputElement;

    expect(valStartInput).not.toBeNull();
    expect(valEndInput).not.toBeNull();

    valStartInput.value = '10';
    valStartInput.dispatchEvent(new Event('input'));
    valEndInput.value = '50';
    valEndInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const applyBtn = host.querySelector(
      '[data-testid="advanced-filter-apply"]',
    ) as HTMLButtonElement;
    applyBtn.click();

    // Since 'valor' is currency, 10 and 50 in BRL are converted to 1000 and 5000 cents (or numeric values)
    expect(filterChangeSpy).toHaveBeenCalledTimes(1);
    const emitted = filterChangeSpy.mock.calls[0][0] as {
      field: string;
      operator: string;
      value: unknown;
    }[];
    expect(emitted.length).toBe(1);
    expect(emitted[0].field).toBe('valor');
    expect(emitted[0].operator).toBe('between');
    expect(Array.isArray(emitted[0].value)).toBe(true);
  });

  it('should clear all filters and emit empty array when clicking Limpar', () => {
    initWithConfig();
    const host = fixture.nativeElement as HTMLElement;
    const filterChangeSpy = vi.fn();
    component.filterChange.subscribe(filterChangeSpy);

    const nomeInput = host.querySelector(
      '[data-testid="quick-filter-nome"]',
    ) as HTMLInputElement;
    nomeInput.value = 'Teste';
    nomeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const clearBtn = host.querySelector(
      '[data-testid="smart-filter-clear"]',
    ) as HTMLButtonElement;
    clearBtn.click();
    fixture.detectChanges();

    expect(filterChangeSpy).toHaveBeenCalledWith([]);
    expect(nomeInput.value).toBe('');
  });
});
