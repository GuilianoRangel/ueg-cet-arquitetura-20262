# Plano de Implementação: Arquitetura de CRUD Genérico no Frontend, Metadados por Reflexão, SmartFilterBar, Tratamento de Erros e Loading Global

> **Especificação de negócio e arquitetura (fonte da verdade):** [specs/crud-generico-frontend.md](../crud-generico-frontend.md)
> **Especificação complementar do backend:** [specs/crud-generico.md](../crud-generico.md)
> Em caso de dúvida, a especificação prevalece. **Nenhuma decisão arquitetural foi deixada em aberto**: se surgir qualquer imprevisto não coberto, **pare e pergunte** ao usuário (marque a tarefa como `[!]` bloqueada).

---

## Regras de Execução e Isolamento por Sessão (Leia antes de começar)

1. **Execução Fase por Fase (Sessões Isoladas)**:
   - Este plano foi estruturado para que **cada Fase possa ser executada em uma sessão isolada com seu próprio contexto**.
   - Ao iniciar uma sessão, verifique qual é a primeira Fase com tarefas pendentes (`- [ ]`), leia os arquivos listados em **"Contexto de Entrada da Fase"**, marque a tarefa atual como em progresso (`- [/]`) ao iniciar e como concluída (`- [x]`) **somente após** todos os testes e validações da tarefa passarem.
   - Ao concluir uma Fase inteira, registre um resumo na seção **"Observações"** no final deste arquivo e realize o commit correspondente antes de encerrar ou avançar.
2. **Skills Ativas Obrigatórias (`AGENT.md`)**:
   - Backend: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.
   - Frontend: `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`, `clean-code`.
   - Processo: `execute-plan`.
3. **TDD Estrito**:
   - Para todas as tarefas que possuem bloco de **Testes**, escreva primeiro o arquivo `*.spec.ts`, execute o runner de testes para confirmar a falha inicial e só então implemente o código de produção até ficar verde.
4. **Proibição Estrita do Tipo `any`**:
   - É terminantemente proibido usar `any`, `as any` ou `<any>` em qualquer arquivo `.ts` (produção ou teste). Use tipos explícitos, genéricos ou `unknown` com type narrowing.
5. **Ambiente de Execução (NVM + PNPM)**:
   - Todos os comandos de terminal devem carregar explicitamente o ambiente:
     `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && export PNPM_HOME="/home/guiliano/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH" && <comando>`
6. **Hooks de Backend com Métodos Privados Nomeados**:
   - Conforme regra do `AGENT.md`, todo validador ou hook em serviços que estendem `CrudService` deve permanecer em método privado nomeado.

---

## Fase 0 — Preparação e Instalação de Dependências Padronizadas

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 1 e 6.3), `apps/frontend/package.json`, `package.json`.
> - Skills ativas: `execute-plan`, `angular-dev`.

- [x] 0.1 Executar `pnpm test` e `pnpm typecheck` na raiz do monorepo para validar que o estado inicial antes da implementação está 100% verde.
- [x] 0.2 Instalar no workspace `frontend` as bibliotecas padrão de mercado definidas na especificação para encapsulamento de Dialogs e Toasts:
  - `@angular/cdk` (versão compatível com `@angular/core` `^21.2.0` para `@angular/cdk/dialog` e `@angular/cdk/overlay`)
  - `ngx-sonner` (para Toasts reativos no padrão Shadcn/Sonner)
  - Comando: `pnpm --filter frontend add @angular/cdk@^21.2.0 ngx-sonner`
- [x] 0.3 Importar os estilos base do CDK Overlay em `apps/frontend/src/styles.css` (`@import '@angular/cdk/overlay-prebuilt.css';` ou equivalente compatível com Tailwind v4) e validar que `pnpm --filter frontend build` e `pnpm --filter frontend test` continuam executando sem erros.

---

## Fase 1 — Contratos Compartilhados de Metadados (`packages/utils`)

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 3.1, 3.2 e 3.3), `packages/utils/src/index.ts`, `packages/utils/src/contracts/pagination.ts`, `packages/utils/src/contracts/api-error.ts`.
> - Skills ativas: `execute-plan`, `clean-code`.

- [x] 1.1 **Testes** em `packages/utils/src/contracts/contracts.spec.ts` (adicionar cenários antes de implementar):
  - `should export FILTER_OPERATORS containing eq, ne, like, gt, gte, lt, lte, in, between`
  - `should validate structure of SearchFilterConfigDto, SmartFilterFieldMeta and MasterDetailFilterConfig`
  - `should validate structure of CrudFormSchemaDto, CrudFormFieldSchema and CrudResourceMetaDto`
