import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ADMIN_PERFIL_NOME } from '@repo/utils';
import { Perfil } from '../../perfis/entities/perfil.entity';
import { User } from '../../users/entities/user.entity';
import { TransactionRunner } from '../../common/crud/transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { RolesSyncService } from '../../perfis/roles-sync.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly rolesSyncService: RolesSyncService,
    private readonly transactionRunner: TransactionRunner,
    private readonly permissionsService: PermissionsService,
    private readonly configService: ConfigService,
  ) {}

  public async onApplicationBootstrap(): Promise<void> {
    await this.seed();
  }

  public async seed(): Promise<void> {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    let adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminPassword) {
      if (nodeEnv === 'production') {
        throw new Error('ADMIN_PASSWORD é obrigatória em ambiente de produção');
      }
      adminPassword = 'admin123';
    }

    const adminEmail =
      this.configService.get<string>('ADMIN_EMAIL') || 'admin@ueg.br';

    // 1. Sincronizar catálogo de roles com o banco e perfil Administrador
    await this.rolesSyncService.sync();

    // 2. Garantir usuário administrador vinculado ao perfil
    await this.transactionRunner.runInTransaction(async (manager) => {
      const perfilRepo = manager.getRepository(Perfil);
      const adminPerfil = await perfilRepo.findOne({
        where: { nome: ADMIN_PERFIL_NOME },
      });

      if (!adminPerfil) {
        throw new Error(
          `Perfil "${ADMIN_PERFIL_NOME}" não encontrado após sincronização de roles.`,
        );
      }

      const userRepo = manager.getRepository(User);
      const existingUser = await userRepo.findOne({
        where: { email: adminEmail },
      });

      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const newAdmin = userRepo.create({
          email: adminEmail,
          nome: 'Administrador',
          senha: hashedPassword,
          ativo: true,
          perfis: [adminPerfil],
          ultimoUsuarioId: null,
        });

        await userRepo.save(newAdmin);
        this.logger.log(`Usuário admin (${adminEmail}) criado com sucesso.`);
      }
    });
  }
}
