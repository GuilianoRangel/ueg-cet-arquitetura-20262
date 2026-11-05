import { FilterOperator } from "./pagination";

export type FilterFieldType = "string" | "number" | "boolean" | "date" | "uuid";

export type FilterControlType =
  | "text"
  | "number"
  | "currency"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "master-detail";

export interface FilterOptionItem {
  label: string;
  value: string | number | boolean;
}

export interface MasterDetailFilterConfig {
  /** Nome do campo pai no filtro (ex: 'perfilId') */
  parentField: string;
  /** Label do select pai */
  parentLabel: string;
  /** Endpoint para carregar opções do pai (ex: '/perfis') */
  parentEndpoint: string;
  parentValueKey?: string;
  parentLabelKey?: string;
  /** Endpoint para carregar opções do filho filtradas pelo pai (ex: '/roles?perfilId={parentValue}') */
  childEndpoint: string;
  /** Nome do query param enviado ao childEndpoint com o valor do pai */
  parentParamName: string;
  childValueKey?: string;
  childLabelKey?: string;
}

export interface SmartFilterFieldMeta {
  /** Nome do parâmetro de filtro enviado na query string (ex: 'nome', 'ativo', 'perfilId') */
  field: string;
  /** Rótulo exibido na interface */
  label: string;
  /** Tipo primitivo de dado para coerção e operadores */
  type: FilterFieldType;
  /** Tipo do componente visual */
  controlType: FilterControlType;
  /** Operadores permitidos para este campo nos Filtros Avançados */
  operators: FilterOperator[];
  /** Operador padrão utilizado quando preenchido na barra rápida (ex: 'like' para texto, 'eq' para select) */
  defaultOperator: FilterOperator;
  /** Define se o campo é exibido diretamente na barra inicial do SmartFilterBar */
  quickFilter: boolean;
  /** Placeholder opcional para o controle */
  placeholder?: string;
  /** Opções estáticas para select/boolean */
  options?: FilterOptionItem[];
  /** Endpoint da API para buscar opções dinâmicas (ex: '/perfis') */
  optionsEndpoint?: string;
  optionsValueKey?: string;
  optionsLabelKey?: string;
  /** Configuração para select mestre-detalhe (cascata) */
  masterDetail?: MasterDetailFilterConfig;
  /** Role necessária para visualizar/filtrar por este campo (ex: 'DADOS_SENSIVEIS') */
  requiredRole?: string;
}

export interface SearchFilterConfigDto {
  resource: string;
  fields: SmartFilterFieldMeta[];
}

export type FormInputType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "currency"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "hidden";

export interface FormFieldValidationRule {
  type:
    | "required"
    | "minLength"
    | "maxLength"
    | "min"
    | "max"
    | "email"
    | "int"
    | "uuid";
  value?: number | string | boolean;
  message?: string;
}

export interface CrudFormFieldSchema {
  name: string;
  label: string;
  inputType: FormInputType;
  required: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  description?: string;
  order: number;
  hidden: boolean;
  readOnly: boolean;
  masked?: boolean;
  omitOnSubmit?: boolean;
  requiredRole?: string;
  validations: FormFieldValidationRule[];
  options?: FilterOptionItem[];
  optionsEndpoint?: string;
  optionsValueKey?: string;
  optionsLabelKey?: string;
  entityRelationProperty?: string;
  entityRelationValueKey?: string;
}

export interface CrudFormSchemaDto {
  mode: "create" | "update";
  fields: CrudFormFieldSchema[];
}

export interface CrudResourceMetaDto {
  resource: string;
  filters: SearchFilterConfigDto;
  createForm: CrudFormSchemaDto;
  updateForm: CrudFormSchemaDto;
}

