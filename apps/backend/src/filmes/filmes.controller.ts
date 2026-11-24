import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { FilmesService } from './filmes.service';
import { filmeCrudConfig } from './filme.config';

const BaseCrudController = createCrudController(filmeCrudConfig);

@ApiBearerAuth('JWT-auth')
@ApiTags('filmes')
@Controller('filmes')
export class FilmesController extends BaseCrudController {
  constructor(service: FilmesService) {
    super(service);
  }
}
