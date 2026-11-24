import { FILME_GENEROS } from '@repo/utils';
import { CrudConfig } from '../common/crud/crud.types';
import { Filme } from './entities/filme.entity';
import { CreateFilmeDto, UpdateFilmeDto } from './dto/filme.dto';

export const filmeCrudConfig: CrudConfig<
  Filme,
  CreateFilmeDto,
  UpdateFilmeDto
> = {
  resource: 'filmes',
  entity: Filme,
  createDto: CreateFilmeDto,
  updateDto: UpdateFilmeDto,
  deleteMode: 'soft',
  relations: ['categorias'],
  relationInputFields: ['categoriaIds'],
  sortable: [
    'titulo',
    'ano',
    'diretor',
    'duracao',
    'ativo',
    'createdAt',
    'updatedAt',
  ],
  filters: {
    titulo: {
      type: 'string',
      label: 'Título',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: true,
      operators: ['eq', 'like'],
    },
    categoriaId: {
      type: 'uuid',
      label: 'Categoria',
      controlType: 'select',
      optionsEndpoint: '/categorias',
      optionsValueKey: 'id',
      optionsLabelKey: 'nome',
      relationField: 'categorias.id',
      defaultOperator: 'eq',
      quickFilter: true,
      operators: ['eq', 'in'],
    },
    generos: {
      type: 'string',
      label: 'Gênero',
      controlType: 'select',
      options: FILME_GENEROS.map((g) => ({ label: g, value: g })),
      defaultOperator: 'like',
      quickFilter: true,
      operators: ['like', 'eq'],
    },
    ano: {
      type: 'number',
      label: 'Ano',
      controlType: 'number',
      defaultOperator: 'eq',
      quickFilter: false,
      operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
    },
    diretor: {
      type: 'string',
      label: 'Diretor',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: false,
      operators: ['eq', 'like'],
    },
    duracao: {
      type: 'number',
      label: 'Duração (min)',
      controlType: 'number',
      defaultOperator: 'gte',
      quickFilter: false,
      operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
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

export const FILME_CRUD_CONFIG = filmeCrudConfig;
