import { HttpStatus } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import {
  PAGE_DEFAULT_LIMIT,
  PAGE_MAX_LIMIT,
  SENSITIVE_DATA_ROLE,
} from '@repo/utils';
import { BusinessException } from '../exceptions/business.exception';
import { CrudConfig, FilterOperator, FilterRule } from './crud.types';
import { MaskedFieldMetadata } from './masking/masked.decorator';

export interface ParsedSort {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface ParsedQuery {
  page: number;
  limit: number;
  sort: ParsedSort[];
  filters: ParsedFilter[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function coerceValue(
  type: FilterRule['type'],
  op: FilterOperator,
  rawVal: unknown,
): unknown {
  const str = String(rawVal);

  if (op === 'between') {
    const parts = str.split(',');
    if (
      parts.length !== 2 ||
      parts[0].trim() === '' ||
      parts[1].trim() === ''
    ) {
      throw new BusinessException(
        'Operador "between" exige exatamente dois valores separados por vírgula',
        'QUERY_PARAM_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    return [
      coerceSingleValue(type, parts[0].trim()),
      coerceSingleValue(type, parts[1].trim()),
    ];
  }

  if (op === 'in') {
    const parts = str.split(',').map((p) => p.trim());
    if (parts.length === 0 || parts.some((p) => p === '')) {
      throw new BusinessException(
        'Operador "in" exige lista de valores válidos',
        'QUERY_PARAM_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    return parts.map((p) => coerceSingleValue(type, p));
  }

  return coerceSingleValue(type, str.trim());
}

function coerceSingleValue(
  type: FilterRule['type'],
  val: string,
): string | number | boolean | Date {
  switch (type) {
    case 'number': {
      const num = Number(val);
      if (val === '' || !Number.isFinite(num)) {
        throw new BusinessException(
          `Valor numérico inválido: "${val}"`,
          'QUERY_PARAM_INVALID',
          HttpStatus.BAD_REQUEST,
        );
      }
      return num;
    }
    case 'boolean': {
      if (val === 'true') return true;
      if (val === 'false') return false;
      throw new BusinessException(
        `Valor booleano inválido: "${val}". Deve ser "true" ou "false"`,
        'QUERY_PARAM_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    case 'date': {
      const date = new Date(val);
      if (val === '' || Number.isNaN(date.getTime())) {
        throw new BusinessException(
          `Data inválida: "${val}"`,
          'QUERY_PARAM_INVALID',
          HttpStatus.BAD_REQUEST,
        );
      }
      return date;
    }
    case 'uuid': {
      if (!UUID_REGEX.test(val)) {
        throw new BusinessException(
          `UUID inválido: "${val}"`,
          'QUERY_PARAM_INVALID',
          HttpStatus.BAD_REQUEST,
        );
      }
      return val;
    }
    case 'string':
    default:
      return val;
  }
}

export function parseCrudQuery<
  E extends object,
  C extends object,
  U extends object,
>(
  raw: Record<string, unknown>,
  config: CrudConfig<E, C, U>,
  roles: ReadonlySet<string>,
  maskedFields: MaskedFieldMetadata[],
): ParsedQuery {
  // 1. Page
  let page = 1;
  if (raw.page !== undefined && raw.page !== '') {
    const parsedPage = Number(raw.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new BusinessException(
        'O parâmetro "page" deve ser um inteiro maior ou igual a 1',
        'QUERY_PARAM_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    page = parsedPage;
  }

  // 2. Limit
  let limit = PAGE_DEFAULT_LIMIT;
  if (raw.limit !== undefined && raw.limit !== '') {
    const parsedLimit = Number(raw.limit);
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > PAGE_MAX_LIMIT
    ) {
      throw new BusinessException(
        `O parâmetro "limit" deve ser um inteiro entre 1 e ${PAGE_MAX_LIMIT}`,
        'QUERY_PARAM_INVALID',
        HttpStatus.BAD_REQUEST,
      );
    }
    limit = parsedLimit;
  }

  // 3. Sort
  const sortList: ParsedSort[] = [];
  const rawSort =
    typeof raw.sort === 'string' && raw.sort.trim() !== ''
      ? raw.sort
      : 'createdAt,id';
  const sortItems = rawSort
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const sortableSet = new Set(config.sortable || ['createdAt', 'id']);

  for (const item of sortItems) {
    let field = item;
    let isDesc = false;

    if (item.startsWith('-')) {
      isDesc = true;
      field = item.slice(1);
    } else if (item.startsWith('+')) {
      isDesc = false;
      field = item.slice(1);
    } else if (item.includes(':')) {
      const parts = item.split(':');
      field = parts[0].trim();
      const dir = (parts[1] || '').trim().toUpperCase();
      isDesc = dir === 'DESC';
    }

    // Check if masked
    const masked = maskedFields.find((m) => m.propertyKey === field);
    if (masked) {
      const requiredRole = masked.role || SENSITIVE_DATA_ROLE;
      if (!roles.has(requiredRole)) {
        throw new BusinessException(
          `O campo "${field}" exige a role ${requiredRole}`,
          'FORBIDDEN_SENSITIVE_FIELD',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    if (raw.sort !== undefined && raw.sort !== '') {
      if (!sortableSet.has(field)) {
        throw new BusinessException(
          `Ordenação pelo campo "${field}" não permitida`,
          'QUERY_FIELD_NOT_ALLOWED',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    sortList.push({
      field,
      order: isDesc ? 'DESC' : 'ASC',
    });
  }

  // 4. Filters
  const filters: ParsedFilter[] = [];
  const allowedFilters = config.filters || {};

  for (const key of Object.keys(raw)) {
    if (key === 'page' || key === 'limit' || key === 'sort') {
      continue;
    }

    const value = raw[key];
    if (value === undefined || value === '') {
      continue;
    }

    let field = key;
    let operator: FilterOperator = 'eq';

    if (key.includes('__')) {
      const parts = key.split('__');
      field = parts[0];
      operator = parts[1] as FilterOperator;
    }

    const rule = allowedFilters[field];
    if (!rule) {
      throw new BusinessException(
        `Filtro pelo campo "${field}" não permitido`,
        'QUERY_FIELD_NOT_ALLOWED',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check masked
    const masked = maskedFields.find((m) => m.propertyKey === field);
    if (masked) {
      const requiredRole = masked.role || SENSITIVE_DATA_ROLE;
      if (!roles.has(requiredRole)) {
        throw new BusinessException(
          `O campo "${field}" exige a role ${requiredRole}`,
          'FORBIDDEN_SENSITIVE_FIELD',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    if (!rule.operators.includes(operator)) {
      throw new BusinessException(
        `Operador "${operator}" não permitido para o campo "${field}"`,
        'QUERY_FIELD_NOT_ALLOWED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const coerced = coerceValue(rule.type, operator, value);
    filters.push({
      field,
      operator,
      value: coerced,
    });
  }

  return {
    page,
    limit,
    sort: sortList,
    filters,
  };
}

export function applyToQueryBuilder<E extends object>(
  qb: SelectQueryBuilder<E>,
  parsed: ParsedQuery,
  alias: string,
): SelectQueryBuilder<E> {
  qb.skip((parsed.page - 1) * parsed.limit).take(parsed.limit);

  for (const s of parsed.sort) {
    qb.addOrderBy(`${alias}.${s.field}`, s.order);
  }

  // Exclude soft-deleted
  qb.andWhere(`${alias}.deletedAt IS NULL`);

  parsed.filters.forEach((f, idx) => {
    const param = `p_${idx}`;
    switch (f.operator) {
      case 'eq':
        qb.andWhere(`${alias}.${f.field} = :${param}`, { [param]: f.value });
        break;
      case 'ne':
        qb.andWhere(`${alias}.${f.field} != :${param}`, { [param]: f.value });
        break;
      case 'like':
        qb.andWhere(`LOWER(${alias}.${f.field}) LIKE LOWER(:${param})`, {
          [param]: `%${String(f.value)}%`,
        });
        break;
      case 'gt':
        qb.andWhere(`${alias}.${f.field} > :${param}`, { [param]: f.value });
        break;
      case 'gte':
        qb.andWhere(`${alias}.${f.field} >= :${param}`, { [param]: f.value });
        break;
      case 'lt':
        qb.andWhere(`${alias}.${f.field} < :${param}`, { [param]: f.value });
        break;
      case 'lte':
        qb.andWhere(`${alias}.${f.field} <= :${param}`, { [param]: f.value });
        break;
      case 'in':
        qb.andWhere(`${alias}.${f.field} IN (:...${param})`, {
          [param]: f.value,
        });
        break;
      case 'between': {
        const [minVal, maxVal] = f.value as [unknown, unknown];
        qb.andWhere(
          `${alias}.${f.field} BETWEEN :${param}_min AND :${param}_max`,
          {
            [`${param}_min`]: minVal,
            [`${param}_max`]: maxVal,
          },
        );
        break;
      }
    }
  });

  return qb;
}
