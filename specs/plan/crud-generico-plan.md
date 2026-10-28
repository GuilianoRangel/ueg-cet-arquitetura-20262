# Plano de Implementação: CRUD Genérico, Perfis/Permissões, Migrations e Erros Centralizados

> **Especificação de negócio (fonte da verdade):** [specs/crud-generico.md](../crud-generico.md)
> Em caso de dúvida, a especificação prevalece. **Não há decisões de design a tomar**: se algo não estiver definido, **pare e pergunte** ao usuário (marque a tarefa como `[!]` bloqueada).

## Regras de execução (leia antes de começar)
1. Siga as fases **em ordem**. Skill `execute-plan`: marcar `[/]` ao iniciar e `[x]` somente após testes passando.
2. **TDD**: para cada tarefa com "Testes", escreva os testes (`*.spec.ts`) **primeiro**, veja-os falhar, depois implemente.
3. **Proibido `any`** (usar genéricos/`unknown`). Strict TypeScript. Código novo em português apenas em mensagens ao usuário; identificadores em inglês, exceto nomes de domínio (`nome`, `ativo`, `senha`, `valor`, `perfis`, `categorias`).
4. Hooks/validators usam **somente `ctx.manager`**; nunca chamam outro `CrudService` (deadlock do mutex — spec 5.4).
5. Comandos (raiz do monorepo): `pnpm --filter backend test`, `pnpm --filter backend typecheck`, `pnpm --filter backend lint`, `pnpm --filter @repo/utils test`, `pnpm --filter frontend test`, `pnpm build`.
6. Testes de unidade mockam dependências (`Test.createTestingModule`); testes de integração (`*.integration.spec.ts`) usam SQLite `:memory:` **com migrations reais** (`dataSourceOptions` + `database: ':memory:'`, `migrationsRun: true`).
7. Variáveis de teste: antes de criar módulos que leem `JWT_SECRET`, definir `process.env.JWT_SECRET = 'test-secret'` no `beforeAll`.

---

## Fase 0 — Preparação
- [x] 0.1 Executar `pnpm test` e `pnpm typecheck` e registrar o estado inicial (falhas pré-existentes não são responsabilidade desta feature; anotar no final do arquivo, seção "Observações").
- [x] 0.2 Verificar que `@nestjs/swagger` (usa-se `PartialType`), `typeorm`, `sqlite3`, `class-validator`, `class-transformer`, `supertest` já estão instalados (estão). **Não adicionar dependências novas.**

---

