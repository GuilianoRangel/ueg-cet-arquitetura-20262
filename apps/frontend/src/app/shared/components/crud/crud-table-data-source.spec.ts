import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PageResult } from '@repo/utils';
import {
  CrudQueryState,
  GenericCrudService,
} from '../../../core/crud/generic-crud.service';
import { CrudTableDataSource } from './crud-table-data-source';

interface MockItem {
  id: string;
  nome: string;
  ativo: boolean;
  version?: number;
}

describe('CrudTableDataSource', () => {
  let mockService: {
    findAll: ReturnType<typeof vi.fn>;
  };
  let dataSource: CrudTableDataSource<MockItem>;

  beforeEach(() => {
    mockService = {
      findAll: vi.fn().mockImplementation((state: Partial<CrudQueryState>) => {
        const result: PageResult<MockItem> = {
          items: [
            { id: '1', nome: 'Item 1', ativo: true },
            { id: '2', nome: 'Item 2', ativo: false },
          ],
          total: 42,
          page: state.page ?? 1,
          limit: state.limit ?? 10,
        };
        return of(result);
      }),
    };

    dataSource = new CrudTableDataSource<MockItem>({
      service: mockService as unknown as GenericCrudService<MockItem>,
      columns: [
        { key: 'nome', label: 'Nome', sortable: true },
        { key: 'ativo', label: 'Ativo', sortable: true, type: 'boolean' },
      ],
    });
  });

  it('single click toggleSort should cycle ASC -> DESC -> none and replace previous sort', () => {
    // 1st click on 'nome': ASC
    dataSource.toggleSort('nome', false);
    expect(dataSource.sorts()).toEqual([{ field: 'nome', direction: 'ASC' }]);

    // 2nd click on 'nome': DESC
    dataSource.toggleSort('nome', false);
    expect(dataSource.sorts()).toEqual([{ field: 'nome', direction: 'DESC' }]);

    // 3rd click on 'nome': clears sort
    dataSource.toggleSort('nome', false);
    expect(dataSource.sorts()).toEqual([]);

    // Clicking 'nome' (ASC), then single clicking 'ativo' replaces 'nome' with 'ativo:ASC'
    dataSource.toggleSort('nome', false);
    dataSource.toggleSort('ativo', false);
    expect(dataSource.sorts()).toEqual([{ field: 'ativo', direction: 'ASC' }]);
  });

  it('shift+click toggleSort (multiSort=true) should append second column to sorts array and cycle its state independently', () => {
    dataSource.toggleSort('nome', false);
    expect(dataSource.sorts()).toEqual([{ field: 'nome', direction: 'ASC' }]);

    // Shift+Click on 'ativo' appends to sorts
    dataSource.toggleSort('ativo', true);
    expect(dataSource.sorts()).toEqual([
      { field: 'nome', direction: 'ASC' },
      { field: 'ativo', direction: 'ASC' },
    ]);

    // Shift+Click on 'ativo' again toggles 'ativo' to DESC while keeping 'nome:ASC'
    dataSource.toggleSort('ativo', true);
    expect(dataSource.sorts()).toEqual([
      { field: 'nome', direction: 'ASC' },
      { field: 'ativo', direction: 'DESC' },
    ]);

    // Shift+Click on 'ativo' a 3rd time removes 'ativo' while keeping 'nome:ASC'
    dataSource.toggleSort('ativo', true);
    expect(dataSource.sorts()).toEqual([{ field: 'nome', direction: 'ASC' }]);
  });

  it('setPage, setPageSize and setFilters should trigger refresh and update items and total signals', () => {
    dataSource.setPage(3);
    expect(dataSource.page()).toBe(3);
    expect(dataSource.items().length).toBe(2);
    expect(dataSource.total()).toBe(42);
    expect(mockService.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 3, limit: 10 }),
    );

    // Changing page size resets page to 1
    dataSource.setPageSize(25);
    expect(dataSource.page()).toBe(1);
    expect(dataSource.limit()).toBe(25);
    expect(mockService.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, limit: 25 }),
    );

    // Setting filters resets page to 1
    dataSource.setPage(2);
    dataSource.setFilters([{ field: 'nome', operator: 'like', value: 'Item' }]);
    expect(dataSource.page()).toBe(1);
    expect(dataSource.filters()).toEqual([
      { field: 'nome', operator: 'like', value: 'Item' },
    ]);
    expect(mockService.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        filters: [{ field: 'nome', operator: 'like', value: 'Item' }],
      }),
    );
  });
});
