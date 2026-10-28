import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ADMIN_PERFIL_NOME, SENSITIVE_DATA_ROLE } from '@repo/utils';
import { Perfil } from '../../perfis/entities/perfil.entity';
import { User } from '../../users/entities/user.entity';
import { TransactionRunner } from '../../common/crud/transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { RolesCatalog } from '../../auth/permissions/roles-catalog';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
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

    await this.transactionRunner.runInTransaction(async (manager) => {
      // 1. Perfil "Administrador"
      const perfilRepo = manager.getRepository(Perfil);
      let adminPerfil = await perfilRepo.findOne({
        where: { nome: ADMIN_PERFIL_NOME },
      });

      const catalogRolesWithoutSensitive = RolesCatalog.all().filter(
        (role) => role !== SENSITIVE_DATA_ROLE,
      );

      let rolesUpdated = false;

      if (!adminPerfil) {
        adminPerfil = perfilRepo.create({
          nome: ADMIN_PERFIL_NOME,
          ativo: true,
          sistema: true,
          roles: catalogRolesWithoutSensitive,
          ultimoUsuarioId: null,
        });
        adminPerfil = await perfilRepo.save(adminPerfil);
        rolesUpdated = true;
        this.logger.log(`Perfil "${ADMIN_PERFIL_NOME}" criado com sucesso.`);
      } else {
        const currentRoles = Array.isArray(adminPerfil.roles)
          ? adminPerfil.roles
          : [];
        const currentSorted = [...currentRoles].sort();
        const targetSorted = [...catalogRolesWithoutSensitive].sort();

        const isDifferent =
          currentSorted.length !== targetSorted.length ||
          currentSorted.some((val, idx) => val !== targetSorted[idx]);

        if (isDifferent) {
          adminPerfil.roles = catalogRolesWithoutSensitive;
          await perfilRepo.save(adminPerfil);
          rolesUpdated = true;
          this.logger.log(
            `Roles do perfil "${ADMIN_PERFIL_NOME}" sincronizadas.`,
          );
        }
      }

      if (rolesUpdated) {
        this.permissionsService.invalidateAll();
      }

      // 2. Usuário admin
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