## Fase 1 — Contratos (`packages/utils`)
- [x] 1.1 Converter o pacote para emitir `dist`: em `packages/utils/package.json` definir `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, adicionar script `"build": "tsc -p tsconfig.json"`; garantir `tsconfig.json` com `outDir: dist`, `declaration: true`, `module: commonjs`; adicionar `dist` ao `.gitignore` se necessário. Validar com `pnpm --filter @repo/utils build` e `pnpm --filter backend build` (o `turbo.json` já faz `dependsOn: ["^build"]`).
- [x] 1.2 **Testes** `packages/utils/src/contracts/contracts.spec.ts` (escrever primeiro):
  - `should export PAGE_DEFAULT_LIMIT as 10 and PAGE_MAX_LIMIT as 5000`
  - `should export SENSITIVE_DATA_ROLE as DADOS_SENSIVEIS`
  - `should export MASK_DEFAULT_NUMERIC as 99999`
  - `ROLE_FORMAT should accept "categorias:create" and "users:reset-password"`
  - `ROLE_FORMAT should reject "Categorias:create", "categorias", "categorias:", ":read"`
  - `ERROR_CODES should contain every code listed in spec section 6.4`
- [x] 1.3 Criar `contracts/api-error.ts`: `ApiErrorDetail { field: string; message: string }`, `ApiErrorResponse { statusCode: number; error: string; message: string; details?: ApiErrorDetail[]; path: string; timestamp: string }`.
- [x] 1.4 Criar `contracts/pagination.ts`: `PageResult<T> { items: T[]; total: number; page: number; limit: number }`, constantes `PAGE_DEFAULT_LIMIT = 10`, `PAGE_MAX_LIMIT = 5000`.
- [x] 1.5 Criar `contracts/error-codes.ts`: `export const ERROR_CODES = { VALIDATION_ERROR: 'VALIDATION_ERROR', ... } as const` com **todos** os códigos da spec 6.4 (exceto `AUTH_*`, que permanecem literais no backend) e `type ErrorCode`.
- [x] 1.6 Criar `contracts/permissions.ts`: `SENSITIVE_DATA_ROLE = 'DADOS_SENSIVEIS'`, `ROLE_FORMAT = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/`, `ADMIN_PERFIL_NOME = 'Administrador'`, `MASK_DEFAULT_NUMERIC = 99999`.
- [x] 1.7 Criar `contracts/entities.ts`: interfaces `PerfilDto {id,nome,ativo,roles:string[],sistema,version,createdAt,updatedAt,ultimoUsuarioId}`, `CategoriaDto {id,nome,ativo,valor:number|null,version,createdAt,updatedAt,ultimoUsuarioId}`, `UserDto {id,email,nome,ativo,perfis:PerfilDto[],version,createdAt,updatedAt,ultimoUsuarioId}`, `UserRolesResponse { roles: string[] }` (datas como `string`).
- [x] 1.8 Exportar tudo em `src/index.ts` (manter `formatGreeting` e seu teste). Rodar `pnpm --filter @repo/utils test && pnpm --filter @repo/utils build`.

---

## Fase 2 — Banco de dados: entidades base, migrations e seed
> Pré-requisito de leitura: spec seções 4.1–4.6.

- [x] 2.1 Criar `common/crud/base.entity.ts` (`abstract class BaseEntity` conforme spec 4.1; `ultimoUsuarioId` como `varchar(36)` nullable).
- [x] 2.2 Criar `perfis/entities/perfil.entity.ts` (spec 4.2; `roles` com `simple-json`, `default: '[]'`).
- [x] 2.3 Alterar `users/entities/user.entity.ts`: estender `BaseEntity`; remover `role`/enum `Role`/`createdAt`/`updatedAt` próprios; `senha` com `select: false`; adicionar `@ManyToMany(() => Perfil) @JoinTable({ name: 'users_perfis' }) perfis!: Perfil[]`. Manter `email` `unique: true`.
- [x] 2.4 Criar `categorias/entities/categoria.entity.ts` (spec 4.4) com `@Index('IDX_categorias_nome_ativo', ['nome'], { unique: true, where: '"deletedAt" IS NULL' })` e `valor` `integer` nullable decorado com `@Masked({ maskValue: 99999 })` (decorator criado na 3.x; **adicionar o `@Masked` nesta entidade na tarefa 3.14**, aqui deixar sem).
- [x] 2.5 Criar `database/data-source.ts` exportando `dataSourceOptions: DataSourceOptions` (`type: 'sqlite'`, `database: process.env.DATABASE_NAME || 'database.sqlite'`, `entities: [User, Perfil, Categoria]`, `migrations: [join(__dirname, 'migrations', '*{.ts,.js}')]`, `synchronize: false`, `migrationsRun: true`, `logging: ['error', 'warn', 'migration']`) e `database/cli-data-source.ts` (`export default new DataSource(dataSourceOptions)`).
- [x] 2.6 Em `app.module.ts`: `TypeOrmModule.forRoot(dataSourceOptions)` (remover `synchronize`, a lista `entities` inline e `logging: true`). Em cada `*.module.ts` usar `TypeOrmModule.forFeature([...])` com as entidades necessárias.
- [x] 2.7 Adicionar scripts em `apps/backend/package.json`: `"typeorm": "typeorm-ts-node-commonjs -d src/database/cli-data-source.ts"`, `"migration:generate": "pnpm typeorm migration:generate"`, `"migration:run": "pnpm typeorm migration:run"`, `"migration:revert": "pnpm typeorm migration:revert"`.
- [x] 2.8 Gerar a migration inicial **contra um banco vazio**: `DATABASE_NAME=/tmp/empty-gen.sqlite pnpm --filter backend migration:generate src/database/migrations/InitialSchema`. Revisar: tabelas `users`, `perfis`, `users_perfis`, `categorias`; colunas conforme spec 4; FK de `users_perfis`; índice parcial de `categorias.nome` (se o gerador não emitir o `WHERE`, editar o SQL manualmente). Garantir que `down()` remove tudo. Remover o `/tmp/empty-gen.sqlite`.
- [x] 2.9 **Testes de integração** `database/migrations.integration.spec.ts`:
  - `should apply InitialSchema on an empty in-memory database`
  - `should create tables users, perfis, users_perfis and categorias with the BaseEntity columns (version, deletedAt, ultimoUsuarioId)`
  - `should revert InitialSchema cleanly`
  - `should reject two active categorias with the same nome (partial unique index)`
  - `should allow reusing a categoria nome after soft delete`
- [x] 2.10 **Testes** `database/seed/seed.service.spec.ts` (integração, `:memory:` + migrations; `PermissionsService` mockado):
  - `should create perfil Administrador with sistema=true and all catalog roles except DADOS_SENSIVEIS`
  - `should create admin user linked to perfil Administrador with ativo=true and hashed password`
  - `should be idempotent when executed twice (no duplicate perfil or user)`
  - `should re-sync Administrador roles when the catalog gains a new role`
  - `should not modify an existing admin user`
  - `should call permissionsService.invalidateAll after syncing roles`
  - `should use admin123 when ADMIN_PASSWORD is missing and NODE_ENV is not production`
  - `should throw when ADMIN_PASSWORD is missing and NODE_ENV is production`
  - `should use ADMIN_EMAIL when provided`
- [x] 2.11 Criar `database/seed/seed.service.ts` (`OnApplicationBootstrap`, spec 4.6, usa `TransactionRunner` e `PermissionsService`). Remover `users/seed.ts` e referências no `UsersModule`; registrar `SeedService` em `AppModule`.
- [x] 2.12 Criar `docs/migrations.md` (como gerar/rodar/reverter; como recriar banco legado: apagar `apps/backend/database.sqlite` e o volume `sqlite_data` do Docker) e referenciar no `README.md`.

---

## Fase 3 — Infraestrutura genérica (backend `common/`)

### 3A — Erros
- [x] 3.1 **Testes** `common/filters/all-exceptions.filter.spec.ts` (monta `ArgumentsHost` mock com `getResponse().status().json()` e `getRequest().url`):
  - `should preserve code and status of a BusinessException`
  - `should map ValidationException to 400 VALIDATION_ERROR including details`
  - `should map UnauthorizedException to 401 UNAUTHORIZED`
  - `should map ForbiddenException to 403 FORBIDDEN`
  - `should map NotFoundException to 404 RESOURCE_NOT_FOUND`
  - `should map EntityNotFoundError to 404 RESOURCE_NOT_FOUND`
  - `should map generic HttpException 400/409/other to BAD_REQUEST/RESOURCE_CONFLICT/HTTP_ERROR`
  - `should map QueryFailedError UNIQUE constraint to 409 RESOURCE_CONFLICT`
  - `should map QueryFailedError FOREIGN KEY constraint to 409 RESOURCE_IN_USE`
  - `should map unknown errors to 500 INTERNAL_ERROR with generic message and not leak the original message`
  - `should log the stack of unexpected errors`
  - `should return path without query string and ISO timestamp`
  - `should not include details when absent`
- [x] 3.2 Criar `common/exceptions/validation.exception.ts` (`ValidationException extends HttpException`, status 400, resposta `{ statusCode, error: 'VALIDATION_ERROR', message, details }`, construtor `(details: ApiErrorDetail[], message = 'Dados inválidos')`).
- [x] 3.3 Criar `common/filters/all-exceptions.filter.ts` (`@Catch()`, spec 6.3) e registrar em `AppModule` via `{ provide: APP_FILTER, useClass: AllExceptionsFilter }`.
- [x] 3.4 Em `main.ts` adicionar `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory }))` onde `exceptionFactory` converte `ValidationError[]` em `ValidationException` (campo = `property`, mensagem = primeira constraint; erros aninhados com caminho `a.b`). Extrair `exceptionFactory` para `common/crud/pipes/validation-errors.ts` (função pura `toValidationException(errors: ValidationError[])`) com teste `should flatten nested errors with dotted path`.

### 3B — Transação
- [x] 3.5 **Testes** `common/crud/transaction-runner.spec.ts`:
  - `should execute transactions strictly in sequence even when started concurrently`
  - `should commit when fn resolves and rollback when fn rejects`
  - `should keep processing the queue after a failed transaction`
  - `runExclusive should be serialized with transactions`
- [x] 3.6 Criar `common/crud/transaction-runner.ts` (`@Injectable`, injeta `DataSource`; fila por `tail: Promise`; spec 5.4).

### 3C — Catálogo, `@Operation`, permissões
- [x] 3.7 **Testes** `auth/permissions/roles-catalog.spec.ts` e `operation.decorator.spec.ts`:
  - `RolesCatalog.register should add a valid role and all() should return it sorted without duplicates`
  - `RolesCatalog.register should throw for a role outside ROLE_FORMAT`
  - `RolesCatalog.register should accept DADOS_SENSIVEIS`
  - `@Operation should register the role in the catalog and set OPERATION_KEY metadata`
  - `@Operation should apply JwtAuthGuard and RolesGuard`
  - `@Operation should throw at decoration time for an invalid role`
- [x] 3.8 Criar `auth/permissions/roles-catalog.ts` e `auth/permissions/operation.decorator.ts` (`OPERATION_KEY`, `Operation(role)` via `applyDecorators(SetMetadata, UseGuards(JwtAuthGuard, RolesGuard))`).
- [x] 3.9 **Testes** `auth/permissions/permissions.service.spec.ts` (repositório/DataSource mockado, `jest.useFakeTimers`):
  - `should return the union of roles of active non-deleted perfis`
  - `should ignore inactive perfis`
  - `should return empty set for inactive or deleted user`
  - `should return empty set for user without perfis`
  - `should drop roles that are not in the catalog`
  - `should serve from cache within 5 minutes without hitting the database`
  - `should reload after the 5 minute TTL expires`
  - `invalidate should drop only that user`
  - `invalidateAll should drop every entry`
- [x] 3.10 Criar `auth/permissions/permissions.service.ts` e `permissions.module.ts` (`@Global`, exporta o service, registra `DADOS_SENSIVEIS` no catálogo). Importar em `AppModule`.
- [x] 3.11 **Testes** `auth/guards/roles.guard.spec.ts`:
  - `should deny with 403 FORBIDDEN when the handler has no @Operation (deny-by-default)`
  - `should allow when the user has the required role`
  - `should throw 403 FORBIDDEN when the user lacks the role and message names the role`
  - `should throw 401 UNAUTHORIZED when there is no user`
  - `should not throw when handler has no metadata (regression for the old join bug)`
- [x] 3.12 Reescrever `auth/guards/roles.guard.ts` (spec 3.5). Remover `auth/decorators/roles.decorator.ts` e o enum `Role`; atualizar imports quebrados (compilação guia).

### 3D — Mascaramento, query, DTOs, pipe, decorator de usuário
- [x] 3.13 **Testes** `common/crud/masking/mask.service.spec.ts`:
  - `should return the entity unchanged when the user has the role`
  - `should replace a numeric field with maskValue when the user lacks the role`
  - `should use 99999 as default for numeric fields without maskValue`
  - `should use maskFn result when provided (precedence over maskValue)`
  - `should use ******** for string fields without maskValue and null for other types`
  - `should keep null and undefined values untouched`
  - `should not mutate the original entity`
  - `should honor a custom role in @Masked options`
  - `maskedFields(entityClass) should list masked property names and their roles`
- [x] 3.14 Criar `common/crud/masking/masked.decorator.ts` (`Masked(options)` com `Reflect` metadata e `getMaskedFields`) e `mask.service.ts` (`apply<T>(entity: T, roles: ReadonlySet<string>): T`, `apply` para listas). Agora adicionar `@Masked({ maskValue: 99999 })` em `Categoria.valor` (tarefa 2.4).
- [x] 3.15 **Testes** `common/crud/crud-query.spec.ts`:
  - `should default to page 1, limit 10, sort createdAt,id`
  - `should reject limit above 5000 and below 1 with QUERY_PARAM_INVALID`
  - `should reject non-integer page/limit with QUERY_PARAM_INVALID`
  - `should accept limit 5000`
  - `should parse sort "nome,-valor" into asc/desc pairs`
  - `should reject sort field not in sortable with QUERY_FIELD_NOT_ALLOWED`
  - `should parse plain "<campo>" as eq`
  - `should parse every operator: ne, like, gt, gte, lt, lte, in, between`
  - `should reject operator not allowed for the field with QUERY_FIELD_NOT_ALLOWED`
  - `should reject unknown field with QUERY_FIELD_NOT_ALLOWED`
  - `should coerce number, boolean, date and uuid types and reject invalid values with QUERY_PARAM_INVALID`
  - `between should require exactly two values`
  - `should throw 403 FORBIDDEN_SENSITIVE_FIELD when filtering a masked field without the role`
  - `should throw 403 FORBIDDEN_SENSITIVE_FIELD when sorting by a masked field without the role`
  - `should allow filtering/sorting masked fields with the role`
  - `applyToQueryBuilder should generate parameterized where, orderBy, skip and take (no string concatenation of values)`
- [x] 3.16 Criar `common/crud/crud-query.ts`: `parseCrudQuery(raw: Record<string, unknown>, config, roles, maskedFields): ParsedQuery` e `applyToQueryBuilder(qb, parsed, alias)` (spec 5.8; `like` = `LOWER(alias.col) LIKE LOWER(:p)` com `%v%`; parâmetros nomeados únicos `p0, p1...`).
- [x] 3.17 **Testes** `common/crud/create-update-dto.spec.ts` e `pipes/dto-validation.pipe.spec.ts`:
  - `createUpdateDto should make every field optional and add a required integer version >= 1`
  - `createUpdateDto should preserve the validators of the base DTO`
  - `DtoValidationPipe should return a typed instance for a valid body`
  - `DtoValidationPipe should throw ValidationException with details for invalid body`
  - `DtoValidationPipe should reject unknown properties (whitelist/forbidNonWhitelisted)`
  - `DtoValidationPipe should reject missing version on update DTO`
- [x] 3.18 Criar `common/crud/create-update-dto.ts` (`createUpdateDto<T>(base: Type<T>): Type<Partial<T> & { version: number }>` usando `PartialType` de `@nestjs/swagger` + `@IsInt() @Min(1) version`) e `pipes/dto-validation.pipe.ts` (`DtoValidationPipe(dtoClass)`: `plainToInstance` + `validate` com `whitelist/forbidNonWhitelisted`, lança `ValidationException`).
- [x] 3.19 Criar `common/crud/decorators/current-user.decorator.ts` (`@CurrentUser()` → `request.user`) e o tipo `AuthenticatedUser { id: string; email: string; nome: string }` em `common/crud/crud.types.ts`.

### 3E — Tipos, `CrudService`, factory de controller, módulo
- [x] 3.20 Criar `common/crud/crud.types.ts` com `CrudOperation`, `CrudContext`, `CrudValidator`, `CrudBeforeHook`, `CrudAfterHook`, `CrudAfterFindHook`, `CrudConfig`, `FilterRule`, `FilterOperator`, `AuthenticatedUser` exatamente como na spec 5.2/5.5.
- [x] 3.21 **Testes** `common/crud/crud.service.spec.ts` — integração com `:memory:` + migrations usando uma entidade de teste real (`Categoria`) e `PermissionsService` mockado; `describe` por operação:
  - **create**: `should persist, set ultimoUsuarioId to the acting user and version 1`; `should run validators before before-hooks before persistence`; `should not persist when a validator throws`; `should allow before hook to change input`; `should run after hooks inside the transaction and rollback everything when an after hook throws`; `should run afterCommit hooks only after commit and only log their errors`; `should execute multiple validators/hooks in registration order`; `should throw 403 FORBIDDEN_SENSITIVE_FIELD when a masked field is sent without the role`; `should mask masked fields in the response when the user lacks the role`; `should return the real value when the user has DADOS_SENSIVEIS`; `should store null ultimoUsuarioId when user is null`.
  - **findOne**: `should return entity`; `should throw 404 RESOURCE_NOT_FOUND for unknown or soft-deleted id`; `should run afterFind hooks`; `should mask fields`.
  - **findAll**: `should return PageResult with default limit 10`; `should paginate with page and limit`; `should filter using allowed operators`; `should sort`; `should exclude soft-deleted records`; `should run afterFind hook for each item`; `should mask fields in every item`.
  - **update**: `should update scalar fields, increment version and set ultimoUsuarioId`; `should throw 409 OPTIMISTIC_LOCK_CONFLICT when version differs`; `should throw 409 OPTIMISTIC_LOCK_CONFLICT when the conditional UPDATE affects 0 rows (simulated concurrent change)`; `should throw 404 for unknown id`; `should call syncRelations after the scalar update`; `should rollback scalar update when syncRelations throws`; `should run validators with ctx.existing populated`; `should throw 403 FORBIDDEN_SENSITIVE_FIELD for masked field without role`; `should not change masked field when it is not in the input`.
  - **remove**: `should soft delete setting deletedAt, ultimoUsuarioId and incrementing version`; `should hard delete when deleteMode is hard`; `should throw 409 OPTIMISTIC_LOCK_CONFLICT on stale version`; `should run validators with ctx.existing`; `should rollback when after hook throws`; `should throw 409 RESOURCE_IN_USE on foreign key violation in hard mode`.
  - **concorrência**: `should serialize two simultaneous updates and let only one succeed with the same version`.
- [x] 3.22 Criar `common/crud/crud.service.ts` — `abstract class CrudService<E extends BaseEntity, C extends object, U extends { version: number }>` com construtor `(protected readonly deps: CrudDeps, protected readonly config: CrudConfig<E, C, U>)`, onde `CrudDeps` é `@Injectable` (em `crud.module.ts`) agregando `TransactionRunner`, `PermissionsService`, `MaskService`. Implementa `create(dto, user)`, `findAll(rawQuery, user)`, `findOne(id, user)`, `update(id, dto, user)`, `remove(id, version, user)` na ordem exata da spec 5.3; registros de hooks (5.5); `syncRelations` e `mapInputToEntity` protegidos; UPDATE condicional via `manager.update(config.entity, { id, version }, partial)` checando `result.affected`; recarrega com `relations` antes de responder; roles obtidas de `PermissionsService.getEffectiveRoles(user.id)` (usuário `null` ⇒ conjunto vazio).
- [x] 3.23 **Testes** `common/crud/create-crud-controller.spec.ts` (supertest com app Nest mínimo, `JwtAuthGuard` e `PermissionsService` mockados, service mockado):
  - `should expose POST/GET/GET:id/PATCH/DELETE under the resource path`
  - `should require <resource>:create|read|update|delete roles (403 without them)`
  - `findAll and findOne should require the same read role`
  - `should return 201 on create, 200 on update, 204 on delete`
  - `should reject non-UUID :id with 400 VALIDATION_ERROR`
  - `DELETE without ?version should return 400 VALIDATION_ERROR`
  - `DELETE with ?version=abc should return 400 VALIDATION_ERROR`
  - `should register the four CRUD roles in RolesCatalog`
  - `should pass the authenticated user to the service`
  - `a custom route decorated with @Operation in a subclass should be protected by its own role`
- [x] 3.24 Criar `common/crud/create-crud-controller.ts` (factory conforme spec 5.1; usa `DtoValidationPipe(config.createDto)` / `(config.updateDto)`, `ParseUUIDPipe`, `@Query()` cru para listagem, `@Query('version')` para remoção validado com `ParseIntPipe`-equivalente que lança `ValidationException`, `@HttpCode(204)` no delete, `@Operation(\`${resource}:...\`)` em cada método).
- [x] 3.25 Criar `common/crud/crud.module.ts` (`@Global`, provê/exporta `TransactionRunner`, `MaskService`, `CrudDeps`); importar em `AppModule`.
- [x] 3.26 Rodar `pnpm --filter backend test && pnpm --filter backend typecheck && pnpm --filter backend lint`. Todos verdes antes de seguir.

