---
name: generic-crud-usecase
description: Criação e evolução de casos de uso (módulos) ponta a ponta (Backend NestJS e Frontend Angular) utilizando a arquitetura de CRUD Genérico (CrudService, createCrudController, CrudConfig, relações aninhadas, relationInputFields, serialização toJSON, RolesCatalog/RolesSyncService, GenericCrudPageComponent, headerActions, customModalComponent e modo readOnly). Utilize esta skill sempre que for criar um novo módulo/entidade CRUD ou refatorar controllers, services e telas existentes para o padrão de CRUD genérico.
---

# Generic CRUD Use Case Skill

Esta skill orienta o desenvolvimento e a padronização de casos de uso (módulos) no **backend NestJS** e **frontend Angular** utilizando a infraestrutura centralizada de **CRUD Genérico** do projeto (`CrudService`, `createCrudController`, `CrudConfig`, `GenericCrudService` e `GenericCrudPageComponent`).

---

## 🎯 Princípios Fundamentais

1. **Configuração Única (`<entidade>.config.ts`)**: O `CrudConfig` deve ser declarado em um arquivo próprio e compartilhado de forma idêntica entre o `Service` e o `Controller`.
2. **Hooks e Validadores como Métodos Nomeados (Mandatório)**:
   - Todo hook ou validador (`addValidator`, `addBeforeHook`, `addAfterHook`, `addAfterCommitHook`, `addAfterFindHook`) **DEVE** ser implementado em um método privado dedicado com nome semântico que descreva sua ação e ciclo de vida.
   - O construtor deve apenas delegar para o método privado:
     ```typescript
     this.addValidator('create', (ctx) => this.validarEmailUnicoCreate(ctx));
     ```
   - **Proibido**: Funções anônimas com lógica complexa inline no construtor.
3. **Tratamento Padronizado de Exceções (4º parâmetro `field`)**:
   - Violações de negócio devem sempre lançar `BusinessException` com código semântico em `UPPER_SNAKE_CASE` e status HTTP apropriado.
   - Quando o erro estiver associado a um campo de formulário específico, informe o nome do campo no **4º parâmetro** (`new BusinessException(msg, code, status, 'nomeDoCampo')`), permitindo que o `FormErrorHandlerService` no frontend vincule o erro diretamente ao controle do formulário.
4. **Concorrência Otimista e `createUpdateDto`**:
   - Toda entidade herda `BaseEntity` com controle automático por coluna `version`.
   - O `UpdateDto` deve ser gerado com `createUpdateDto(CreateDto)` (que preserva metadados `@FormFieldMeta` e adiciona `@IsInt() version!: number`).
5. **Desacoplamento de Relações (`relationInputFields` + `syncRelations` Genérico)**:
   - Campos de DTO que recebem arrays de IDs de relacionamento (ex: `perfilIds`, `acaoIds`, `categoriaIds`) e **não são colunas escalares** da tabela **DEVEM** ser declarados em `relationInputFields` no `CrudConfig` e anotados com `@FormFieldMeta({ entityRelationProperty: '<nomeRelacao>' })`.
   - O `CrudService` base já implementa `syncRelations` **automaticamente por reflexão** via metadados do TypeORM (`many-to-many`), desde que a entidade relacionada estenda `BaseEntity`. Só sobrescreva `syncRelations` manualmente em casos especiais (ex.: tabelas pivô com colunas extras além das chaves).
6. **Serialização de Getters em Entidades (`toJSON()`)**:
   - Getters TypeScript (`get acaoIds()`, `get funcionalidades()`, `get roles()`) ficam no `prototype` da classe e **não são serializados** pelo `JSON.stringify` padrão do Express/NestJS.
   - Sempre que uma entidade possuir getters que precisam ser enviados na resposta JSON da API, implemente `toJSON()` na entidade expondo explicitamente essas propriedades.
