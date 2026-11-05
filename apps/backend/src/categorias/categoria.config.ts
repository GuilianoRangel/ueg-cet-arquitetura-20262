import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { CrudConfig } from '../common/crud/crud.types';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';

export const categoriaCrudConfig: CrudConfig<
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto
> = {
  resource: 'categorias',
  entity: Categoria,
  createDto: CreateCategoriaDto,
  updateDto: UpdateCategoriaDto,
  deleteMode: 'soft',
  sortable: ['nome', 'ativo', 'valor', 'createdAt', 'updatedAt'],
  filters: {
    nome: {
      type: 'string',
      label: 'Nome',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: true,
      placeholder: 'Buscar por nome...',
      operators: ['eq', 'like'],
    },
    ativo: {
      type: 'boolean',
      label: 'Status',
      controlType: 'boolean',
      defaultOperator: 'eq',
      quickFilter: true,
      operators: ['eq'],
    },
    valor: {
      type: 'number',
      label: 'Valor (R$)',
      controlType: 'currency',
      defaultOperator: 'eq',
      quickFilter: false,
      requiredRole: SENSITIVE_DATA_ROLE,
      operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    },
    createdAt: {
      type: 'date',
      label: 'Criado em',
      controlType: 'date',
      defaultOperator: 'gte',
      quickFilter: false,
      operators: ['gte', 'lte', 'between'],
    },
  },
};

export const CATEGORIA_CRUD_CONFIG = categoriaCrudConfig;