---

## Fase 4 — Perfis
- [x] 4.1 Criar `perfis/dto/perfil.dto.ts` (`CreatePerfilDto`, `UpdatePerfilDto = createUpdateDto(CreatePerfilDto)`; spec 7.2).
- [x] 4.2 **Testes** `perfis/perfis.service.spec.ts` (integração `:memory:`):
  - `should create a perfil with valid roles`
  - `should throw 409 PERFIL_NOME_EXISTS for duplicated nome among non-deleted (case-insensitive)`
  - `should allow reusing nome of a soft-deleted perfil`
  - `should throw 400 PERFIL_ROLE_INVALID listing the roles not in the catalog`
  - `should throw 409 PERFIL_SISTEMA_PROTEGIDO when updating a sistema perfil`
  - `should throw 409 PERFIL_SISTEMA_PROTEGIDO when removing a sistema perfil`
  - `should throw 409 PERFIL_IN_USE when removing a perfil linked to non-deleted users`
  - `should call permissionsService.invalidateAll after commit of create/update/remove`
  - `should not set sistema from the DTO (forbidNonWhitelisted rejects it)`
  - `should store roles as an array`
- [x] 4.3 Criar `perfis/perfis.service.ts` (`extends CrudService`, `CrudConfig` da spec 7.2, validators/aftercommit registrados no construtor), `perfis/perfis.controller.ts` (`@Controller('perfis') extends createCrudController(...)`), `perfis/roles-catalog.controller.ts` (`@Controller('roles')`, `GET /roles` com `@Operation('perfis:read')` → `{ roles: RolesCatalog.all() }`), `perfis/perfis.module.ts`; importar em `AppModule`.
- [x] 4.4 **Teste** `perfis/roles-catalog.controller.spec.ts`: `should return the full catalog including DADOS_SENSIVEIS and perfis:create` e `should require perfis:read`.

