import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { CrudContext } from '../common/crud/crud.types';
import { Perfil } from './entities/perfil.entity';
import { CreatePerfilDto, UpdatePerfilDto } from './dto/perfil.dto';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { RolesCatalog } from '../auth/permissions/roles-catalog';
import { BusinessException } from '../common/exceptions/business.exception';
import { User } from '../users/entities/user.entity';
import { perfilCrudConfig } from './perfil.config';

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
    super(deps, perfilCrudConfig);

    // 1. Unique nome among non-deleted (case-insensitive)
    this.addValidator('create', (ctx) => this.validarNomeUnicoCreate(ctx));
    this.addValidator('update', (ctx) => this.validarNomeUnicoUpdate(ctx));

    // 2. Roles validation against RolesCatalog
    this.addValidator('create', (ctx) => this.validarRolesCreate(ctx));
    this.addValidator('update', (ctx) => this.validarRolesUpdate(ctx));

    // 3. Sistema protegido for update and remove
    this.addValidator('update', (ctx) =>
      this.validarPerfilSistemaNaoAlteravel(ctx),
    );
    this.addValidator('remove', (ctx) =>
      this.validarPerfilSistemaNaoExcluivel(ctx),
    );

    // 4. In use check on remove: cannot remove if linked to non-deleted users
    this.addValidator('remove', (ctx) => this.validarPerfilNaoEmUso(ctx));

    // 5. Invalidate permissions cache on afterCommit
    this.addAfterCommitHook('create', () => this.invalidarCachePermissoes());
    this.addAfterCommitHook('update', () => this.invalidarCachePermissoes());
    this.addAfterCommitHook('remove', () => this.invalidarCachePermissoes());
  }

  private async validarNomeUnicoCreate(
    ctx: CrudContext<Perfil, CreatePerfilDto>,
  ): Promise<void> {
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
  }

  private async validarNomeUnicoUpdate(
    ctx: CrudContext<Perfil, UpdatePerfilDto>,
  ): Promise<void> {
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
  }

  private validarRoles(roles?: string[]): void {
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
  }

  private validarRolesCreate(ctx: CrudContext<Perfil, CreatePerfilDto>): void {
    this.validarRoles(ctx.input.roles);
  }

  private validarRolesUpdate(ctx: CrudContext<Perfil, UpdatePerfilDto>): void {
    this.validarRoles(ctx.input.roles);
  }

  private validarPerfilSistemaNaoAlteravel(
    ctx: CrudContext<Perfil, UpdatePerfilDto>,
  ): void {
    if (ctx.existing?.sistema) {
      throw new BusinessException(
        'Perfis de sistema não podem ser alterados',
        'PERFIL_SISTEMA_PROTEGIDO',
        HttpStatus.CONFLICT,
      );
    }
  }

  private validarPerfilSistemaNaoExcluivel(
    ctx: CrudContext<Perfil, unknown>,
  ): void {
    if (ctx.existing?.sistema) {
      throw new BusinessException(
        'Perfis de sistema não podem ser excluídos',
        'PERFIL_SISTEMA_PROTEGIDO',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async validarPerfilNaoEmUso(
    ctx: CrudContext<Perfil, unknown>,
  ): Promise<void> {
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
  }

  private invalidarCachePermissoes(): void {
    this.permissionsService.invalidateAll();
  }
}
