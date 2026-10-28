import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { MailerService } from '../mailer/mailer.service';
import { RecoveryService } from './recovery.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mailerService: MailerService,
    private readonly recoveryService: RecoveryService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
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
