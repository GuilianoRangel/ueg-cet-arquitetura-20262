import { Injectable } from '@nestjs/common';
import {
  FilterControlType,
  FilterOperator,
  SearchFilterConfigDto,
  SENSITIVE_DATA_ROLE,
  SmartFilterFieldMeta,
} from '@repo/utils';
import { CrudConfig, FilterRule } from '../crud.types';
import { MaskedFieldMetadata } from '../masking/masked.decorator';

export interface ISmartFilterConfigProvider {
  getSearchFilterConfig(userRoles: ReadonlySet<string>): SearchFilterConfigDto;
}

function humanizeFieldLabel(field: string): string {
  if (!field) return '';
  return field.charAt(0).toUpperCase() + field.slice(1);
}

function resolveControlType(rule: FilterRule): FilterControlType {
  if (rule.controlType) {
    return rule.controlType;
  }
  if (rule.masterDetail) {
    return 'master-detail';
  }
  if (rule.optionsEndpoint || rule.options) {
    return 'select';
  }
  switch (rule.type) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'uuid':
    case 'string':
    default:
      return 'text';
  }
}

function resolveDefaultOperator(rule: FilterRule): FilterOperator {
  if (rule.defaultOperator) {
    return rule.defaultOperator;
  }
  if (rule.operators.includes('like')) {
    return 'like';
  }
  return rule.operators[0] ?? 'eq';
}

export function buildSearchFilterConfig<
  E extends object,
  C extends object,
  U extends object,
>(
  config: CrudConfig<E, C, U>,
  userRoles: ReadonlySet<string>,
  maskedFields: MaskedFieldMetadata[],
): SearchFilterConfigDto {
  const filters = config.filters || {};
  const fields: SmartFilterFieldMeta[] = [];

  for (const [fieldKey, rule] of Object.entries(filters)) {
    const masked = maskedFields.find((m) => m.propertyKey === fieldKey);
    const requiredRole =
      rule.requiredRole ||
      (masked ? masked.role || SENSITIVE_DATA_ROLE : undefined);

    if (requiredRole && !userRoles.has(requiredRole)) {
      continue;
    }

    const controlType = resolveControlType(rule);
    const defaultOperator = resolveDefaultOperator(rule);
    const defaultBooleanOptions =
      rule.type === 'boolean' && !rule.options
        ? [
            { label: 'Ativo', value: true },
            { label: 'Inativo', value: false },
          ]
        : rule.options;

    const fieldMeta: SmartFilterFieldMeta = {
      field: fieldKey,
      label: rule.label || humanizeFieldLabel(fieldKey),
      type: rule.type,
      controlType,
      operators: [...rule.operators],
      defaultOperator,
      quickFilter: rule.quickFilter ?? false,
      ...(rule.placeholder ? { placeholder: rule.placeholder } : {}),
      ...(defaultBooleanOptions ? { options: defaultBooleanOptions } : {}),
      ...(rule.optionsEndpoint
        ? { optionsEndpoint: rule.optionsEndpoint }
        : {}),
      ...(rule.optionsValueKey
        ? { optionsValueKey: rule.optionsValueKey }
        : {}),
      ...(rule.optionsLabelKey
        ? { optionsLabelKey: rule.optionsLabelKey }
        : {}),
      ...(rule.masterDetail ? { masterDetail: rule.masterDetail } : {}),
      ...(requiredRole ? { requiredRole } : {}),
    };

    fields.push(fieldMeta);
  }

  return {
    resource: config.resource,
    fields,
  };
}

@Injectable()
export class SmartFilterMetadataService {
  public buildFromCrudConfig<
    E extends object,
    C extends object,
    U extends object,
  >(
    config: CrudConfig<E, C, U>,
    userRoles: ReadonlySet<string>,
    maskedFields: MaskedFieldMetadata[],
  ): SearchFilterConfigDto {
    return buildSearchFilterConfig(config, userRoles, maskedFields);
  }
}