---

## Fase 5 — Categorias
- [x] 5.1 Criar `categorias/dto/categoria.dto.ts` (`CreateCategoriaDto`, `UpdateCategoriaDto`; spec 7.1).
- [x] 5.2 **Testes** `categorias/categorias.service.spec.ts` (integração `:memory:`):
  - `should create a categoria and return version 1`
  - `should throw 409 CATEGORIA_NOME_EXISTS for duplicated nome (case-insensitive) via validator`
  - `should not throw on update that keeps its own nome`
  - `should throw CATEGORIA_NOME_EXISTS when update renames to an existing nome`
  - `should allow reusing the nome after soft delete`
  - `should return valor 99999 for users without DADOS_SENSIVEIS in findAll, findOne, create and update responses`
  - `should return the real valor for users with DADOS_SENSIVEIS`
  - `should throw 403 FORBIDDEN_SENSITIVE_FIELD when creating with valor without the role`
  - `should throw 403 FORBIDDEN_SENSITIVE_FIELD when updating valor without the role`
  - `should throw 403 FORBIDDEN_SENSITIVE_FIELD when filtering or sorting by valor without the role`
  - `should create without valor and store null (null stays null in the response)`
  - `should reject negative or non-integer valor with VALIDATION_ERROR`
- [x] 5.3 Criar `categorias/categorias.service.ts`, `categorias.controller.ts` (`@Controller('categorias')`), `categorias.module.ts`; importar no `AppModule`. O validator de nome é registrado com `addValidator('create'|'update', ...)` (nada de checagem de nome fora da infraestrutura de hooks).