- [x] 1.2 Em `packages/utils/src/contracts/pagination.ts`, exportar a constante `FILTER_OPERATORS = ['eq', 'ne', 'like', 'gt', 'gte', 'lt', 'lte', 'in', 'between'] as const` e o tipo `export type FilterOperator = (typeof FILTER_OPERATORS)[number];`.
- [x] 1.3 Criar `packages/utils/src/contracts/crud-meta.ts` contendo todas as interfaces compartilhadas definidas nas Seções 3.2 e 3.3 da especificação:
  - `FilterFieldType` (`'string' | 'number' | 'boolean' | 'date' | 'uuid'`)
  - `FilterControlType` (`'text' | 'number' | 'currency' | 'boolean' | 'date' | 'select' | 'multiselect' | 'master-detail'`)
  - `FilterOptionItem` (`{ label: string; value: string | number | boolean }`)
  - `MasterDetailFilterConfig` (`parentField`, `parentLabel`, `parentEndpoint`, `parentValueKey`, `parentLabelKey`, `childEndpoint`, `parentParamName`, `childValueKey`, `childLabelKey`)
  - `SmartFilterFieldMeta` (`field`, `label`, `type`, `controlType`, `operators`, `defaultOperator`, `quickFilter`, `placeholder?`, `options?`, `optionsEndpoint?`, `optionsValueKey?`, `optionsLabelKey?`, `masterDetail?`, `requiredRole?`)
  - `SearchFilterConfigDto` (`{ resource: string; fields: SmartFilterFieldMeta[] }`)
  - `FormInputType` (`'text' | 'email' | 'password' | 'number' | 'currency' | 'boolean' | 'select' | 'multiselect' | 'date' | 'hidden'`)
  - `FormFieldValidationRule` (`{ type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'email' | 'int' | 'uuid'; value?: number | string | boolean; message?: string }`)
  - `CrudFormFieldSchema` (`name`, `label`, `inputType`, `required`, `defaultValue?`, `placeholder?`, `description?`, `order`, `hidden`, `readOnly`, `masked?`, `omitOnSubmit?`, `requiredRole?`, `validations`, `options?`, `optionsEndpoint?`, `optionsValueKey?`, `optionsLabelKey?`, `entityRelationProperty?`, `entityRelationValueKey?`)
  - `CrudFormSchemaDto` (`{ mode: 'create' | 'update'; fields: CrudFormFieldSchema[] }`)
  - `CrudResourceMetaDto` (`{ resource: string; filters: SearchFilterConfigDto; createForm: CrudFormSchemaDto; updateForm: CrudFormSchemaDto }`)
- [x] 1.4 Exportar `crud-meta.ts` em `packages/utils/src/index.ts`.
- [x] 1.5 **Checkpoint da Fase 1**: Executar `pnpm --filter @repo/utils test && pnpm --filter @repo/utils build` e garantir 100% de aprovação.

---

## Fase 2 — Backend: Evolução de `BusinessException` com Campo, Filtro por Relação e Metadados do `SmartFilterBar`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 3.1 e 3.2), `apps/backend/src/common/exceptions/business.exception.ts`, `apps/backend/src/common/filters/all-exceptions.filter.ts`, `apps/backend/src/common/crud/crud.types.ts`, `apps/backend/src/common/crud/crud-query.ts`.
> - Skills ativas: `execute-plan`, `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`.

- [x] 2.1 **Testes** em `apps/backend/src/common/filters/all-exceptions.filter.spec.ts`:
  - `should include details[{ field, message }] when BusinessException is thrown with a field string`
  - `should include details array when BusinessException is thrown with ApiErrorDetail[]`
  - `should omit details when BusinessException is thrown without fieldOrDetails`
- [x] 2.2 Evoluir `apps/backend/src/common/exceptions/business.exception.ts`:
  - Adicionar 4º parâmetro opcional no construtor: `fieldOrDetails?: string | ApiErrorDetail[]`.
  - Se `typeof fieldOrDetails === 'string'`, armazenar `readonly details: ApiErrorDetail[] = [{ field: fieldOrDetails, message }]`.
  - Se `Array.isArray(fieldOrDetails)`, armazenar `readonly details: ApiErrorDetail[] = fieldOrDetails`.
  - Atualizar `AllExceptionsFilter` (`apps/backend/src/common/filters/all-exceptions.filter.ts`) para extrair `exception.details` de `BusinessException` quando presente.
