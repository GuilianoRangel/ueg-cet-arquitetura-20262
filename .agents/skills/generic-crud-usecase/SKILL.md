---
name: generic-crud-usecase
description: Criação e evolução de casos de uso (módulos) no backend NestJS utilizando a arquitetura de CRUD Genérico (CrudService, createCrudController, CrudConfig, hooks e validadores com métodos dedicados, DTOs, entidades TypeORM e OpenAPI/Swagger). Utilize esta skill sempre que for criar um novo módulo/entidade CRUD ou refatorar controllers/services existentes para o padrão de CRUD genérico.
---

# Generic CRUD Use Case Skill

Esta skill orienta o desenvolvimento e a padronização de casos de uso (módulos) no backend NestJS utilizando a infraestrutura centralizada de **CRUD Genérico** do projeto (`CrudService`, `createCrudController` e `CrudConfig`).

---

## 🎯 Princípios Fundamentais

1. **Configuração Única (`<entidade>.config.ts`)**: O `CrudConfig` deve ser declarado em um arquivo próprio e compartilhado de forma idêntica entre o `Service` e o `Controller`.
2. **Hooks e Validadores como Métodos Nomeados (Mandatório)**:
   - Todo hook ou validador (`addValidator`, `addBeforeHook`, `addAfterHook`, `addAfterCommitHook`) **DEVE** ser implementado em um método privado dedicado com nome semântico que descreva sua ação e ciclo de vida.
   - O construtor deve apenas delegar para o método privado:
     ```typescript
     this.addValidator('create', (ctx) => this.validarEmailUnicoCreate(ctx));
     ```
   - **Proibido**: Funções anônimas ou lógicas complexas inline no construtor.
3. **Tratamento Padronizado de Exceções**: Violações de negócio devem sempre lançar `BusinessException` com código semântico em `UPPER_SNAKE_CASE` e status HTTP apropriado.
4. **Concorrência Otimista**: Toda entidade herda `BaseEntity` com controle automático por coluna `version`. O `UpdateDto` exige `version: number`.
5. **Auditoria e Soft-Delete**: Entidades usam soft-delete por padrão (`deleteMode: 'soft'`) e gravam o autor da alteração no campo `ultimoUsuarioId`.
6. **OpenAPI / Swagger**: Todas as rotas geradas ou customizadas e propriedades de DTOs devem ser anotadas com decorators Swagger (`@ApiProperty`, `@ApiOperation`, `@ApiResponse`, etc.).

---

## 📁 Estrutura de Arquivos Padronizada

```
apps/backend/src/<recurso>/
├── dto/
│   ├── <entidade>.dto.ts        # DTOs de entrada e saída (ou create/update DTOs)
├── entities/
│   └── <entidade>.entity.ts     # Entidade TypeORM estendendo BaseEntity
├── <entidade>.config.ts         # Configuração única do CRUD (CrudConfig)
├── <recurso>.service.ts         # Service estendendo CrudService com hooks nomeados
├── <recurso>.controller.ts      # Controller estendendo createCrudController
├── <recurso>.module.ts          # Módulo NestJS
└── <recurso>.service.spec.ts    # Testes unitários do caso de uso
```

---

## 📖 Estudo de Caso de Referência: Módulo de Usuários (`users`)

O módulo `users` é o caso de uso canônico do repositório para demonstrar relacionamentos, validações de negócio, hashing seguro, proteção de perfis e hooks de ciclo de vida.

### 1. Entidade: [apps/backend/src/users/entities/user.entity.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/users/entities/user.entity.ts)

A entidade herda de `BaseEntity` (que já provê `id: UUID`, `version`, `createdAt`, `updatedAt`, `deletedAt` e `ultimoUsuarioId`):

```typescript
import { Column, Entity, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({ description: 'Nome completo do usuário', example: 'Maria Souza' })
  @Column({ length: 150 })
  nome: string;

  @ApiProperty({ description: 'E-mail institucional', example: 'maria@ueg.br' })
  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ select: false })
  senha: string;

  @ApiProperty({ description: 'Indica se o usuário está ativo no sistema' })
  @Column({ default: true })
  ativo: boolean;

  @ApiProperty({ description: 'Perfis atribuídos ao usuário', type: () => [Perfil] })
  @ManyToMany(() => Perfil, (perfil) => perfil.users, { cascade: false })
  @JoinTable({
    name: 'users_perfis',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
  })
  perfis: Perfil[];
}
```

### 2. DTOs: [apps/backend/src/users/dto/managed-user.dto.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/users/dto/managed-user.dto.ts)

- **Criação (`CreateManagedUserDto`)**: define regras via `class-validator`.
- **Atualização (`UpdateManagedUserDto`)**: usa `PartialType`, mas exige obrigatoriamente `@IsInt() version: number` para o lock otimista.

