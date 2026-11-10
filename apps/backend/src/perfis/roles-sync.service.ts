import { Injectable, Logger } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ADMIN_PERFIL_NOME, RolesSyncResultDto } from '@repo/utils';
import { TransactionRunner } from '../common/crud/transaction-runner';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { Funcionalidade } from './entities/funcionalidade.entity';
import { FuncionalidadeAcao } from './entities/funcionalidade-acao.entity';
import { Perfil } from './entities/perfil.entity';

@Injectable()
export class RolesSyncService {
  private readonly logger = new Logger(RolesSyncService.name);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly permissionsService: PermissionsService,
  ) {}

  public async sync(): Promise<RolesSyncResultDto> {
    return this.transactionRunner.runInTransaction(async (manager) => {
      const catalogRoles = RolesCatalog.all();
      const catalogSet = new Set(catalogRoles);

      const acaoRepo = manager.getRepository(FuncionalidadeAcao);
      const funcRepo = manager.getRepository(Funcionalidade);
      const perfilRepo = manager.getRepository(Perfil);

      // 1. Identificar e remover ações ativas que não estão mais no catálogo
      const activeAcoes = await acaoRepo.find({
        where: { deletedAt: IsNull() },
        relations: ['funcionalidade'],
      });

      let removedActions = 0;
      for (const acao of activeAcoes) {
        const roleStr = `${acao.funcionalidade?.nome}:${acao.acao}`;
        if (!catalogSet.has(roleStr)) {
          await acaoRepo.softRemove(acao);
          removedActions++;
        }
      }

      // 2. Identificar e remover funcionalidades que ficaram sem nenhuma ação ativa
      const activeFuncs = await funcRepo.find({
        where: { deletedAt: IsNull() },
        relations: ['acoes'],
      });

      for (const func of activeFuncs) {
        const remainingActiveAcoes = (func.acoes || []).filter(
          (a) => a.deletedAt === null,
        );
        if (remainingActiveAcoes.length === 0) {
          await funcRepo.softRemove(func);
        }
      }

      // 3. Garantir que todas as funcionalidades do catálogo existam como ativas
      const catalogFuncNames = new Set(
        catalogRoles.map((role) => role.split(':')[0]),
      );

      const currentActiveFuncs = await funcRepo.find({
        where: { deletedAt: IsNull() },
      });
      const funcMap = new Map<string, Funcionalidade>(
        currentActiveFuncs.map((f) => [f.nome, f]),
      );

      for (const funcNome of catalogFuncNames) {
        if (!funcMap.has(funcNome)) {
          const newFunc = funcRepo.create({ nome: funcNome });
          const savedFunc = await funcRepo.save(newFunc);
          funcMap.set(funcNome, savedFunc);
        }
      }

      // 4. Garantir que cada par (funcionalidade, acao) exista como ativo
      const currentActiveAcoes = await acaoRepo.find({
        where: { deletedAt: IsNull() },
        relations: ['funcionalidade'],
      });
      const activeRoleKeys = new Set(
        currentActiveAcoes.map((a) => `${a.funcionalidade?.nome}:${a.acao}`),
      );

      let addedActions = 0;
      for (const role of catalogRoles) {
        if (!activeRoleKeys.has(role)) {
          const [funcNome, acaoNome] = role.split(':');
          const func = funcMap.get(funcNome);
          if (func) {
            const newAcao = acaoRepo.create({
              funcionalidadeId: func.id,
              acao: acaoNome,
            });
            await acaoRepo.save(newAcao);
            addedActions++;
          }
        }
      }

      // 5. Total de ações ativas após a sincronização
      const allActiveAcoes = await acaoRepo.find({
        where: { deletedAt: IsNull() },
        relations: ['funcionalidade'],
      });
      const totalActiveActions = allActiveAcoes.length;

      // 6. Sincronizar com o perfil Administrador
      let adminPerfil = await perfilRepo.findOne({
        where: { nome: ADMIN_PERFIL_NOME },
        relations: ['acoes', 'acoes.funcionalidade'],
      });

      let perfilUpdated = false;

      if (!adminPerfil) {
        adminPerfil = perfilRepo.create({
          nome: ADMIN_PERFIL_NOME,
          ativo: true,
          sistema: true,
          acoes: allActiveAcoes,
          ultimoUsuarioId: null,
        });
        await perfilRepo.save(adminPerfil);
        perfilUpdated = true;
        this.logger.log(`Perfil "${ADMIN_PERFIL_NOME}" criado com sucesso.`);
      } else {
        const currentAcaoIds = new Set(
          (adminPerfil.acoes || []).map((a) => a.id),
        );
        const targetAcaoIds = new Set(allActiveAcoes.map((a) => a.id));

        const isDifferent =
          currentAcaoIds.size !== targetAcaoIds.size ||
          allActiveAcoes.some((a) => !currentAcaoIds.has(a.id));

        if (isDifferent) {
          adminPerfil.acoes = allActiveAcoes;
          await perfilRepo.save(adminPerfil);
          perfilUpdated = true;
          this.logger.log(
            `Roles do perfil "${ADMIN_PERFIL_NOME}" sincronizadas.`,
          );
        }
      }

      if (addedActions > 0 || removedActions > 0 || perfilUpdated) {
        this.permissionsService.invalidateAll();
      }

      return {
        addedActions,
        removedActions,
        totalActiveActions,
      };
    });
  }
}
