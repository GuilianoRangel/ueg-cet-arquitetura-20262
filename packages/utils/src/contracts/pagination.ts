export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const PAGE_DEFAULT_LIMIT = 10;
export const PAGE_MAX_LIMIT = 5000;

export const FILTER_OPERATORS = [
  "eq",
  "ne",
  "like",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "between",
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];
