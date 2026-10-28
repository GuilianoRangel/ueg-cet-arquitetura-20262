import { EntityManager } from 'typeorm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nome: string;
}

export type CrudOperation =
  | 'create'
  | 'findAll'
  | 'findOne'
  | 'update'
  | 'remove';

export interface CrudContext<E, I> {
  operation: CrudOperation;
  manager: EntityManager;
  user: AuthenticatedUser | null;
  input: I;
  existing: E | null;
  userRoles: ReadonlySet<string>;
  id?: string;
}

export type CrudValidator<E, I> = (
  ctx: CrudContext<E, I>,
) => void | Promise<void>;

export type CrudBeforeHook<E, I> = (
  ctx: CrudContext<E, I>,
) => void | Promise<void>;

export type CrudAfterHook<E, I> = (
  entity: E,
  ctx: CrudContext<E, I>,
) => void | Promise<void>;

export type CrudAfterFindHook<E> = (
  entity: E,
  ctx: CrudContext<E, never>,
) => void | Promise<void>;

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'like'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'between';

export interface FilterRule {
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid';
  operators: FilterOperator[];
}

export type Type<T = unknown> = new (...args: unknown[]) => T;

export interface CrudConfig<E, C extends object, U extends object> {
  resource: string;
  entity: Type<E>;
  createDto: Type<C>;
  updateDto: Type<U>;
  deleteMode?: 'soft' | 'hard';
  relations?: string[];
  relationInputFields?: string[];
  filters?: Record<string, FilterRule>;
  sortable?: string[];
}
