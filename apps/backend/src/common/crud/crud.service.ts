import { HttpStatus, Logger } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { PageResult, SENSITIVE_DATA_ROLE } from '@repo/utils';
import { BaseEntity } from './base.entity';
import {
  AuthenticatedUser,
  CrudAfterFindHook,
  CrudAfterHook,
  CrudBeforeHook,
  CrudConfig,
  CrudContext,
  CrudOperation,
  CrudValidator,
} from './crud.types';
import { TransactionRunner } from './transaction-runner';
import { PermissionsService } from '../../auth/permissions/permissions.service';
import { MaskService } from './masking/mask.service';
import { getMaskedFields } from './masking/masked.decorator';
import { applyToQueryBuilder, parseCrudQuery } from './crud-query';
import { BusinessException } from '../exceptions/business.exception';
import { ValidationException } from '../exceptions/validation.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CrudDeps {
  constructor(
    public readonly runner: TransactionRunner,
    public readonly permissions: PermissionsService,
    public readonly mask: MaskService,
  ) {}
}

export abstract class CrudService<
  E extends BaseEntity,
  C extends object,
  U extends { version: number },
> {
  protected readonly logger = new Logger(this.constructor.name);

  private readonly validators = new Map<
    CrudOperation,
    CrudValidator<E, unknown>[]
  >();
  private readonly beforeHooks = new Map<
    CrudOperation,
    CrudBeforeHook<E, unknown>[]
  >();
  private readonly afterHooks = new Map<
    CrudOperation,
    CrudAfterHook<E, unknown>[]
  >();
  private readonly afterCommitHooks = new Map<
    CrudOperation,
    ((entity: E, ctx: CrudContext<E, unknown>) => void | Promise<void>)[]
  >();
  private readonly afterFindHooks: CrudAfterFindHook<E>[] = [];

  constructor(
    protected readonly deps: CrudDeps,
    protected readonly config: CrudConfig<E, C, U>,
  ) {}

  public addValidator(op: 'create', fn: CrudValidator<E, C>): this;
  public addValidator(op: 'update', fn: CrudValidator<E, U>): this;
  public addValidator(op: 'remove', fn: CrudValidator<E, never>): this;
  public addValidator(
    op: 'create' | 'update' | 'remove',
    fn: CrudValidator<E, never>,
  ): this {
    const list = this.validators.get(op) || [];
    list.push(fn as CrudValidator<E, unknown>);
    this.validators.set(op, list);
    return this;
  }

  public addBeforeHook(op: 'create', fn: CrudBeforeHook<E, C>): this;
  public addBeforeHook(op: 'update', fn: CrudBeforeHook<E, U>): this;
  public addBeforeHook(op: 'remove', fn: CrudBeforeHook<E, never>): this;
  public addBeforeHook(
    op: 'create' | 'update' | 'remove',
    fn: CrudBeforeHook<E, never>,
  ): this {
    const list = this.beforeHooks.get(op) || [];
    list.push(fn as CrudBeforeHook<E, unknown>);
    this.beforeHooks.set(op, list);
    return this;
  }

  public addAfterHook(op: 'create', fn: CrudAfterHook<E, C>): this;
  public addAfterHook(op: 'update', fn: CrudAfterHook<E, U>): this;
  public addAfterHook(op: 'remove', fn: CrudAfterHook<E, never>): this;
  public addAfterHook(
    op: 'create' | 'update' | 'remove',
    fn: CrudAfterHook<E, never>,
  ): this {
    const list = this.afterHooks.get(op) || [];
    list.push(fn as CrudAfterHook<E, unknown>);
    this.afterHooks.set(op, list);
    return this;
  }

  public addAfterCommitHook(
    op: 'create' | 'update' | 'remove',
    fn: (entity: E, ctx: CrudContext<E, unknown>) => void | Promise<void>,
  ): this {
    const list = this.afterCommitHooks.get(op) || [];
    list.push(fn);
    this.afterCommitHooks.set(op, list);
    return this;
  }

  public addAfterFindHook(fn: CrudAfterFindHook<E>): this {
    this.afterFindHooks.push(fn);
    return this;
  }

  protected async syncRelations(
    _id: string,
    _input: C | U,
    _ctx: CrudContext<E, C | U>,
  ): Promise<void> {}

  protected mapInputToEntity(
    input: C | U,
    _ctx: CrudContext<E, C | U>,
  ): DeepPartial<E> {
    const copy = { ...input } as Record<string, unknown>;
    delete copy.version;

    if (this.config.relationInputFields) {
      for (const field of this.config.relationInputFields) {
        delete copy[field];
      }
    }

    return copy as DeepPartial<E>;
  }

  private async getUserRoles(
    user: AuthenticatedUser | null,
  ): Promise<ReadonlySet<string>> {
    if (!user || !user.id) {
      return new Set<string>();
    }
    return this.deps.permissions.getEffectiveRoles(user.id);
  }

  private checkMaskedInputFields(
    input: object,
    roles: ReadonlySet<string>,
  ): void {
    const masked = getMaskedFields(this.config.entity);
    const raw = input as Record<string, unknown>;

    for (const field of masked) {
      if (raw[field.propertyKey] !== undefined) {
        const requiredRole = field.role || SENSITIVE_DATA_ROLE;
        if (!roles.has(requiredRole)) {
          throw new BusinessException(
            `O campo "${field.propertyKey}" exige a role ${requiredRole}`,
            'FORBIDDEN_SENSITIVE_FIELD',
            HttpStatus.FORBIDDEN,
          );
        }
      }
    }
  }

  public async create(dto: C, user: AuthenticatedUser | null): Promise<E> {
    const userRoles = await this.getUserRoles(user);
    this.checkMaskedInputFields(dto, userRoles);

    let committedEntity!: E;
    let committedCtx!: CrudContext<E, C>;

    await this.deps.runner.runInTransaction(async (manager) => {
      const ctx: CrudContext<E, C> = {
        operation: 'create',
        manager,
        user,
        input: { ...dto },
        existing: null,
        userRoles,
      };

      // 6. Validators
      const validators = this.validators.get('create') || [];
      for (const val of validators) {
        await val(ctx);
      }

      // 7. Before hooks
      const beforeHooks = this.beforeHooks.get('create') || [];
      for (const bh of beforeHooks) {
        await bh(ctx);
      }

      // 8. Persistence
      const partial = this.mapInputToEntity(ctx.input, ctx) as Record<
        string,
        unknown
      >;
      partial.ultimoUsuarioId = user?.id ?? null;

      const entity = manager.create(
        this.config.entity,
        partial as DeepPartial<E>,
      );
      const saved = await manager.save(this.config.entity, entity);

      await this.syncRelations(saved.id, ctx.input, ctx);

      // 9. After hooks
      const afterHooks = this.afterHooks.get('create') || [];
      for (const ah of afterHooks) {
        await ah(saved, ctx);
      }

      // 10. Reload entity
      const reloaded = await manager.findOne(this.config.entity, {
        where: { id: saved.id } as never,
        relations: this.config.relations,
      });

      committedEntity = reloaded as E;
      committedCtx = ctx;
    });

    // 11. AfterCommit hooks
    const afterCommitHooks = this.afterCommitHooks.get('create') || [];
    for (const ach of afterCommitHooks) {
      try {
        await ach(committedEntity, committedCtx);
      } catch (err) {
        this.logger.error(
          `Erro em afterCommitHook (create): ${(err as Error)?.message}`,
          (err as Error)?.stack,
        );
      }
    }

    // 12. Masking
    return this.deps.mask.apply(committedEntity, userRoles);
  }

  public async update(
    id: string,
    dto: U,
    user: AuthenticatedUser | null,
  ): Promise<E> {
    const userRoles = await this.getUserRoles(user);
    this.checkMaskedInputFields(dto, userRoles);

    let committedEntity!: E;
    let committedCtx!: CrudContext<E, U>;

    await this.deps.runner.runInTransaction(async (manager) => {
      // 4. Load existing
      const existing = await manager.findOne(this.config.entity, {
        where: { id } as never,
      });

      if (!existing || existing.deletedAt) {
        throw new BusinessException(
          'Registro não encontrado',
          'RESOURCE_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }

      // 5. Version check
      if (
        dto.version === undefined ||
        dto.version === null ||
        !Number.isInteger(dto.version) ||
        dto.version < 1
      ) {
        throw new ValidationException(
          [
            {
              field: 'version',
              message: 'A versão deve ser um número inteiro maior ou igual a 1',
            },
          ],
          'Dados inválidos',
        );
      }

      if (dto.version !== existing.version) {
        throw new BusinessException(
          'O registro foi alterado por outro usuário. Recarregue e tente novamente.',
          'OPTIMISTIC_LOCK_CONFLICT',
          HttpStatus.CONFLICT,
        );
      }

      const ctx: CrudContext<E, U> = {
        operation: 'update',
        manager,
        user,
        input: { ...dto },
        existing,
        userRoles,
        id,
      };

      // 6. Validators
      const validators = this.validators.get('update') || [];
      for (const val of validators) {
        await val(ctx);
      }

      // 7. Before hooks
      const beforeHooks = this.beforeHooks.get('update') || [];
      for (const bh of beforeHooks) {
        await bh(ctx);
      }

      // 8. Persistence
      const partial = this.mapInputToEntity(ctx.input, ctx) as Record<
        string,
        unknown
      >;
      partial.ultimoUsuarioId = user?.id ?? null;

      const updateResult = await manager.update(
        this.config.entity,
        { id, version: existing.version },
        partial as never,
      );

      if (updateResult.affected === 0) {
        throw new BusinessException(
          'O registro foi alterado por outro usuário. Recarregue e tente novamente.',
          'OPTIMISTIC_LOCK_CONFLICT',
          HttpStatus.CONFLICT,
        );
      }

      await this.syncRelations(id, ctx.input, ctx);

      // 9. After hooks
      const updatedEntity = await manager.findOne(this.config.entity, {
        where: { id } as never,
      });

      const afterHooks = this.afterHooks.get('update') || [];
      for (const ah of afterHooks) {
        await ah(updatedEntity as E, ctx);
      }

      // 10. Reload
      const reloaded = await manager.findOne(this.config.entity, {
        where: { id } as never,
        relations: this.config.relations,
      });

      committedEntity = reloaded as E;
      committedCtx = ctx;
    });

    // 11. AfterCommit hooks
    const afterCommitHooks = this.afterCommitHooks.get('update') || [];
    for (const ach of afterCommitHooks) {
      try {
        await ach(committedEntity, committedCtx);
      } catch (err) {
        this.logger.error(
          `Erro em afterCommitHook (update): ${(err as Error)?.message}`,
          (err as Error)?.stack,
        );
      }
    }

    // 12. Masking
    return this.deps.mask.apply(committedEntity, userRoles);
  }

  public async remove(
    id: string,
    version: number,
    user: AuthenticatedUser | null,
  ): Promise<void> {
    const userRoles = await this.getUserRoles(user);

    if (
      version === undefined ||
      version === null ||
      !Number.isInteger(version) ||
      version < 1
    ) {
      throw new ValidationException(
        [
          {
            field: 'version',
            message: 'A versão deve ser um número inteiro maior ou igual a 1',
          },
        ],
        'Dados inválidos',
      );
    }

    let committedEntity!: E;
    let committedCtx!: CrudContext<E, never>;

    await this.deps.runner.runInTransaction(async (manager) => {
      // 4. Load existing
      const existing = await manager.findOne(this.config.entity, {
        where: { id } as never,
      });

      if (!existing || existing.deletedAt) {
        throw new BusinessException(
          'Registro não encontrado',
          'RESOURCE_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }

      // 5. Version check
      if (version !== existing.version) {
        throw new BusinessException(
          'O registro foi alterado por outro usuário. Recarregue e tente novamente.',
          'OPTIMISTIC_LOCK_CONFLICT',
          HttpStatus.CONFLICT,
        );
      }

      const ctx: CrudContext<E, never> = {
        operation: 'remove',
        manager,
        user,
        input: {} as never,
        existing,
        userRoles,
        id,
      };

      // 6. Validators
      const validators = this.validators.get('remove') || [];
      for (const val of validators) {
        await val(ctx);
      }

      // 7. Before hooks
      const beforeHooks = this.beforeHooks.get('remove') || [];
      for (const bh of beforeHooks) {
        await bh(ctx);
      }

      // 8. Persistence
      if (this.config.deleteMode === 'hard') {
        const deleteResult = await manager.delete(this.config.entity, {
          id,
          version: existing.version,
        });

        if (deleteResult.affected === 0) {
          throw new BusinessException(
            'O registro foi alterado por outro usuário. Recarregue e tente novamente.',
            'OPTIMISTIC_LOCK_CONFLICT',
            HttpStatus.CONFLICT,
          );
        }
      } else {
        const updateResult = await manager.update(
          this.config.entity,
          { id, version: existing.version },
          {
            deletedAt: new Date(),
            ultimoUsuarioId: user?.id ?? null,
          } as never,
        );

        if (updateResult.affected === 0) {
          throw new BusinessException(
            'O registro foi alterado por outro usuário. Recarregue e tente novamente.',
            'OPTIMISTIC_LOCK_CONFLICT',
            HttpStatus.CONFLICT,
          );
        }
      }

      // 9. After hooks
      const afterHooks = this.afterHooks.get('remove') || [];
      for (const ah of afterHooks) {
        await ah(existing, ctx);
      }

      committedEntity = existing;
      committedCtx = ctx;
    });

    // 11. AfterCommit hooks
    const afterCommitHooks = this.afterCommitHooks.get('remove') || [];
    for (const ach of afterCommitHooks) {
      try {
        await ach(committedEntity, committedCtx);
      } catch (err) {
        this.logger.error(
          `Erro em afterCommitHook (remove): ${(err as Error)?.message}`,
          (err as Error)?.stack,
        );
      }
    }
  }

  public async findOne(id: string, user: AuthenticatedUser | null): Promise<E> {
    const userRoles = await this.getUserRoles(user);

    return this.deps.runner.runExclusive(async (manager) => {
      const entity = await manager.findOne(this.config.entity, {
        where: { id } as never,
        relations: this.config.relations,
      });

      if (!entity || entity.deletedAt) {
        throw new BusinessException(
          'Registro não encontrado',
          'RESOURCE_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }

      const ctx: CrudContext<E, never> = {
        operation: 'findOne',
        manager,
        user,
        input: {} as never,
        existing: entity,
        userRoles,
        id,
      };

      for (const hook of this.afterFindHooks) {
        await hook(entity, ctx);
      }

      return this.deps.mask.apply(entity, userRoles);
    });
  }

  public async findAll(
    rawQuery: Record<string, unknown>,
    user: AuthenticatedUser | null,
  ): Promise<PageResult<E>> {
    const userRoles = await this.getUserRoles(user);
    const maskedFields = getMaskedFields(this.config.entity);

    const parsed = parseCrudQuery(
      rawQuery,
      this.config,
      userRoles,
      maskedFields,
    );

    return this.deps.runner.runExclusive(async (manager) => {
      const repo = manager.getRepository(this.config.entity);
      const alias = 'entity';
      const qb = repo.createQueryBuilder(alias);

      if (this.config.relations) {
        for (const rel of this.config.relations) {
          qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
        }
      }

      applyToQueryBuilder(qb, parsed, alias);

      const [items, total] = await qb.getManyAndCount();

      for (const item of items) {
        const ctx: CrudContext<E, never> = {
          operation: 'findAll',
          manager,
          user,
          input: {} as never,
          existing: item,
          userRoles,
        };

        for (const hook of this.afterFindHooks) {
          await hook(item, ctx);
        }
      }

      const maskedItems = this.deps.mask.applyMany(items, userRoles);

      return {
        items: maskedItems,
        total,
        page: parsed.page,
        limit: parsed.limit,
      };
    });
  }
}
