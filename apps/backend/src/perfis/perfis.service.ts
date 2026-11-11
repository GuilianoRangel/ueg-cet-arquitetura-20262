import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not, In, IsNull, EntityManager } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { CrudContext } from '../common/crud/crud.types';
import { Perfil } from './entities/perfil.entity';
import { FuncionalidadeAcao } from './entities/funcionalidade-acao.entity';
import { CreatePerfilDto, UpdatePerfilDto } from './dto/perfil.dto';
import { PermissionsService } from '../auth/permissions/permissions.service';
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

    // 2. Acoes validation against active FuncionalidadeAcao
    this.addValidator('create', (ctx) => this.validarAcoesCreate(ctx));
    this.addValidator('update', (ctx) => this.validarAcoesUpdate(ctx));

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

  protected override async syncRelations(
    id: string,
    input: CreatePerfilDto | UpdatePerfilDto,
    ctx: CrudContext<Perfil, CreatePerfilDto | UpdatePerfilDto>,
  ): Promise<void> {
    if (input.acaoIds !== undefined) {
      const perfil = await ctx.manager.findOne(Perfil, {
        where: { id },
        relations: ['acoes'],
      });
      const currentIds = (perfil?.acoes || []).map((a) => a.id);
      await ctx.manager
        .createQueryBuilder()
        .relation(Perfil, 'acoes')
        .of(id)
        .addAndRemove(input.acaoIds, currentIds);
    }
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
        'nome',
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
        'nome',
      );
    }
  }

  private async validarAcoes(
    manager: EntityManager,
    acaoIds?: string[],
  ): Promise<void> {
    if (!acaoIds || acaoIds.length === 0) return;
    const acoes = await manager.getRepository(FuncionalidadeAcao).find({
      where: { id: In(acaoIds), deletedAt: IsNull() },
    });
    const foundIds = new Set(acoes.map((a) => a.id));
    const invalid = acaoIds.filter((id) => !foundIds.has(id));
    if (invalid.length > 0) {
      throw new BusinessException(
        `Ações inválidas: ${invalid.join(', ')}`,
        'PERFIL_ACAO_INVALID',
        HttpStatus.BAD_REQUEST,
        'acaoIds',
      );
    }
  }

  private async validarAcoesCreate(
    ctx: CrudContext<Perfil, CreatePerfilDto>,
  ): Promise<void> {
    await this.validarAcoes(ctx.manager, ctx.input.acaoIds);
  }

  private async validarAcoesUpdate(
    ctx: CrudContext<Perfil, UpdatePerfilDto>,
  ): Promise<void> {
    await this.validarAcoes(ctx.manager, ctx.input.acaoIds);
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