7. **Padrão de Permissões (`RolesCatalog` e `RolesSyncService`)**:
   - Todas as roles seguem estritamente o formato `<funcionalidade>:<acao>` em kebab-case minúsculo (`ROLE_FORMAT`) ou `global:<acao>` (ex: `SENSITIVE_DATA_ROLE = 'global:dados-sensiveis'`).
   - Operações customizadas em controllers usam `@Operation('<recurso>:<acao>')` para registro automático no `RolesCatalog` e sincronização com as tabelas `funcionalidades` e `funcionalidades_acoes`.
8. **Auditoria, Soft-Delete e Índices Únicos Parciais**:
   - Entidades usam soft-delete por padrão (`deleteMode: 'soft'`) e gravam o autor da alteração em `ultimoUsuarioId`.
   - Índices de unicidade em entidades com soft-delete devem usar índices parciais (`where: '"deletedAt" IS NULL'`).

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

  // A sincronização N:N de `perfilIds` -> `perfis` é herdada automaticamente do `CrudService`
  // via `relationInputFields` + `@FormFieldMeta({ entityRelationProperty: 'perfis' })`.

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

## 📖 Estudo de Caso Avançado: Módulo de Perfis (`perfis`) — Relações Aninhadas, `toJSON()` e Modal Customizado

O módulo `perfis` demonstra como lidar com **relações muitos-para-muitos aninhadas** (`Perfil` → `FuncionalidadeAcao` → `Funcionalidade`), **getters computados serializados para JSON**, **sincronização de catálogo de permissões** e **customização avançada da tela genérica no frontend**.

### 1. Entidade com Getters e `toJSON()`: [apps/backend/src/perfis/entities/perfil.entity.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/perfis/entities/perfil.entity.ts)

> ⚠️ **Regra Crítica de Serialização**: Em TypeScript/JavaScript, getters declarados na classe (`get acaoIds()`, `get funcionalidades()`, `get roles()`) ficam no `prototype` e **não** são propriedades próprias enumeráveis (*enumerable own properties*). Sem o método `toJSON()`, o `JSON.stringify` do Express/NestJS omite esses campos na resposta HTTP.

```typescript
@Entity('perfis')
@Index('IDX_perfis_nome_ativo', ['nome'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Perfil extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'boolean', default: false })
  sistema!: boolean;

  @ManyToMany(() => FuncionalidadeAcao, { eager: false })
  @JoinTable({
    name: 'perfis_funcionalidades_acoes',
    joinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'funcionalidade_acao_id',
      referencedColumnName: 'id',
    },
  })
  acoes!: FuncionalidadeAcao[];

  get acaoIds(): string[] {
    return Array.isArray(this.acoes) ? this.acoes.map((a) => a.id) : [];
  }

  get funcionalidades(): string[] {
    if (!Array.isArray(this.acoes)) return [];
    const nomes = new Set<string>();
    for (const a of this.acoes) {
      if (a.funcionalidade?.nome) {
        nomes.add(a.funcionalidade.nome);
      }
    }
    return Array.from(nomes).sort();
  }

  get roles(): string[] {
    if (!Array.isArray(this.acoes)) return [];
    const list: string[] = [];
    for (const a of this.acoes) {
      if (a.funcionalidade?.nome && a.acao) {
        list.push(`${a.funcionalidade.nome}:${a.acao}`);
      }
    }
    return list.sort();
  }

  // Obrigatório para que JSON.stringify inclua os getters na resposta HTTP
  toJSON(): Record<string, unknown> {
    return Object.assign({}, this, {
      acaoIds: this.acaoIds,
      funcionalidades: this.funcionalidades,
      roles: this.roles,
    }) as unknown as Record<string, unknown>;
  }
}
```

### 2. Configuração com Relações Aninhadas e `relationInputFields`: [apps/backend/src/perfis/perfil.config.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/backend/src/perfis/perfil.config.ts)

- `relations: ['acoes', 'acoes.funcionalidade']`: Carrega a relação direta e a sub-relação tanto no `findOne` quanto no `findAll` (o `CrudService` encadeia automaticamente os `leftJoinAndSelect` por nível de caminho no `QueryBuilder`).
- `relationInputFields: ['acaoIds']`: Impede que o `CrudService` tente atribuir `acaoIds` diretamente como coluna escalar no `update` (evitando `Property 'acaoIds' was not found in 'Perfil'`), delegando a persistência para o método `syncRelations`.