- [x] 2.3 Atualizar os validadores de negócio nos 3 serviços existentes para informar o nome do campo correspondente:
  - `apps/backend/src/categorias/categorias.service.ts`: passar `'nome'` em `CATEGORIA_NOME_EXISTS` (create e update).
  - `apps/backend/src/perfis/perfis.service.ts`: passar `'nome'` em `PERFIL_NOME_EXISTS` (create e update) e `'roles'` em `PERFIL_ROLE_INVALID`.
  - `apps/backend/src/users/users.service.ts`: passar `'email'` em `USER_EMAIL_EXISTS` (create e update) e `'perfilIds'` em `USER_PERFIL_INVALID`.
  - Atualizar/adicionar asserções nos arquivos `categorias.service.spec.ts`, `perfis.service.spec.ts` e `users.service.spec.ts` verificando que `err.details` contém o `field` esperado.
- [x] 2.4 Evoluir `FilterRule` em `apps/backend/src/common/crud/crud.types.ts`:
  - Reutilizar `FilterOperator`, `FilterControlType`, `FilterOptionItem`, `MasterDetailFilterConfig` de `@repo/utils`.
  - Adicionar em `FilterRule` as propriedades opcionais de metadados de busca:
    - `label?: string`
    - `quickFilter?: boolean`
    - `controlType?: FilterControlType`
    - `defaultOperator?: FilterOperator`
    - `placeholder?: string`
    - `options?: FilterOptionItem[]`
    - `optionsEndpoint?: string`
    - `optionsValueKey?: string`
    - `optionsLabelKey?: string`
    - `masterDetail?: MasterDetailFilterConfig`
    - `relationField?: string` (ex: `'perfis.id'`)
    - `requiredRole?: string`
- [x] 2.5 **Testes** em `apps/backend/src/common/crud/crud-query.spec.ts`:
  - `should parse and apply filter on a relationField (e.g. perfilId mapped to perfis.id with eq and in operators)`
- [x] 2.6 Atualizar `apps/backend/src/common/crud/crud-query.ts`:
  - Incluir `relationField?: string` em `ParsedFilter`.
  - Em `parseCrudQuery`, repassar `relationField: rule.relationField` e verificar `rule.requiredRole` (além de `maskedFields`) contra `roles`.
  - Em `applyToQueryBuilder`, quando `f.relationField` estiver definido (no formato `'relacao.coluna'`, ex: `'perfis.id'`), garantir que o join `${alias}.${relacao}` exista no `QueryBuilder` (ou usar o alias já existente criado por `config.relations`) e aplicar a cláusula `WHERE` sobre `${relacao}.${coluna}` com `eq` ou `in`.
- [x] 2.7 **Testes** em `apps/backend/src/common/crud/metadata/smart-filter-metadata.service.spec.ts`:
  - `should build SearchFilterConfigDto from CrudConfig filters with default labels and controlTypes`
  - `should omit fields protected by @Masked or requiredRole when user does not have the required role`
  - `should include fields protected by @Masked when user has DADOS_SENSIVEIS`
  - `should preserve quickFilter, options, optionsEndpoint and masterDetail configurations`
- [x] 2.8 Criar `apps/backend/src/common/crud/metadata/smart-filter-metadata.service.ts`:
  - Exportar a interface `ISmartFilterConfigProvider { getSearchFilterConfig(userRoles: ReadonlySet<string>): SearchFilterConfigDto }` para que qualquer caso de uso do sistema possa fornecer metadados ao `SmartFilterBar`.
  - Implementar a função/serviço `buildSearchFilterConfig(config: CrudConfig<E, C, U>, userRoles: ReadonlySet<string>, maskedFields: MaskedFieldMetadata[]): SearchFilterConfigDto`.
- [x] 2.9 **Checkpoint da Fase 2**: Executar `pnpm --filter backend test && pnpm --filter backend typecheck && pnpm --filter backend lint` e garantir 100% de aprovação.

---

## Fase 3 — Backend: Reflexão de DTOs (`DtoMetadataExplorer` + `@FormFieldMeta`) e Endpoints `/meta`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 3.3 e 5), `apps/backend/src/common/crud/create-crud-controller.ts`, `apps/backend/src/common/crud/crud.service.ts`, `apps/backend/src/categorias/dto/categoria.dto.ts`, `apps/backend/src/perfis/dto/perfil.dto.ts`, `apps/backend/src/users/dto/managed-user.dto.ts`.
> - Skills ativas: `execute-plan`, `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`.