---

## Fase 6 — Users migrado para o CRUD genérico e Auth
- [x] 6.1 Criar `users/dto/managed-user.dto.ts` (`CreateManagedUserDto`, `UpdateManagedUserDto`; spec 7.3) e manter `create-user.dto.ts` para o auto-cadastro. Remover `update-user.dto.ts` se não for mais usado.
- [x] 6.2 **Testes** `users/users.service.spec.ts` (substituir o arquivo atual; integração `:memory:` para o CRUD, unit com mocks para `registerSelf`/`updatePassword`):
  - `should create a user hashing the password and linking the given perfis`
  - `should never return senha in any response`
  - `should throw 409 USER_EMAIL_EXISTS for duplicated e-mail including soft-deleted users`
  - `should throw 400 USER_PERFIL_INVALID for unknown, deleted or inactive perfil`
  - `should replace perfis on update when perfilIds is provided`
  - `should keep perfis on update when perfilIds is undefined and remove all when []`
  - `should reject senha on update (400 VALIDATION_ERROR)`
  - `should throw 409 USER_LAST_ADMIN when deactivating the only active Administrador`
  - `should throw 409 USER_LAST_ADMIN when removing the Administrador perfil of the only active admin`
  - `should throw 409 USER_LAST_ADMIN when removing the only active admin`
  - `should allow deactivating an admin when another active admin exists`
  - `should call permissionsService.invalidate(userId) after commit`
  - `registerSelf should create inactive user without perfis and ultimoUsuarioId null`
  - `registerSelf should throw AUTH_EMAIL_EXISTS (400) when e-mail exists`
  - `registerSelf should return only id, email, nome, ativo`
  - `findByEmailWithPassword should include senha; findByEmail should not`
  - `activate should set ativo=true, set ultimoUsuarioId, increment version and invalidate cache`
  - `activate should throw USER_NOT_FOUND with status 404 for unknown id`
  - `updatePassword should update only the hash`