```typescript
export const perfilCrudConfig: CrudConfig<
  Perfil,
  CreatePerfilDto,
  UpdatePerfilDto
> = {
  resource: 'perfis',
  entity: Perfil,
  createDto: CreatePerfilDto,
  updateDto: UpdatePerfilDto,
  deleteMode: 'soft',
  sortable: ['nome', 'ativo', 'createdAt'],
  relations: ['acoes', 'acoes.funcionalidade'],
  relationInputFields: ['acaoIds'],
  filters: {
    nome: {
      type: 'string',
      label: 'Nome',
      controlType: 'text',
      defaultOperator: 'like',
      quickFilter: true,
      placeholder: 'Buscar perfil...',
      operators: ['eq', 'like'],
    },
    ativo: {
      type: 'boolean',
      label: 'Status',
      controlType: 'boolean',
      defaultOperator: 'eq',
      quickFilter: true,
      operators: ['eq'],
    },
  },
};
```

---

## 🖥️ Integração com o Frontend (`GenericCrudPageComponent` e Extensões)

No frontend Angular (`apps/frontend`), as páginas CRUD utilizam o `GenericCrudPageComponent` configurado via `CrudPageConfig<E>`:

### 1. Propriedades de Configuração (`CrudPageConfig<E>`)

| Propriedade | Tipo | Quando usar |
| :--- | :--- | :--- |
| `title` / `subtitle` | `string` | Título e subtítulo do cabeçalho da página. |
| `resource` | `string` | Nome do recurso (usado para verificar permissões `<resource>:create`, `<resource>:update`, `<resource>:delete`). |
| `entityLabel` | `string` | Rótulo singular da entidade (ex: `'Perfil'`, `'Categoria'`). |
| `service` | `GenericCrudService<E>` | Serviço HTTP do recurso estendendo `GenericCrudService`. |
| `columns` | `TableColumnDef<E>[]` | Definição das colunas da tabela (`text`, `boolean`, `badge`, `badge-list`, `date`). |
| `extraActions` | `CrudRowAction<E>[]` | Ações adicionais por linha na coluna de ações (ex: "Aprovar", "Redefinir Senha"). |
| `headerActions` | `CrudHeaderAction[]` | Botões globais no cabeçalho ao lado do botão de criação, com suporte a `permission`, `loading: () => boolean` e `handler`. |
| `customModalComponent` | `Type<unknown>` | Substitui o formulário dinâmico padrão por um componente modal customizado para criação/edição/visualização. |
| `isRowReadOnly` | `(row: E) => boolean` | Quando retorna `true` (ex: `row.sistema`), mantém o botão Editar visível, mas abre o modal em modo somente leitura (`readOnly: true`). |
| `canDeleteRow` | `(row: E) => boolean` | Controla se o botão Excluir pode ser acionado para a linha (ex: `(row) => !row.sistema`). |

### 2. Exemplo de Página com `headerActions`, `customModalComponent` e `isRowReadOnly`: [apps/frontend/src/app/pages/perfis/perfis-page.component.ts](file:///home/guiliano/workspace/ueg-arquitetura-20262/apps/frontend/src/app/pages/perfis/perfis-page.component.ts)

```typescript
readonly pageConfig: CrudPageConfig<PerfilDto> = {
  title: 'Gestão de Perfis',
  subtitle: 'Gerencie os perfis de acesso e suas funcionalidades vinculadas.',
  entityLabel: 'Perfil',
  resource: 'perfis',
  service: this.perfisService,
  customModalComponent: PerfilFormModalComponent,
  isRowReadOnly: (row) => row.sistema,
  canDeleteRow: (row) => !row.sistema,
  headerActions: [
    {
      id: 'sync-roles',
      label: 'Sincronizar Permissões',
      variant: 'outline',
      permission: 'perfis:sync',
      loading: () => this.syncing(),
      handler: () => this.onSyncRoles(),
    },
  ],
  columns: [
    { key: 'nome', label: 'Nome do Perfil', sortable: true, type: 'text' },
    {
      key: 'funcionalidades',
      label: 'Funcionalidades',
      type: 'badge-list',
      badgeVariant: 'secondary',
      formatter: (_val, row) => (row.funcionalidades ?? []).slice(0, 10),
    },
    { key: 'sistema', label: 'Tipo', type: 'badge' },
    { key: 'ativo', label: 'Status', sortable: true, type: 'boolean' },
  ],
};
```