- [x] 3.1 Criar o decorator `@FormFieldMeta(options: FormFieldMetaOptions)` em `apps/backend/src/common/crud/decorators/form-field-meta.decorator.ts` armazenando metadados por propriedade na classe/protótipo via `Reflect.defineMetadata` (suportando herança de classes base como `BaseManagedUserDto` e `createUpdateDto`).
- [x] 3.2 **Testes** em `apps/backend/src/common/crud/metadata/dto-metadata.explorer.spec.ts`:
  - `should extract fields, types and required flags from class-validator and @ApiProperty decorators`
  - `should extract minLength, maxLength, min, max, isEmail and custom validation messages`
  - `should inherit fields from base DTO classes (e.g. BaseManagedUserDto -> CreateManagedUserDto and UpdateManagedUserDto)`
  - `should include senha in createForm of CreateManagedUserDto and omit senha in updateForm of UpdateManagedUserDto`
  - `should mark version field as hidden in updateForm`
  - `should merge @FormFieldMeta options (label, inputType, optionsEndpoint, entityRelationProperty, order)`
  - `should mark @Masked fields as readOnly, masked and omitOnSubmit when user lacks DADOS_SENSIVEIS`
  - `should allow editing @Masked fields when user has DADOS_SENSIVEIS`
- [x] 3.3 Implementar `apps/backend/src/common/crud/metadata/dto-metadata.explorer.ts`:
  - Inspecionar `dtoClass` subindo pela cadeia de protótipos para coletar propriedades anotadas com `@ApiProperty` / `@ApiPropertyOptional`, `getMetadataStorage()` do `class-validator` e `@FormFieldMeta`.
  - Cruzar com `getMaskedFields(entityClass)` para aplicar restrições de `DADOS_SENSIVEIS` conforme as `userRoles`.
  - Marcar automaticamente `version` como `inputType: 'hidden'`, `hidden: true`.
- [x] 3.4 Anotar os DTOs e enriquecer os arquivos `*.config.ts` dos 3 módulos conforme Seção 5 da especificação:
  - `apps/backend/src/categorias/dto/categoria.dto.ts` + `apps/backend/src/categorias/categoria.config.ts`:
    - `@FormFieldMeta` para `nome` (`label: 'Nome da Categoria'`, `order: 1`), `valor` (`label: 'Valor (R$)'`, `inputType: 'currency'`, `order: 2`), `ativo` (`label: 'Categoria Ativa'`, `inputType: 'boolean'`, `order: 3`).
    - Filtros enriquecidos em `categoriaCrudConfig` (`nome` e `ativo` como `quickFilter: true`; `valor` com `controlType: 'currency'` e `createdAt` como filtros avançados).
  - `apps/backend/src/perfis/dto/perfil.dto.ts` + `apps/backend/src/perfis/perfil.config.ts`:
    - `@FormFieldMeta` para `nome` (`label: 'Nome do Perfil'`, `order: 1`), `roles` (`label: 'Permissões (Roles)'`, `inputType: 'multiselect'`, `optionsEndpoint: '/roles'`, `order: 2`), `ativo` (`label: 'Perfil Ativo'`, `inputType: 'boolean'`, `order: 3`).
    - Filtros enriquecidos em `perfilCrudConfig` (`nome` e `ativo` como `quickFilter: true`).
  - `apps/backend/src/users/dto/managed-user.dto.ts` + `apps/backend/src/users/user.config.ts`:
    - `@FormFieldMeta` para `nome` (`label: 'Nome Completo'`, `order: 1`), `email` (`label: 'E-mail'`, `inputType: 'email'`, `order: 2`), `senha` (`label: 'Senha Inicial'`, `inputType: 'password'`, `order: 3`), `perfilIds` (`label: 'Perfis de Acesso'`, `inputType: 'multiselect'`, `optionsEndpoint: '/perfis'`, `optionsValueKey: 'id'`, `optionsLabelKey: 'nome'`, `entityRelationProperty: 'perfis'`, `entityRelationValueKey: 'id'`, `order: 4`), `ativo` (`label: 'Usuário Ativo'`, `inputType: 'boolean'`, `order: 5`).
    - Filtros enriquecidos em `userCrudConfig` incluindo `nome`, `email`, `ativo` e `perfilId` (`relationField: 'perfis.id'`, `optionsEndpoint: '/perfis'`, `quickFilter: true`).
- [x] 3.5 Adicionar métodos `getMeta(user)`, `getFilterMeta(user)` e `getFormMeta(user)` em `CrudService` (`apps/backend/src/common/crud/crud.service.ts`) e expor os endpoints em `createCrudController` (`apps/backend/src/common/crud/create-crud-controller.ts`) **antes** de `@Get(':id')`:
  - `@Get('meta')` (`@Operation('${resource}:read')`) → retorna `CrudResourceMetaDto`.
  - `@Get('meta/filters')` (`@Operation('${resource}:read')`) → retorna `SearchFilterConfigDto`.
  - `@Get('meta/form')` (`@Operation('${resource}:read')`) → retorna `{ createForm: CrudFormSchemaDto; updateForm: CrudFormSchemaDto }`.
