import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from './entities/user.entity';
import { RecoveryService } from '../auth/recovery.service';
import { MailerService } from '../mailer/mailer.service';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly recoveryService: RecoveryService,
    private readonly mailerService: MailerService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    this.logger.log('findAll');
    return this.usersService.findAll();
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Post(':id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async resetPassword(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    const token = this.recoveryService.generateToken(user.email);
    await this.mailerService.sendPasswordResetEmail(user.email, token);
    return { message: 'E-mail de recuperação de senha enviado com sucesso.' };
  }
}