### 3. Boas Práticas em Modais Customizados (`customModalComponent`)

Ao criar um componente para `customModalComponent` (ex: `PerfilFormModalComponent`):
- Injete os dados do modal via `readonly data = inject<ModalData>(UI_DIALOG_DATA)` e a referência via `inject(UiCdkDialogRef)`.
- Para inicializar IDs de relacionamentos em modo de edição, faça leitura resiliente aceitando tanto o array de IDs (`initialData?.acaoIds`) quanto o array de entidades relacionais (`initialData?.acoes?.map(a => a.id)`):
  ```typescript
  readonly selectedAcaoIds = signal<Set<string>>(
    new Set<string>(
      this.data.initialData?.acaoIds ??
        (this.data.initialData?.acoes ?? []).map((a: { id: string }) => a.id),
    ),
  );
  ```
- Quando `this.data.readOnly` for `true`, desabilite todos os controles de edição e oculte o botão de salvar.

---

## ⚠️ Armadilhas Comuns e Como Evitá-las (Gotchas)

1. **`Property '<campoId>' was not found in '<Entidade>'` ao atualizar**:
   - **Causa**: O DTO possui um campo de relação (ex: `acaoIds` ou `perfilIds`), mas ele não foi listado em `relationInputFields` no `<entidade>.config.ts`.
   - **Solução**: Adicione `relationInputFields: ['<campoId>']` no `CrudConfig` e implemente `syncRelations` no service.
2. **`TypeORMError: Relation with property path x.y in entity was not found` no `findAll`**:
   - **Causa**: Relações aninhadas com ponto precisam encadear o join a partir do alias pai no `QueryBuilder`.
   - **Solução**: Configure `relations: ['x', 'x.y']` no `CrudConfig` e **sempre escreva um teste chamando `service.findAll({}, user)`** no `<recurso>.service.spec.ts`.
3. **Getters da Entidade ausentes no JSON do Frontend**:
   - **Causa**: Getters em classes TypeScript não são enumeráveis na instância e o `JSON.stringify` os ignora. E nunca faça `entity.meuGetter = valor` se não houver `set`, pois lançará `TypeError: Cannot set property ... which has only a getter`.
   - **Solução**: Implemente `toJSON()` na entidade incluindo explicitamente os getters desejados.
4. **Perda de Getters após `MaskService`**:
   - **Causa**: Clonar uma entidade com `{ ...entity }` remove seu prototype.
   - **Solução**: O `MaskService` já utiliza `Object.assign(Object.create(Object.getPrototypeOf(entity)), entity)` para preservar o prototype, getters e `toJSON()`.

---

## 🛠️ Passo a Passo para Criar um Novo Caso de Uso

### Passo 1: Modelar a Entidade
- Crie `src/<recurso>/entities/<entidade>.entity.ts` estendendo `BaseEntity`.
- Decore campos com `@ApiProperty()`, decorators TypeORM e `@Masked()` se houver dados sensíveis (protegidos por `SENSITIVE_DATA_ROLE = 'global:dados-sensiveis'`).
- Se houver getters computados necessários no frontend, implemente `toJSON()`.

### Passo 2: Definir DTOs
- Crie `src/<recurso>/dto/<entidade>.dto.ts`.
- Crie `Create<Entidade>Dto` com validações (`class-validator`) e `@FormFieldMeta(...)` para geração automática de formulários.
- Crie `Update<Entidade>Dto` usando `createUpdateDto(Create<Entidade>Dto)` (que adiciona `@IsInt() version!: number`).

### Passo 3: Criar `<entidade>.config.ts`
- Exporte `<entidade>CrudConfig: CrudConfig<Entidade, CreateDto, UpdateDto>`.
- Configure `resource`, `entity`, `createDto`, `updateDto`, `deleteMode` (`'soft'`), `relations`, `relationInputFields`, `sortable` e `filters`.