- [x] 3.6 **Testes** em `apps/backend/src/common/crud/create-crud-controller.spec.ts` e `apps/backend/src/crud-flow.integration.spec.ts`:
  - `GET /categorias/meta should return filters, createForm and updateForm with valor marked masked/readOnly when user lacks DADOS_SENSIVEIS`
  - `GET /categorias/meta should return valor editable and filterable when user has DADOS_SENSIVEIS`
  - `GET /users/meta should include senha in createForm and exclude senha in updateForm`
  - `GET /users?perfilId=<id> should filter users by associated perfil`
  - `POST /users with duplicate email should return 409 USER_EMAIL_EXISTS with details[{ field: 'email', message }]`
- [x] 3.7 **Checkpoint da Fase 3**: Executar `pnpm --filter backend test && pnpm --filter backend typecheck && pnpm --filter backend lint && pnpm --filter backend build`.

---

## Fase 4 — Frontend Base: Loading Global Singleton, Tratamento de Erros (3 Níveis) e Encapsulamento de Dialog/Toast

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 6.1, 6.2 e 6.3), `apps/frontend/src/app/app.config.ts`, `apps/frontend/src/app/app.html`, `apps/frontend/src/app/shared/components/ui/toast.service.ts`, `apps/frontend/src/app/shared/components/ui/toast.component.ts`, `apps/frontend/src/app/core/auth/auth.interceptor.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`.

- [x] 4.1 **Testes** em `apps/frontend/src/app/core/loading/loading.service.spec.ts` e `loading.interceptor.spec.ts`:
  - `should increment active requests on show() and decrement on hide()`
  - `should only set isLoading to true after 150ms debounce to avoid flicker on fast requests`
  - `should immediately cancel pending debounce timer if hide() is called before 150ms`
  - `loadingInterceptor should trigger LoadingService by default on HTTP requests`
  - `loadingInterceptor should NOT trigger LoadingService when SKIP_GLOBAL_LOADING is true in HttpContext`
- [x] 4.2 Criar `apps/frontend/src/app/core/loading/loading.service.ts`, `apps/frontend/src/app/core/loading/loading.interceptor.ts` e `apps/frontend/src/app/shared/components/ui/loading-overlay.component.ts` (`<ui-loading-overlay>`):
  - Exportar `SKIP_GLOBAL_LOADING` e função helper `withSkipGlobalLoading(context?: HttpContext): HttpContext`.
  - Renderizar `<ui-loading-overlay>` em `apps/frontend/src/app/app.html` e registrar `loadingInterceptor` em `apps/frontend/src/app/app.config.ts`.
- [x] 4.3 **Testes** em `apps/frontend/src/app/shared/components/ui/toast.service.spec.ts`:
  - `should expose success, error, info and warning methods`
  - `should maintain reactive toasts signal and delegate to ngx-sonner`
- [x] 4.4 Atualizar `apps/frontend/src/app/shared/components/ui/toast.service.ts` e `toast.component.ts`:
  - Encapsular `ngx-sonner` (`toast` e `<ngx-sonner-toaster>`) mantendo a API pública `success`, `error`, `info`, `warning` e o signal `toasts` para compatibilidade total com componentes e testes existentes.
- [x] 4.5 **Testes** em `apps/frontend/src/app/shared/components/ui/dialog/ui-dialog.service.spec.ts`:
  - `open should open a component inside CDK Dialog with UEG Design System panel classes`
  - `confirm should open UiConfirmDialogComponent and emit true when confirmed and false when cancelled`
- [x] 4.6 Criar o módulo encapsulado de Dialog em `apps/frontend/src/app/shared/components/ui/dialog/`:
  - `ui-dialog.types.ts` (`UiDialogConfig`, `UiConfirmOptions`, `UiDialogRef`)
  - `ui-confirm-dialog.component.ts` (Modal de confirmação com título, descrição, botão cancelar e botão confirmar com variante `destructive` ou `default`)
  - `ui-dialog.service.ts` (encapsulando `Dialog` do `@angular/cdk/dialog` sem expor o CDK diretamente para as telas).
- [x] 4.7 **Testes** em `apps/frontend/src/app/core/errors/form-error-handler.service.spec.ts` e `error.interceptor.spec.ts`:
  - `should classify 400 VALIDATION_ERROR with details as level 1 field errors`
  - `should classify 409 USER_EMAIL_EXISTS with details (or via fallback map) as level 1 field error on email control`
  - `should apply serverError to matching FormControls and clear serverError when control value changes`
  - `should classify 409 USER_LAST_ADMIN or PERFIL_IN_USE without field as level 2 business error and return banner message`
  - `errorInterceptor should catch status >= 500, status === 0 or unknown format as level 3 unexpected error and display friendly Toast`
