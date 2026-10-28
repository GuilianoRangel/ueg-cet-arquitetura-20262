import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Body,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { MailerService } from '../mailer/mailer.service';
import { RecoveryService } from './recovery.service';
import { PermissionsService } from './permissions/permissions.service';
import { CurrentUser } from '../common/crud/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/crud/crud.types';
import { BusinessException } from '../common/exceptions/business.exception';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly recoveryService: RecoveryService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Auto-cadastro de usuário',
    description:
      'Registra um novo usuário com status inativo aguardando aprovação do administrador.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuário cadastrado com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'E-mail já cadastrado (AUTH_EMAIL_EXISTS) ou dados inválidos (VALIDATION_ERROR).',
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.registerSelf(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar permissões do usuário logado',
    description:
      'Retorna as roles efetivas e ordenadas obtidas através dos perfis atribuídos.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de roles retornada com sucesso.',
    schema: {
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['categorias:read', 'users:read'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido.',
  })
  async getMyRoles(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ roles: string[] }> {
    const rolesSet = await this.permissionsService.getEffectiveRoles(user.id);
    return { roles: Array.from(rolesSet).sort() };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Autenticação de usuário',
    description:
      'Valida e-mail e senha e retorna o token JWT para acesso autenticado.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Autenticação realizada com sucesso.',
    schema: {
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Credenciais inválidas (AUTH_INVALID_CREDENTIALS) ou usuário inativo (AUTH_USER_INACTIVE).',
  })
  async login(@Request() req: express.Request) {
    if (!req.user) {
      throw new BusinessException(
        'Usuário não autenticado',
        'AUTH_UNAUTHORIZED',
      );
    }
    return this.authService.login(req.user as Omit<User, 'senha'>);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Solicitação de recuperação de senha',
    description:
      'Dispara e-mail com token temporário para redefinição de senha.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'usuario@ueg.br',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mensagem genérica confirmando o processamento do pedido.',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Se o e-mail existir, um link de recuperação será enviado.',
        },
      },
    },
  })
  async forgotPassword(@Body('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    // Generic response for security
    if (user) {
      const token = this.recoveryService.generateToken(email);
      await this.mailerService.sendPasswordResetEmail(email, token);
    }
    return {
      message: 'Se o e-mail existir, um link de recuperação será enviado.',
    };
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Redefinição de senha com token',
    description:
      'Atualiza a senha do usuário utilizando o token recebido por e-mail.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Senha atualizada com sucesso.',
    schema: {
      properties: {
        message: {
          type: 'string',
          example: 'Senha redefinida com sucesso.',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Token inválido ou expirado (AUTH_INVALID_TOKEN).',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    const email = this.recoveryService.validateToken(token);
    if (!email) {
      throw new BusinessException(
        'Token inválido ou expirado',
        'AUTH_INVALID_TOKEN',
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (user) {
      const hash = await bcrypt.hash(newPassword, 10);
      await this.usersService.updatePassword(user.id, hash);
      this.recoveryService.deleteToken(token);
    }
    return { message: 'Senha redefinida com sucesso.' };
  }
}