### Passo 4: Implementar o Service
- Crie `src/<recurso>/<recurso>.service.ts` estendendo `CrudService<Entidade, CreateDto, UpdateDto>`.
- Passe `super(deps, <entidade>CrudConfig)`.
- Adicione hooks registrando **apenas** métodos privados nomeados (`validar...`, `preparar...`, `invalidar...`).
- Ao lançar `BusinessException` relativa a um campo, passe o nome do campo como 4º argumento.
- Sobrescreva `syncRelations` se houver relacionamentos muitos-para-muitos.

### Passo 5: Implementar o Controller
- Crie `src/<recurso>/<recurso>.controller.ts`.
- Instancie `BaseCrudController = createCrudController(<entidade>CrudConfig)`.
- Adicione decorators `@ApiBearerAuth('JWT-auth')`, `@ApiTags('<recurso>')`, `@Controller('<recurso>')`.
- Adicione rotas customizadas se necessário decoradas com `@Operation('<recurso>:<acao>')` (respeitando o formato `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`).

### Passo 6: Registrar no Module e AppModule
- Crie `src/<recurso>/<recurso>.module.ts` importando `TypeOrmModule.forFeature([Entidade])`.
- Registre o módulo em `app.module.ts`.

### Passo 7: Criar a Migration TypeORM
- Crie a migration versionada em `src/database/migrations/` (usando índices parciais `WHERE "deletedAt" IS NULL` para colunas únicas com soft-delete) e valide em `migrations.integration.spec.ts`.

### Passo 8: Criar Service e Página no Frontend (se aplicável)
- Crie `<recurso>.service.ts` estendendo `GenericCrudService<EntidadeDto>`.
- Crie `<recurso>-page.component.ts` configurando `<app-generic-crud-page [config]="pageConfig" />` (usando `headerActions`, `customModalComponent`, `isRowReadOnly` ou `canDeleteRow` quando necessário).

### Passo 9: Escrever Testes Unitários e de Integração (TDD)
- Crie `src/<recurso>/<recurso>.service.spec.ts` no backend e `<recurso>-page.component.spec.ts` no frontend.
- Cubra obrigatoriamente:
  - `create`, `findOne`, **`findAll`** (essencial para validar joins de `relations` no `QueryBuilder`), `update` e `remove`.
  - Validações de hooks lançando `BusinessException` com código e `field`.
  - Concorrência otimista (`version`).
  - Soft-delete e reuso de valores únicos após soft-delete.
  - Serialização de getters (`toJSON()`) e mascaramento de dados sensíveis (`global:dados-sensiveis`).

---

## ✅ Checklist de Conformidade

Antes de concluir qualquer caso de uso, valide os seguintes pontos:

- [ ] A configuração está em arquivo separado `<entidade>.config.ts` e é reutilizada no controller e service.
- [ ] Campos de relação nos DTOs estão listados em `relationInputFields` no `<entidade>.config.ts` e tratados em `syncRelations`.
- [ ] Entidades com getters computados implementam `toJSON()` para garantir serialização nas respostas HTTP.
- [ ] Nenhum hook no service possui lógica inline anônima; todos delegam para métodos privados nomeados.
- [ ] Erros de validação e negócio disparam `BusinessException` com código em `UPPER_SNAKE_CASE` e o 4º parâmetro `field` quando aplicável.
- [ ] Todas as roles seguem o formato `<funcionalidade>:<acao>` ou `global:<acao>`.
- [ ] DTO de atualização utiliza `createUpdateDto` ou exige `@IsInt() version!: number`.
- [ ] Não há uso do tipo `any` em nenhuma tipagem (backend, frontend e utils).
- [ ] DTOs e endpoints possuem anotações OpenAPI/Swagger.
- [ ] Testes cobrem 100% dos hooks, `findAll` com relações, fluxos de sucesso e erro.
- [ ] `typecheck`, `lint`, `test` e `build` rodam sem erros em todo o monorepo.


