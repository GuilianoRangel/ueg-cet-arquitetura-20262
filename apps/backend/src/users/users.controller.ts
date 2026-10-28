import {
  Controller,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { User } from './entities/user.entity';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/managed-user.dto';
import { UsersService } from './users.service';
import { Operation } from '../auth/permissions/operation.decorator';
import { RecoveryService } from '../auth/recovery.service';
import { MailerService } from '../mailer/mailer.service';
import { CurrentUser } from '../common/crud/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/crud/crud.types';

const BaseCrudController = createCrudController<
  User,
  CreateManagedUserDto,
  UpdateManagedUserDto
>({
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
});

@ApiBearerAuth('JWT-auth')
@ApiTags('users')
@Controller('users')
export class UsersController extends BaseCrudController {
  constructor(
    private readonly usersService: UsersService,
    private readonly recoveryService: RecoveryService,
    private readonly mailerService: MailerService,
  ) {
    super(usersService);
  }

  @Patch(':id/activate')
  @Operation('users:activate')
  @ApiOperation({
    summary: 'Ativar usuário',
    description:
      'Ativa um usuário cadastrado permitindo o acesso ao sistema. Exige a role "users:activate".',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID do usuário',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuário ativado com sucesso.',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado (exige role "users:activate").',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuário não encontrado.',
  })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.activate(id, actor);
  }

  @Post(':id/reset-password')
  @Operation('users:reset-password')
  @ApiOperation({
    summary: 'Disparar redefinição administrativa de senha',
    description:
      'Gera um token de recuperação e envia por e-mail para o usuário informado. Exige a role "users:reset-password".',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID do usuário',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'E-mail de recuperação disparado com sucesso.',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'E-mail de recuperação de senha enviado com sucesso.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado (exige role "users:reset-password").',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuário não encontrado.',
  })
  async resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    const token = this.recoveryService.generateToken(user.email);
    await this.mailerService.sendPasswordResetEmail(user.email, token);
    return { message: 'E-mail de recuperação de senha enviado com sucesso.' };
  }
}
