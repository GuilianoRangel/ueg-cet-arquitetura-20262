import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { PerfisService } from './perfis.service';
import { perfilCrudConfig } from './perfil.config';

const BaseCrudController = createCrudController(perfilCrudConfig);

@ApiBearerAuth('JWT-auth')
@ApiTags('perfis')
@Controller('perfis')
export class PerfisController extends BaseCrudController {
  constructor(service: PerfisService) {
    super(service);
  }
}