- [x] 4.8 Criar `apps/frontend/src/app/core/errors/form-error-handler.service.ts` e `apps/frontend/src/app/core/errors/error.interceptor.ts`:
  - Implementar a classificação e aplicação de erros em `FormGroup` (Nível 1: Campo; Nível 2: Negócio Geral; Nível 3: Inesperado 500/Rede).
  - Atualizar `apps/frontend/src/app/shared/components/ui/input.component.ts` (+ template) para ler automaticamente o erro do `FormControl` associado (ou via input `[error]`) exibindo a mensagem de `serverError` ou das validações locais abaixo do campo.
  - Registrar `errorInterceptor` em `apps/frontend/src/app/app.config.ts`.
- [x] 4.9 **Checkpoint da Fase 4**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck`.

---

## Fase 5 — Frontend: `GenericCrudService`, `CrudTableDataSource`, `UiDataTable` e `UiPaginator`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 4.1, 4.2 e 4.3), `specs/design-system.md`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`.

- [x] 5.1 **Testes** em `apps/frontend/src/app/core/crud/generic-crud.service.spec.ts`:
  - `should serialize page, limit, multi-column sorts (field1:ASC,field2:DESC) and filters (field__op=value) in findAll`
  - `should serialize between and in filter arrays as comma-separated values`
  - `should call GET /:resource/meta and cache result`
  - `should pass version query param on remove(id, version)`
  - `should pass SKIP_GLOBAL_LOADING context when skipGlobalLoading option is true`
- [x] 5.2 Implementar `apps/frontend/src/app/core/crud/generic-crud.service.ts` conforme Seção 4.1 da especificação.
- [x] 5.3 **Testes** em `apps/frontend/src/app/shared/components/crud/crud-table-data-source.spec.ts`:
  - `single click toggleSort should cycle ASC -> DESC -> none and replace previous sort`
  - `shift+click toggleSort (multiSort=true) should append second column to sorts array and cycle its state independently`
  - `setPage, setPageSize and setFilters should trigger refresh and update items and total signals`
- [x] 5.4 Implementar `apps/frontend/src/app/shared/components/crud/crud-table-data-source.ts` conforme Seção 4.2 da especificação.
- [x] 5.5 **Testes** em `apps/frontend/src/app/shared/components/crud/ui-paginator.component.spec.ts`:
  - `should display current range and total items`
  - `should emit page change when clicking next, prev, first, last or page number`
  - `should emit limit change and reset to page 1 when changing page size selector`
- [x] 5.6 Implementar `apps/frontend/src/app/shared/components/crud/ui-paginator.component.ts` conforme Seção 4.3 da especificação.
- [x] 5.7 **Testes** em `apps/frontend/src/app/shared/components/crud/ui-data-table.component.spec.ts`:
  - `should render striped rows (zebra pattern) and column headers`
  - `should trigger single sort on header click and multi-sort on shift+click, showing priority badges (1, 2)`
  - `should format boolean columns as badges, currency-cents as BRL (R$) and masked values (99999 or missing role) as restricted badge`
  - `should render row actions respecting permission, visible(row) and disabled(row) predicates`
- [x] 5.8 Implementar `apps/frontend/src/app/shared/components/crud/ui-data-table.component.ts` conforme Seção 4.3 da especificação.
- [x] 5.9 **Checkpoint da Fase 5**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck`.

---

## Fase 6 — Frontend: Componente `SmartFilterBarComponent`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seção 4.4), `packages/utils/src/contracts/crud-meta.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`.

- [x] 6.1 **Testes** em `apps/frontend/src/app/shared/components/crud/smart-filter-bar.component.spec.ts`:
  - `should render quick filter inputs (text, select/boolean and master-detail) defined in SearchFilterConfigDto`
  - `should load dynamic options from optionsEndpoint for select quick filters`
  - `should handle master-detail cascade: selecting parent loads child options from childEndpoint with parentParamName and resets child value`
  - `should emit combined quick and advanced filters when clicking Buscar`
  - `should open Advanced Filters panel, allow adding/removing filter rows with field, allowed operators and value (including two inputs for between)`
  - `should clear all filters and emit empty array when clicking Limpar`
- [x] 6.2 Implementar `apps/frontend/src/app/shared/components/crud/smart-filter-bar.component.ts` conforme Seção 4.4 da especificação.
- [x] 6.3 **Checkpoint da Fase 6**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck`.

---

## Fase 7 — Frontend: `GenericCrudFormComponent` e `GenericCrudPageComponent`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seções 4.5, 4.6 e 6.1), `apps/frontend/src/app/core/errors/form-error-handler.service.ts`, `apps/frontend/src/app/shared/components/ui/dialog/ui-dialog.service.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`.

