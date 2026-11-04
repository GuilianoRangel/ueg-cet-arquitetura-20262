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
    email: { type: 'string', operators: ['eq', 'like'] },
    nome: { type: 'string', operators: ['eq', 'like'] },
    ativo: { type: 'boolean', operators: ['eq'] },
    createdAt: { type: 'date', operators: ['gte', 'lte', 'between'] },
  },
  sortable: ['email', 'nome', 'ativo', 'createdAt'],
};

export const USER_CRUD_CONFIG = userCrudConfig;