```typescript
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateManagedUserDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'joao@ueg.br' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @ApiPropertyOptional({ type: [String], example: ['uuid-perfil'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  perfilIds?: string[];
}

export class UpdateManagedUserDto extends PartialType(CreateManagedUserDto) {
  @ApiProperty({ description: 'Versão do registro para concorrência otimista', example: 1 })
  @IsInt()
  @IsNotEmpty()
  version: number;
}
```

### 3. Configuração do CRUD: [apps/backend/src/users/user.config.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/users/user.config.ts)

Centraliza metadados, soft-delete, relacionamentos e colunas expostas para filtro e ordenação:

```typescript
import { CrudConfig } from '../common/crud/crud.types';
import { User } from './entities/user.entity';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/managed-user.dto';

export const userCrudConfig: CrudConfig<
  User,
  CreateManagedUserDto,
  UpdateManagedUserDto
> = {
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
};

export const USER_CRUD_CONFIG = userCrudConfig;
```

### 4. Service: [apps/backend/src/users/users.service.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/users/users.service.ts)

Observe a estrutura limpa: o construtor apenas registra hooks delegando para métodos privados nomeados.

```typescript
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
import { PermissionsService } from '../auth/permissions/permissions.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { CrudContext } from '../common/crud/crud.types';
import { userCrudConfig } from './user.config';

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
    super(deps, userCrudConfig);

    // 1. BeforeHook: hashing de senha e default ativo
    this.addBeforeHook('create', (ctx) => this.prepararDadosCriacao(ctx));

    // 2. Validators: unicidade de email
    this.addValidator('create', (ctx) => this.validarEmailUnicoCreate(ctx));
    this.addValidator('update', (ctx) => this.validarEmailUnicoUpdate(ctx));

    // 3. Validators: validação de perfis ativos
    this.addValidator('create', (ctx) => this.validarPerfisCreate(ctx));
    this.addValidator('update', (ctx) => this.validarPerfisUpdate(ctx));

    // 4. Validators: proteção contra exclusão/inativação do último admin
    this.addValidator('remove', (ctx) =>
      this.validarProtecaoUltimoAdminRemove(ctx),
    );
    this.addValidator('update', (ctx) =>
      this.validarProtecaoUltimoAdminUpdate(ctx),
    );

    // 5. AfterCommit: invalidação do cache de permissões
    this.addAfterCommitHook('create', (entity) =>
      this.invalidarCachePermissoesUsuario(entity),
    );
    this.addAfterCommitHook('update', (entity) =>
      this.invalidarCachePermissoesUsuario(entity),
    );
    this.addAfterCommitHook('remove', (entity) =>
      this.invalidarCachePermissoesUsuario(entity),
    );
  }

  // --- MÉTODOS PRIVADOS NOMEADOS DE HOOKS E VALIDAÇÕES ---

  private async prepararDadosCriacao(
    ctx: CrudContext<User, CreateManagedUserDto>,
  ): Promise<void> {
    ctx.input.senha = await bcrypt.hash(ctx.input.senha, 10);
    if (ctx.input.ativo === undefined) {
      ctx.input.ativo = true;
    }
  }

  private async validarEmailUnicoCreate(
    ctx: CrudContext<User, CreateManagedUserDto>,
  ): Promise<void> {
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
  }

  private async validarEmailUnicoUpdate(
    ctx: CrudContext<User, UpdateManagedUserDto>,
  ): Promise<void> {
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
  }

  private async validarPerfis(
    manager: EntityManager,
    perfilIds?: string[],
  ): Promise<void> {
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
  }

  private async validarPerfisCreate(
    ctx: CrudContext<User, CreateManagedUserDto>,
  ): Promise<void> {
    await this.validarPerfis(ctx.manager, ctx.input.perfilIds);
  }

  private async validarPerfisUpdate(
    ctx: CrudContext<User, UpdateManagedUserDto>,
  ): Promise<void> {
    await this.validarPerfis(ctx.manager, ctx.input.perfilIds);
  }

  private async validarProtecaoUltimoAdminRemove(
    ctx: CrudContext<User, unknown>,
  ): Promise<void> {
    await this.checkLastAdminProtection(ctx.manager, ctx.existing, {
      remove: true,
    });
  }

  private async validarProtecaoUltimoAdminUpdate(
    ctx: CrudContext<User, UpdateManagedUserDto>,
  ): Promise<void> {
    await this.checkLastAdminProtection(ctx.manager, ctx.existing, {
      ativo: ctx.input.ativo,
      perfilIds: ctx.input.perfilIds,
    });
  }

  private invalidarCachePermissoesUsuario(entity: User): void {
    this.permissionsService.invalidate(entity.id);
  }

  // --- SINCRONIZAÇÃO DE RELACIONAMENTOS ---
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

  // ... outros métodos de regra específica (ex: checkLastAdminProtection, activate)
}
```

### 5. Controller: [apps/backend/src/users/users.controller.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/users/users.controller.ts)

O controller instancia o `BaseCrudController` a partir do `userCrudConfig`. Rotas adicionais utilizam `@Operation` e decorators Swagger:

```typescript
import {
  Controller,
  Patch,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createCrudController } from '../common/crud/create-crud-controller';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { userCrudConfig } from './user.config';
import { Operation } from '../auth/permissions/operation.decorator';
import { CurrentUser } from '../common/crud/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/crud/crud.types';

const BaseCrudController = createCrudController(userCrudConfig);

@ApiBearerAuth('JWT-auth')
@ApiTags('users')
@Controller('users')
export class UsersController extends BaseCrudController {
  constructor(private readonly usersService: UsersService) {
    super(usersService);
  }

  @Patch(':id/activate')
  @Operation('users:activate')
  @ApiOperation({
    summary: 'Ativar usuário',
    description: 'Ativa um usuário cadastrado permitindo o acesso ao sistema.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'UUID do usuário' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Usuário ativado com sucesso.', type: User })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<User> {
    return this.usersService.activate(id, actor);
  }
}
```

---

## 🛠️ Passo a Passo para Criar um Novo Caso de Uso

### Passo 1: Modelar a Entidade
- Crie `src/<recurso>/entities/<entidade>.entity.ts`.
- Estenda `BaseEntity` de `../common/crud/base.entity`.
- Decore campos com `@ApiProperty()` e decorators TypeORM.

### Passo 2: Definir DTOs
- Crie `src/<recurso>/dto/<entidade>.dto.ts`.
- Crie `Create<Entidade>Dto` com validações (`class-validator`).
- Crie `Update<Entidade>Dto extends PartialType(Create<Entidade>Dto)` com campo obrigatório:
  ```typescript
  @ApiProperty({ description: 'Versão para concorrência otimista', example: 1 })
  @IsInt()
  @IsNotEmpty()
  version: number;
  ```

### Passo 3: Criar `<entidade>.config.ts`
- Exporte `<entidade>CrudConfig: CrudConfig<Entidade, CreateDto, UpdateDto>`.
- Configure `resource`, `entity`, `createDto`, `updateDto`, `deleteMode` (`'soft'`), `sortable` e `filters`.

### Passo 4: Implementar o Service
- Crie `src/<recurso>/<recurso>.service.ts` estendendo `CrudService<Entidade, CreateDto, UpdateDto>`.
- Passe `super(deps, <entidade>CrudConfig)`.
- Adicione hooks registrando **apenas** métodos privados nomeados (`validar...`, `preparar...`, `apos...`).
- Sobrescreva `syncRelations` se houver relacionamentos muitos-para-muitos.

### Passo 5: Implementar o Controller
- Crie `src/<recurso>/<recurso>.controller.ts`.
- Instancie `BaseCrudController = createCrudController(<entidade>CrudConfig)`.
- Adicione decorators `@ApiBearerAuth('JWT-auth')`, `@ApiTags('<recurso>')`, `@Controller('<recurso>')`.
- Adicione rotas customizadas se necessário decoradas com `@Operation('<recurso>:<acao>')`.

### Passo 6: Registrar no Module e AppModule
- Crie `src/<recurso>/<recurso>.module.ts` importando `TypeOrmModule.forFeature([Entidade])`.
- Registre o módulo em `app.module.ts`.

### Passo 7: Criar a Migration TypeORM
- Gere e aplique a migration versionada:
  ```bash
  export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && export PNPM_HOME="/home/guiliano/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH"
  pnpm --filter backend migration:generate src/database/migrations/<NomeDaMigration>
  pnpm --filter backend migration:run
  ```

### Passo 8: Escrever Testes Unitários (TDD)
- Crie `src/<recurso>/<recurso>.service.spec.ts`.
- Cubra:
  - Criação de entidade e validação da versão inicial (1).
  - Validações de hooks (ex: unicidade, erros de negócio lançando `BusinessException`).
  - Concorrência otimista (conflito ao enviar versão desatualizada).
  - Soft-delete e reuso de valores únicos após soft-delete (se aplicável).
  - Mascaramento de dados e restrições de roles (se aplicável).

---

## ✅ Checklist de Conformidade

Antes de concluir qualquer caso de uso, valide os seguintes pontos:

- [ ] A configuração está em arquivo separado `<entidade>.config.ts` e é reutilizada no controller e service.
- [ ] Nenhum hook no service possui lógica de validação em função inline anônima; todos utilizam métodos privados nomeados.
- [ ] Erros de validação e negócio disparam `BusinessException` com código em `UPPER_SNAKE_CASE`.
- [ ] DTO de atualização exige `@IsInt() version: number`.
- [ ] Não há uso do tipo `any` em nenhuma tipagem.
- [ ] DTOs e endpoints possuem anotações OpenAPI/Swagger.
- [ ] Testes unitários cobrem 100% dos hooks e fluxos de sucesso e erro.
- [ ] `pnpm --filter backend typecheck` e `pnpm --filter backend lint` rodam sem erros.