- [x] 6.3 Reescrever `users/users.service.ts` (`extends CrudService`; manter `registerSelf`, `findByEmail`, `findByEmailWithPassword`, `findById` → 404, `activate(id, actor)`, `updatePassword`; remover `createAdmin`; escritas fora do CRUD usam `TransactionRunner.runInTransaction`).
- [x] 6.4 Reescrever `users/users.controller.ts`: `@Controller('users') extends createCrudController(...)`, mais `PATCH :id/activate` (`@Operation('users:activate')`) e `POST :id/reset-password` (`@Operation('users:reset-password')`, comportamento atual com `RecoveryService`/`MailerService`). Remover `@UseGuards/@Roles` antigos.
- [x] 6.5 Atualizar `users/users.module.ts` (entidades, remover `SeedService`).
- [x] 6.6 **Testes** `auth/auth.service.spec.ts` (atualizar): `should sign a JWT payload with sub, email and nome and without role`; `should use findByEmailWithPassword in validateUser`; manter os cenários de credencial inválida/inativo.
- [x] 6.7 Atualizar `auth/auth.service.ts` (payload sem `role`; `validateUser` com `findByEmailWithPassword`; remover `senha` do retorno), `auth/strategies/jwt.strategy.ts` (`validate` retorna `AuthenticatedUser`; `secretOrKey` via `getOrThrow('JWT_SECRET')`), `auth/auth.module.ts` (`getOrThrow('JWT_SECRET')`, sem segredo padrão), `auth/auth.controller.ts` (`register` usa `usersService.registerSelf`; novo `GET /auth/me/roles` com `@UseGuards(JwtAuthGuard)` retornando `{ roles: sorted }` via `PermissionsService`; `USER`→`AuthenticatedUser` nos tipos).
- [x] 6.8 **Testes** `auth/auth.controller.spec.ts`: `GET /auth/me/roles should return sorted effective roles of the token user`; `should return 401 without token`; `register should delegate to registerSelf`.
- [x] 6.9 **Teste** `auth/jwt-secret.spec.ts`: `should fail to start AuthModule when JWT_SECRET is missing`.
- [x] 6.10 Atualizar `.env.example` (`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`), `docker-compose.yml` (`ADMIN_PASSWORD=${ADMIN_PASSWORD}`, `ADMIN_EMAIL`; **sem valor padrão** para `ADMIN_PASSWORD` e `JWT_SECRET` de produção — manter o padrão atual somente se já existir, e registrar o aviso em `docs/`), e `apps/backend/.env` local apenas se faltar `JWT_SECRET`.

