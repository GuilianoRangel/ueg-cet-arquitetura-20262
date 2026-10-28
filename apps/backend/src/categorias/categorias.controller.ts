import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { CategoriasService } from './categorias.service';

const BaseCrudController = createCrudController<
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto
>({
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
});

@ApiBearerAuth('JWT-auth')
@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController extends BaseCrudController {
  constructor(service: CategoriasService) {
    super(service);
  }
}
