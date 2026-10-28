import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { Perfil } from './entities/perfil.entity';
import { CreatePerfilDto, UpdatePerfilDto } from './dto/perfil.dto';
import { PerfisService } from './perfis.service';

const BaseCrudController = createCrudController<
  Perfil,
  CreatePerfilDto,
  UpdatePerfilDto
>({
  resource: 'perfis',
  entity: Perfil,
  createDto: CreatePerfilDto,
  updateDto: UpdatePerfilDto,
  deleteMode: 'soft',
  sortable: ['nome', 'ativo', 'createdAt'],
  filters: {
    nome: { type: 'string', operators: ['eq', 'like'] },
    ativo: { type: 'boolean', operators: ['eq'] },
  },
});

@ApiBearerAuth('JWT-auth')
@ApiTags('perfis')
@Controller('perfis')
export class PerfisController extends BaseCrudController {
  constructor(service: PerfisService) {
    super(service);
  }
}
