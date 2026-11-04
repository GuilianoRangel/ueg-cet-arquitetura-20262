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
    nome: { type: 'string', operators: ['eq', 'like'] },
    ativo: { type: 'boolean', operators: ['eq'] },
    valor: {
      type: 'number',
      operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    },
    createdAt: { type: 'date', operators: ['gte', 'lte', 'between'] },
  },
};

export const CATEGORIA_CRUD_CONFIG = categoriaCrudConfig;