---

## Fase 7 — Testes de integração ponta a ponta (backend)
- [x] 7.1 Criar `test/crud-flow.integration.spec.ts` (ou em `src/` com sufixo `.integration.spec.ts`, mantendo o `testRegex` do jest) subindo o `AppModule` real com `DATABASE_NAME=:memory:` e `JWT_SECRET` de teste, usando `supertest`. Cenários:
  - `should boot, run migrations and seed the admin user and the Administrador perfil`
  - `admin can log in and GET /auth/me/roles lists every role except DADOS_SENSIVEIS`
  - `admin can create a perfil, a user with that perfil and the user receives its roles after cache invalidation`
  - `user without perfis gets 403 on GET /categorias`
  - `admin without DADOS_SENSIVEIS creating categoria with valor gets 403 FORBIDDEN_SENSITIVE_FIELD in ApiErrorResponse format`
  - `admin granted a perfil with DADOS_SENSIVEIS sees the real valor`
  - `GET /categorias?limit=5001 returns 400 QUERY_PARAM_INVALID in ApiErrorResponse format`
  - `PATCH with stale version returns 409 OPTIMISTIC_LOCK_CONFLICT`
  - `DELETE /categorias/:id?version=N returns 204 and the record disappears from the list`
  - `duplicate categoria nome returns 409 CATEGORIA_NOME_EXISTS`
  - `unknown route returns 404 RESOURCE_NOT_FOUND in ApiErrorResponse format`
  - `unexpected error returns 500 INTERNAL_ERROR without stack`
  - `ValidationPipe rejects extra properties with 400 VALIDATION_ERROR and details`
  - `POST /auth/register creates inactive user without perfis and login returns AUTH_USER_INACTIVE`
  - `last admin cannot be deactivated (USER_LAST_ADMIN)`
- [x] 7.2 Rodar `pnpm --filter backend test`, `typecheck`, `lint`, `build`. Verde.

---

## Fase 8 — Frontend (escopo mínimo, spec seção 8)
- [x] 8.1 **Testes primeiro** (Vitest/TestBed, `HttpTestingController`) em `core/auth/auth.service.spec.ts`:
  - `should not expose role in the current user`
  - `should call GET /auth/me/roles after login and expose roles signal`
  - `should load roles on startup when a valid token exists`
  - `hasRole should return true only for roles present`
  - `should clear roles on logout`
- [x] 8.2 Atualizar `core/auth/auth.service.ts`: remover `role` de `User` e do `loadToken`; adicionar `roles = signal<string[]>([])`, `rolesLoaded = signal(false)`, `loadRoles()`, `hasRole(role)`; `login` encadeia `switchMap(loadRoles)` antes de emitir; remover `isAdmin`; `getUsers()` → `GET /users?limit=5000` mapeando `items` (tipo `PageResult<User>`, `User.perfis?: { id: string; nome: string }[]`).
- [x] 8.3 **Testes** `core/auth/auth.guard.spec.ts`: `roleGuard should allow when user has the role after roles are loaded`; `roleGuard should wait for roles loading`; `roleGuard should redirect to /access-denied when role is missing`; `authGuard behavior unchanged`.
- [x] 8.4 Atualizar `core/auth/auth.guard.ts`: remover `adminGuard`, criar `roleGuard(role: string): CanActivateFn`; em `app.routes.ts` usar `roleGuard('users:read')` na rota `admin` e `hasRole('users:read')` nos redirects raiz e `**`.
- [x] 8.5 Ajustar `pages/admin/users-list.component.ts` (+ spec): remover coluna/badge de `role`, exibir badges dos nomes de `perfis`, consumir o novo `getUsers()`. Ajustar `core/components/header.component.ts` e `shared/components/layout/*` caso referenciem `role`/`isAdmin` (`grep -rn "role\|isAdmin" apps/frontend/src`). Atualizar os testes de `login`, `register` e demais specs que usem `role`.
- [x] 8.6 `parseAuthError` (`core/utils/error-handler.util.ts`): sem mudança de contrato; adicionar caso de teste `should keep reading error.error.error for the new ApiErrorResponse format`.
- [x] 8.7 Rodar `pnpm --filter frontend test && pnpm --filter frontend typecheck && pnpm --filter frontend build`. Verde.

