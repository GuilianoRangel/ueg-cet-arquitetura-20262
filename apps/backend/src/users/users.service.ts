import { HttpStatus, Injectable } from '@nestjs/common';
import { In, Not, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ADMIN_PERFIL_NOME } from '@repo/utils';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { User } from './entities/user.entity';
import { Perfil } from '../perfis/entities/perfil.entity';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/managed-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { PermissionsService } from '../auth/permissions/permissions.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { AuthenticatedUser, CrudContext } from '../common/crud/crud.types';

@Injectable()
export class UsersService extends CrudService<
  User,
  CreateManagedUserDto,
  UpdateManagedUserDto
> {
  constructor(
    deps: CrudDeps,
    private readonly permissionsService: PermissionsService,
  ) {
    super(deps, {
      resource: 'users',
      entity: User,
      createDto: CreateManagedUserDto,
      updateDto: UpdateManagedUserDto,
      deleteMode: 'soft',
      relations: ['perfis'],
      relationInputFields: ['perfilIds'],
      filters: {
        email: { type: 'string', operators: ['eq', 'like'] },
        nome: { type: 'string', operators: ['eq', 'like'] },
        ativo: { type: 'boolean', operators: ['eq'] },
        createdAt: { type: 'date', operators: ['gte', 'lte', 'between'] },
      },
      sortable: ['email', 'nome', 'ativo', 'createdAt'],
    });

    // 1. BeforeHook create: hash senha and default ativo=true
    this.addBeforeHook('create', async (ctx) => {
      ctx.input.senha = await bcrypt.hash(ctx.input.senha, 10);
      if (ctx.input.ativo === undefined) {
        ctx.input.ativo = true;
      }
    });

    // 2. Validator: e-mail unique (including soft-deleted)
    this.addValidator('create', async (ctx) => {
      const email = ctx.input.email?.toLowerCase().trim();
      if (!email) return;
      const count = await ctx.manager.getRepository(User).count({
        where: { email },
        withDeleted: true,
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe um usuário com este e-mail',
          'USER_EMAIL_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });

    this.addValidator('update', async (ctx) => {
      const email = ctx.input.email?.toLowerCase().trim();
      if (!email) return;
      const existing = ctx.existing;
      if (existing && existing.email.toLowerCase() === email) {
        return;
      }
      const targetId = existing ? existing.id : ctx.id!;
      const count = await ctx.manager.getRepository(User).count({
        where: { email, id: Not(targetId) },
        withDeleted: true,
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe um usuário com este e-mail',
          'USER_EMAIL_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });

    // 3. Validator: perfilIds must exist, not be soft-deleted, and be active
    const validatePerfis = async (
      manager: EntityManager,
      perfilIds?: string[],
    ) => {
      if (!perfilIds || perfilIds.length === 0) return;
      const perfis = await manager.getRepository(Perfil).find({
        where: { id: In(perfilIds) },
      });
      if (perfis.length !== perfilIds.length) {
        throw new BusinessException(
          'Um ou mais perfis informados são inválidos ou inativos',
          'USER_PERFIL_INVALID',
          HttpStatus.BAD_REQUEST,
        );
      }
      for (const p of perfis) {
        if (!p.ativo) {
          throw new BusinessException(
            'Um ou mais perfis informados são inválidos ou inativos',
            'USER_PERFIL_INVALID',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    };

    this.addValidator('create', async (ctx) => {
      await validatePerfis(ctx.manager, ctx.input.perfilIds);
    });

    this.addValidator('update', async (ctx) => {
      await validatePerfis(ctx.manager, ctx.input.perfilIds);
    });

    // 4. Validator: Last Admin protection
    this.addValidator('remove', async (ctx) => {
      await this.checkLastAdminProtection(ctx.manager, ctx.existing, {
        remove: true,
      });
    });

    this.addValidator('update', async (ctx) => {
      await this.checkLastAdminProtection(ctx.manager, ctx.existing, {
        ativo: ctx.input.ativo,
        perfilIds: ctx.input.perfilIds,
      });
    });

    // 5. AfterCommit: invalidate permissions cache
    this.addAfterCommitHook('create', (entity) => {
      this.permissionsService.invalidate(entity.id);
    });
    this.addAfterCommitHook('update', (entity) => {
      this.permissionsService.invalidate(entity.id);
    });
    this.addAfterCommitHook('remove', (entity) => {
      this.permissionsService.invalidate(entity.id);
    });
  }

  protected override async syncRelations(
    id: string,
    input: CreateManagedUserDto | UpdateManagedUserDto,
    ctx: CrudContext<User, CreateManagedUserDto | UpdateManagedUserDto>,
  ): Promise<void> {
    if (input.perfilIds !== undefined) {
      const user = await ctx.manager.findOne(User, {
        where: { id },
        relations: ['perfis'],
      });
      const currentIds = (user?.perfis || []).map((p) => p.id);
      await ctx.manager
        .createQueryBuilder()
        .relation(User, 'perfis')
        .of(id)
        .addAndRemove(input.perfilIds, currentIds);
    }
  }

  private async checkLastAdminProtection(
    manager: EntityManager,
    existing: User | null,
    change: { remove?: boolean; ativo?: boolean; perfilIds?: string[] },
  ): Promise<void> {
    if (!existing || !existing.ativo) {
      return;
    }

    const adminPerfil = await manager.getRepository(Perfil).findOne({
      where: { nome: ADMIN_PERFIL_NOME, sistema: true },
    });
    if (!adminPerfil) {
      return;
    }

    const userHasAdmin = await manager
      .createQueryBuilder(User, 'u')
      .innerJoin('u.perfis', 'p')
      .where('u.id = :userId', { userId: existing.id })
      .andWhere('p.id = :adminPerfilId', { adminPerfilId: adminPerfil.id })
      .getCount();

    if (userHasAdmin === 0) {
      return;
    }

    const isRemovingUser = change.remove === true;
    const isDeactivating = change.ativo === false;
    const isRemovingAdminPerfil =
      change.perfilIds !== undefined &&
      !change.perfilIds.includes(adminPerfil.id);

    if (!isRemovingUser && !isDeactivating && !isRemovingAdminPerfil) {
      return;
    }

    const activeAdminCount = await manager
      .createQueryBuilder(User, 'u')
      .innerJoin('u.perfis', 'p')
      .where('p.id = :adminPerfilId', { adminPerfilId: adminPerfil.id })
      .andWhere('u.ativo = :ativo', { ativo: true })
      .andWhere('u.deletedAt IS NULL')
      .getCount();

    if (activeAdminCount <= 1) {
      throw new BusinessException(
        'Não é possível inativar ou remover o único administrador ativo do sistema',
        'USER_LAST_ADMIN',
        HttpStatus.CONFLICT,
      );
    }
  }

  async registerSelf(dto: CreateUserDto): Promise<{
    id: string;
    email: string;
    nome: string;
    ativo: boolean;
  }> {
    const email = dto.email.toLowerCase().trim();
    return this.deps.runner.runInTransaction(async (manager) => {
      const existing = await manager.getRepository(User).findOne({
        where: { email },
        withDeleted: true,
      });
      if (existing) {
        throw new BusinessException(
          'E-mail já está em uso',
          'AUTH_EMAIL_EXISTS',
          HttpStatus.BAD_REQUEST,
        );
      }

      const hashedPassword = await bcrypt.hash(dto.senha, 10);
      const user = manager.getRepository(User).create({
        email,
        nome: dto.nome.trim(),
        senha: hashedPassword,
        ativo: false,
        ultimoUsuarioId: null,
      });

      const saved = await manager.getRepository(User).save(user);

      return {
        id: saved.id,
        email: saved.email,
        nome: saved.nome,
        ativo: saved.ativo,
      };
    });
  }

  async activate(id: string, actor?: AuthenticatedUser | null): Promise<User> {
    return this.deps.runner.runInTransaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id },
      });
      if (!user || user.deletedAt) {
        throw new BusinessException(
          'Usuário não encontrado',
          'USER_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }

      user.ativo = true;
      user.ultimoUsuarioId = actor?.id ?? null;
      user.version += 1;

      const saved = await manager.getRepository(User).save(user);
      this.permissionsService.invalidate(id);
      return saved;
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.deps.runner.runExclusive(async (manager) => {
      return manager
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.senha')
        .leftJoinAndSelect('user.perfis', 'perfis')
        .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
        .andWhere('user.deletedAt IS NULL')
        .getOne();
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.deps.runner.runExclusive(async (manager) => {
      return manager
        .getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.perfis', 'perfis')
        .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
        .andWhere('user.deletedAt IS NULL')
        .getOne();
    });
  }

  async findById(id: string): Promise<User> {
    return this.deps.runner.runExclusive(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id },
        relations: ['perfis'],
      });
      if (!user || user.deletedAt) {
        throw new BusinessException(
          'Usuário não encontrado',
          'USER_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }
      return user;
    });
  }

  async updatePassword(id: string, novaSenhaHash: string): Promise<User> {
    return this.deps.runner.runInTransaction(async (manager) => {
      const user = await manager.getRepository(User).findOne({
        where: { id },
      });
      if (!user || user.deletedAt) {
        throw new BusinessException(
          'Usuário não encontrado',
          'USER_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }
      user.senha = novaSenhaHash;
      user.version += 1;
      return manager.getRepository(User).save(user);
    });
  }
}
