import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { CategoriasService } from './categorias.service';
import { categoriaCrudConfig } from './categoria.config';

const BaseCrudController = createCrudController(categoriaCrudConfig);

@ApiBearerAuth('JWT-auth')
@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController extends BaseCrudController {
  constructor(service: CategoriasService) {
    super(service);
  }
}
