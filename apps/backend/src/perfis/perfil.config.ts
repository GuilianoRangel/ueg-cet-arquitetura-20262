import { CrudConfig } from '../common/crud/crud.types';
import { Perfil } from './entities/perfil.entity';
import { CreatePerfilDto, UpdatePerfilDto } from './dto/perfil.dto';

export const perfilCrudConfig: CrudConfig<
  Perfil,
  CreatePerfilDto,
  UpdatePerfilDto
> = {
  resource: 'perfis',
  entity: Perfil,
  createDto: CreatePerfilDto,
  updateDto: UpdatePerfilDto,
  deleteMode: 'soft',
  sortable: ['nome', 'ativo', 'createdAt'],
  filters: {
    nome: {
      type: 'string',
      label: 'Nome',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: true,
      placeholder: 'Buscar perfil...',
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
  },
};

export const PERFIL_CRUD_CONFIG = perfilCrudConfig;
