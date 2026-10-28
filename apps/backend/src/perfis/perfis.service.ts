import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { Perfil } from './entities/perfil.entity';
import { CreatePerfilDto, UpdatePerfilDto } from './dto/perfil.dto';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { BusinessException } from '../common/exceptions/business.exception';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PerfisService extends CrudService<
  Perfil,
  CreatePerfilDto,
  UpdatePerfilDto
> {
  constructor(
    deps: CrudDeps,
    private readonly permissionsService: PermissionsService,
  ) {
    super(deps, {
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

    // 1. Unique nome among non-deleted (case-insensitive)
    this.addValidator('create', async (ctx) => {
      const nome = ctx.input.nome?.trim();
      if (!nome) return;
      const count = await ctx.manager.getRepository(Perfil).count({
        where: {
          nome: Raw((alias) => `LOWER(${alias}) = LOWER(:nome)`, { nome }),
        },
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe um perfil com este nome',
          'PERFIL_NOME_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });

    this.addValidator('update', async (ctx) => {
      const nome = ctx.input.nome?.trim();
      if (!nome) return;
      const existing = ctx.existing;
      if (existing && existing.nome.toLowerCase() === nome.toLowerCase()) {
        return;
      }
      const targetId = existing ? existing.id : ctx.id!;
      const count = await ctx.manager.getRepository(Perfil).count({
        where: {
          nome: Raw((alias) => `LOWER(${alias}) = LOWER(:nome)`, { nome }),
          id: Not(targetId),
        },
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe um perfil com este nome',
          'PERFIL_NOME_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });

    // 2. Roles validation against RolesCatalog
    const validateRoles = (roles?: string[]) => {
      if (!roles) return;
      const catalog = new Set(RolesCatalog.all());
      const invalid = roles.filter((r) => !catalog.has(r));
      if (invalid.length > 0) {
        throw new BusinessException(
          `Roles inválidas: ${invalid.join(', ')}`,
          'PERFIL_ROLE_INVALID',
          HttpStatus.BAD_REQUEST,
        );
      }
    };

    this.addValidator('create', (ctx) => {
      validateRoles(ctx.input.roles);
    });

    this.addValidator('update', (ctx) => {
      validateRoles(ctx.input.roles);
    });

    // 3. Sistema protegido for update and remove
    this.addValidator('update', (ctx) => {
      if (ctx.existing?.sistema) {
        throw new BusinessException(
          'Perfis de sistema não podem ser alterados',
          'PERFIL_SISTEMA_PROTEGIDO',
          HttpStatus.CONFLICT,
        );
      }
    });

    this.addValidator('remove', (ctx) => {
      if (ctx.existing?.sistema) {
        throw new BusinessException(
          'Perfis de sistema não podem ser excluídos',
          'PERFIL_SISTEMA_PROTEGIDO',
          HttpStatus.CONFLICT,
        );
      }
    });

    // 4. In use check on remove: cannot remove if linked to non-deleted users
    this.addValidator('remove', async (ctx) => {
      const userCount = await ctx.manager
        .createQueryBuilder(User, 'u')
        .innerJoin('u.perfis', 'p')
        .where('p.id = :perfilId', { perfilId: ctx.id })
        .andWhere('u.deletedAt IS NULL')
        .getCount();

      if (userCount > 0) {
        throw new BusinessException(
          'Perfil está em uso por usuários ativos no sistema',
          'PERFIL_IN_USE',
          HttpStatus.CONFLICT,
        );
      }
    });

    // 5. Invalidate permissions cache on afterCommit
    this.addAfterCommitHook('create', () => {
      this.permissionsService.invalidateAll();
    });
    this.addAfterCommitHook('update', () => {
      this.permissionsService.invalidateAll();
    });
    this.addAfterCommitHook('remove', () => {
      this.permissionsService.invalidateAll();
    });
  }
}