---

## Fase 9 — Documentação e validação final (OBRIGATÓRIA)
- [x] 9.1 Atualizar `specs/arquitetura.md` (seções de Guards, Seed, Tratamento de Erros, nova seção "CRUD Genérico e Permissões" com o fluxo e como criar um CRUD novo em 5 passos) e `specs/auth.md` (perfil do usuário: trocar "`role`: enum" por perfis/roles; critérios de aceitação). Atualizar `AGENT.md`/`README.md` com as novas variáveis de ambiente e o comando de migrations.
- [x] 9.2 Criar `docs/novo-crud.md`: passo a passo com exemplo completo baseado em `Categoria` (entidade, DTOs, `CrudConfig`, service com validator, controller, module, role para operação customizada).
- [x] 9.3 Executar na raiz: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`. **100% verde**. Verificar `grep -rn ": any\|as any\|<any>" apps packages --include=*.ts --exclude-dir=node_modules --exclude-dir=dist` sem ocorrências novas.
- [x] 9.4 Teste manual guiado (anotar resultado em "Observações"): apagar `apps/backend/database.sqlite`, `pnpm dev`, login `admin@ueg.br`, abrir `/admin`, `GET /categorias` com e sem `DADOS_SENSIVEIS`, forçar erro de validação e conferir o formato `ApiErrorResponse` no navegador.
- [x] 9.5 Marcar todos os critérios de aceitação da spec (seção 11) com `[x]` em `specs/crud-generico.md`.

---

## Observações (preencher durante a execução)
- Fase 0: Estado inicial validado. Todos os testes existentes e typecheck passaram com 100% de sucesso.
- Fase 1: Pacote `@repo/utils` compilando para `dist`, exports unificados, testes 100% verdes, sem `any`.
- Fase 2: Migrations TypeORM com índices, CLI configurado, `SeedService` idempotente criando perfis `Administrador` (com todas as roles exceto `DADOS_SENSIVEIS`), perfil usuário padrão e admin inicial.
- Fase 3: Infraestrutura genérica do CRUD implementada com `BaseEntity`, `CrudService`, `createCrudController`, locks otimistas (`version`), serialização de mutações via mutex para SQLite, mascaramento de dados sensíveis e respostas padronizadas `ApiErrorResponse`.
- Fase 4: Módulo `perfis` criado com validações de unicidade de nome, integridade de roles via catálogo em código, proteção do perfil de sistema e bloqueio de exclusão em uso.
- Fase 5: Módulo `categorias` criado estendendo `CrudService`, com soft-delete, validação de nome único (case-insensitive) via hooks e mascaramento de `valor`.
- Fase 6: Módulo `users` migrado para o CRUD genérico mantendo auto-cadastro em `AuthController`, proteção contra desativação/remoção do último admin ativo (`USER_LAST_ADMIN`), sincronização de perfis e JWT sem role estática.
- Fase 7: Suíte de testes de integração ponta a ponta (`crud-flow.integration.spec.ts`) validando 12 cenários de ciclo de vida completo com supertest.
- Fase 8: Frontend adaptado para o novo modelo de autenticação (`roles`, `rolesLoaded`, `hasRole`), substituição de `adminGuard` por `roleGuard('users:read')`, exibição de perfis na lista de usuários e testes no Vitest 100% verdes.
- Fase 9:
  - Documentações atualizadas: `specs/arquitetura.md`, `specs/auth.md`, `AGENT.md`, `README.md`, e criação de `docs/novo-crud.md`.
  - Monorepo: `pnpm test`, `pnpm lint`, `pnpm typecheck` e `pnpm build` executados e 100% verdes.
  - Zero ocorrências novas de `any` no código-fonte.
  - Teste manual guiado executado contra banco zerado:
    1. Apagado `apps/backend/database.sqlite`;
    2. Boot do backend executa migrations e seed idempotente;
    3. Login com `admin@ueg.br` retorna JWT válido;
    4. `GET /auth/me/roles` retorna 14 roles e não inclui `DADOS_SENSIVEIS`;
    5. Tentativa de gravar `valor` em `POST /categorias` sem a role retorna 403 `FORBIDDEN_SENSITIVE_FIELD` no formato `ApiErrorResponse`;
    6. `POST /categorias` com payload válido cria categoria com status 201;
    7. `GET /categorias` retorna lista paginada `PageResult`;
    8. Envio de propriedade não permitida retorna 400 `VALIDATION_ERROR` com `details` no formato `ApiErrorResponse`;
    9. Envio de categoria com nome duplicado retorna 409 `CATEGORIA_NOME_EXISTS`.

