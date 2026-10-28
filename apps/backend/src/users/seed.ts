import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UsersService } from './users.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit(): Promise<void> {
    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const adminEmail = 'admin@ueg.br';
    const adminNome = 'Administrador';
    const adminSenha = 'admin123';

    const admin = await this.usersService.createAdmin(
      adminEmail,
      adminNome,
      adminSenha,
    );

    const isNew = admin.createdAt.getTime() === admin.updatedAt.getTime();

    if (isNew) {
      this.logger.log(
        `Usuário admin criado com sucesso (${adminEmail}). Altere a senha padrão!`,
      );
    } else {
      this.logger.debug(
        `Usuário admin já existe (${adminEmail}). Seed ignorado.`,
      );
    }
  }
}
