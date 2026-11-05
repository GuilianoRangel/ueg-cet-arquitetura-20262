import { CrudConfig } from '../common/crud/crud.types';
import { User } from './entities/user.entity';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/managed-user.dto';

export const userCrudConfig: CrudConfig<
  User,
  CreateManagedUserDto,
  UpdateManagedUserDto
> = {
  resource: 'users',
  entity: User,
  createDto: CreateManagedUserDto,
  updateDto: UpdateManagedUserDto,
  deleteMode: 'soft',
  relations: ['perfis'],
  relationInputFields: ['perfilIds'],
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
    email: {
      type: 'string',
      label: 'E-mail',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: true,
      placeholder: 'Buscar por e-mail...',
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
    perfilId: {
      type: 'uuid',
      label: 'Perfil',
      controlType: 'select',
      defaultOperator: 'eq',
      quickFilter: true,
      optionsEndpoint: '/perfis',
      optionsValueKey: 'id',
      optionsLabelKey: 'nome',
      relationField: 'perfis.id',
      operators: ['eq', 'in'],
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
  sortable: ['email', 'nome', 'ativo', 'createdAt'],
};

export const USER_CRUD_CONFIG = userCrudConfig;