- [ ] 7.1 **Testes** em `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.spec.ts`:
  - `should dynamically build FormGroup controls and validators from CrudFormSchemaDto (create vs update)`
  - `should load options from optionsEndpoint for select and multiselect fields (e.g. /perfis and /roles)`
  - `should map entityRelationProperty (e.g. perfis -> perfilIds) when populating initialData in update mode`
  - `should convert currency field between BRL decimal display and integer cents on submit`
  - `should disable masked/readOnly fields and omit fields marked with omitOnSubmit from payload`
  - `should display field-level backend error (e.g. USER_EMAIL_EXISTS on email) directly below the field and clear it on edit`
  - `should display non-field business error (e.g. USER_LAST_ADMIN) in the top alert banner of the form`
- [ ] 7.2 Implementar `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.ts` (e modal wrapper `generic-crud-form-modal.component.ts`) conforme Seções 4.5 e 6.1 da especificação.
- [ ] 7.3 **Testes** em `apps/frontend/src/app/shared/components/crud/generic-crud-page.component.spec.ts`:
  - `should load metadata and initial table page on init`
  - `should show Novo button only when user has <resource>:create role`
  - `should open GenericCrudFormModal in create mode and refresh table after successful creation`
  - `should fetch latest entity via findOne, open GenericCrudFormModal in update mode and refresh table after update`
  - `should open confirmation dialog on delete, call service.remove(id, version) and show success toast`
- [ ] 7.4 Implementar `apps/frontend/src/app/shared/components/crud/generic-crud-page.component.ts` conforme Seção 4.6 da especificação.
- [ ] 7.5 **Checkpoint da Fase 7**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck`.

---

## Fase 8 — Implementação dos Cadastros de Categorias, Perfis e Usuários + Navegação

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seção 5), `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/app.html`, `apps/frontend/src/app/pages/admin/users-list.component.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`.

- [ ] 8.1 **Cadastro de Categorias (`/categorias`)**:
  - **Testes** em `apps/frontend/src/app/pages/categorias/categorias-page.component.spec.ts`:
    - `should configure GenericCrudPageComponent for resource categorias with Nome, Valor, Status and Criado em columns`
  - Criar `apps/frontend/src/app/pages/categorias/categorias.service.ts` (`extends GenericCrudService<CategoriaDto>`) e `apps/frontend/src/app/pages/categorias/categorias-page.component.ts`.
- [ ] 8.2 **Cadastro de Perfis (`/perfis`)**:
  - **Testes** em `apps/frontend/src/app/pages/perfis/perfis-page.component.spec.ts`:
    - `should configure GenericCrudPageComponent for resource perfis and disable edit/delete when row.sistema is true`
  - Criar `apps/frontend/src/app/pages/perfis/perfis.service.ts` (`extends GenericCrudService<PerfilDto>`) e `apps/frontend/src/app/pages/perfis/perfis-page.component.ts` (formatando opções de `/roles` e desabilitando edição/exclusão para perfis `sistema === true`).
- [ ] 8.3 **Cadastro de Usuários (`/admin` e `/users`)**:
  - **Testes** em `apps/frontend/src/app/pages/admin/users-list.component.spec.ts`:
    - `should render GenericCrudPageComponent for resource users with extra actions Aprovar (when inactive) and Redefinir Senha`
    - `should call activate and refresh table when clicking Aprovar`
    - `should call resetPassword and show toast when clicking Redefinir Senha`
  - Criar `apps/frontend/src/app/pages/admin/users.service.ts` (`extends GenericCrudService<UserDto>` com métodos `activate(id)` e `resetPassword(id)`).
  - Atualizar `apps/frontend/src/app/pages/admin/users-list.component.ts` para utilizar `GenericCrudPageComponent` com `SmartFilterBar`, `UiDataTable`, `UiPaginator`, Modal de criação/edição e as ações extras `Aprovar` e `Redefinir Senha`.
- [ ] 8.4 **Rotas e Sidebar (`app.routes.ts` e `app.html`)**:
  - Em `apps/frontend/src/app/app.routes.ts`:
    - Adicionar rota `{ path: 'categorias', component: CategoriasPageComponent, canActivate: [authGuard, roleGuard('categorias:read')] }`.
    - Adicionar rota `{ path: 'perfis', component: PerfisPageComponent, canActivate: [authGuard, roleGuard('perfis:read')] }`.
    - Manter `/admin` e adicionar alias `/users` apontando para `UsersListComponent` com `canActivate: [authGuard, roleGuard('users:read')]`.
  - Em `apps/frontend/src/app/app.html`:
    - Adicionar links na `<ui-sidebar>` para **Usuários** (`hasRole('users:read')`), **Perfis** (`hasRole('perfis:read')`) e **Categorias** (`hasRole('categorias:read')`) com ícones SVG consistentes.
- [ ] 8.5 **Checkpoint da Fase 8**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck && pnpm --filter frontend build`.

---

## Fase 9 — Documentação, Revisão de Critérios de Aceite e Validação Final do Monorepo

> **Contexto de Entrada da Fase:**
> - Ler: `specs/crud-generico-frontend.md` (Seção 7), `specs/design-system.md`, `specs/arquitetura.md`.
> - Skills ativas: `execute-plan`, `clean-code`.

- [ ] 9.1 Atualizar `specs/design-system.md` e `specs/arquitetura.md` documentando os novos componentes padronizados (`UiDataTable`, `UiPaginator`, `SmartFilterBar`, `GenericCrudForm`, `GenericCrudPage`, `UiDialogService`, `LoadingService` + `UiLoadingOverlay` e `ToastService` com `ngx-sonner`).
- [ ] 9.2 Verificar ausência total do tipo `any` nos arquivos criados/modificados:
  - `grep -rn ": any\|as any\|<any>" apps packages --include="*.ts" --exclude-dir=node_modules --exclude-dir=dist`
- [ ] 9.3 Executar validação completa na raiz do monorepo:
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm build`
- [ ] 9.4 Marcar todos os itens concluídos neste plano e atualizar a seção **"Observações"** abaixo.

---

## Observações (Preencher ao final de cada Fase)
- **Fase 0**: Estado inicial do monorepo validado (testes e typecheck 100% verdes). Instalados `@angular/cdk@^21.2.0` e `ngx-sonner` no workspace `frontend` e importado `@angular/cdk/overlay-prebuilt.css` em `apps/frontend/src/styles.css`. Build e testes do frontend validados com sucesso.
- **Fase 1**: Criados e exportados os contratos compartilhados de metadados de busca (`SmartFilterBar`) e formulários dinâmicos (`CrudFormSchemaDto`, `CrudResourceMetaDto`) em `@repo/utils`, além de `FILTER_OPERATORS` e `FilterOperator`. Testes unitários e build de `@repo/utils` 100% aprovados.
- **Fase 2**: Evoluído `BusinessException` e `AllExceptionsFilter` para suportar `details` por campo; atualizados os validadores de `CategoriasService`, `PerfisService` e `UsersService`; adicionado suporte a `relationField` e `requiredRole` em `FilterRule` e `crud-query.ts`; criado `SmartFilterMetadataService` e `ISmartFilterConfigProvider`. Testes, typecheck e lint do backend 100% aprovados.
- **Fase 3**: Implementados `@FormFieldMeta` e `DtoMetadataExplorer` com suporte a herança de DTOs (`BaseManagedUserDto` e `createUpdateDto`) e cruzamento com `@Masked`; enriquecidos DTOs e `CrudConfig` de Categorias, Perfis e Usuários; expostos endpoints `GET /:resource/meta`, `/meta/filters` e `/meta/form` no `createCrudController`. Testes unitários, de integração, lint, typecheck e build do backend 100% aprovados.
- **Fase 4**: Implementados `LoadingService` (singleton com debounce de 150ms), `loadingInterceptor` (com suporte a `SKIP_GLOBAL_LOADING`) e `<ui-loading-overlay>`; encapsulado `ngx-sonner` no `ToastService` e `ToastComponent` mantendo compatibilidade com signal `toasts`; criado módulo encapsulado de dialogs (`UiDialogService` e `UiConfirmDialogComponent` sobre `@angular/cdk/dialog`); implementados `FormErrorHandlerService` e `errorInterceptor` para tratamento padronizado de erros em 3 níveis e leitura automática de erros no `<ui-input>`. Testes e typecheck do frontend 100% aprovados.
- **Fase 5**: Implementados `GenericCrudService` (com serialização de paginação, multi-sort, filtros `campo__op=valor`, cache de `/meta`, `?version` em `remove` e `SKIP_GLOBAL_LOADING`), `CrudTableDataSource` (com clique simples e `Shift + Clique` para multi-sort), `UiPaginatorComponent` e `UiDataTableComponent` (linhas zebradas, prioridade de ordenação múltipla, formatação de `currency-cents`, máscara `99999`/`DADOS_SENSIVEIS`, badges e ações por linha). Testes e typecheck do frontend 100% aprovados.
- **Fase 6**: Implementado `SmartFilterBarComponent` com suporte completo a filtros rápidos (texto, select estático/dinâmico via `optionsEndpoint`, booleano e select mestre-detalhe em cascata via `masterDetail`) e painel expansível de Filtros Avançados dinâmico (seleção de campo, operadores permitidos e inputs adaptativos incluindo intervalo `between`). Testes e typecheck do frontend 100% aprovados.

