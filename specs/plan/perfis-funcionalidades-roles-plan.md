# Plano de Implementação: Tabelas Relacionais de Funcionalidades e Ações, Sincronização de Catálogo e Tela Customizada de Perfis

> **Especificação de negócio e arquitetura (fonte da verdade):** [specs/perfis-funcionalidades-roles.md](../perfis-funcionalidades-roles.md)
> **Especificações complementares:** [specs/crud-generico.md](../crud-generico.md) e [specs/crud-generico-frontend.md](../crud-generico-frontend.md)
> Em caso de dúvida, a especificação prevalece. Se surgir qualquer imprevisto não coberto, **pare e pergunte** ao usuário (marque a tarefa como `[!]` bloqueada).

---

## Regras de Execução e Isolamento por Sessão (Leia antes de começar)

1. **Execução Fase por Fase**:
   - Verifique qual é a primeira Fase com tarefas pendentes (`- [ ]`), leia os arquivos listados em **"Contexto de Entrada da Fase"**, marque a tarefa atual como em progresso (`- [/]`) ao iniciar e como concluída (`- [x]`) **somente após** os testes e validações passarem.
   - Ao concluir cada Fase, registre um resumo na seção **"Observações"** no final deste arquivo e realize o commit correspondente.
2. **Skills Ativas Obrigatórias (`AGENT.md`)**:
   - Backend: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.
   - Frontend: `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`, `clean-code`.
   - Processo: `execute-plan`.
3. **TDD Estrito**:
   - Escreva/atualize primeiro o arquivo `*.spec.ts`, execute o runner de testes para confirmar a falha inicial e só então implemente o código de produção até ficar 100% verde.
4. **Proibição Estrita do Tipo `any`**:
   - É terminantemente proibido usar `any`, `as any` ou `<any>` em qualquer arquivo `.ts` (produção ou teste).
5. **Ambiente de Execução (NVM + PNPM)**:
   - Carregue o Node via NVM antes de rodar comandos:
     `export PATH=/home/guiliano/.nvm/versions/node/v24.15.0/bin:$PATH`

---

## Fase 1 — Contratos Compartilhados e Padronização de `SENSITIVE_DATA_ROLE` (`packages/utils`)

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seções 2 e 5.1), `packages/utils/src/contracts/permissions.ts`, `packages/utils/src/contracts/contracts.spec.ts`, `packages/utils/src/index.ts`.
> - Skills ativas: `execute-plan`, `clean-code`.

- [x] 1.1 **Testes** em `packages/utils/src/contracts/contracts.spec.ts`:
  - Atualizar o teste de `SENSITIVE_DATA_ROLE` para validar que seu valor é `'global:dados-sensiveis'` e que `ROLE_FORMAT.test(SENSITIVE_DATA_ROLE)` retorna `true`.
  - Adicionar testes validando os contratos `FuncionalidadeAcaoDto`, `FuncionalidadeGroupDto` e `RolesSyncResultDto`.
- [x] 1.2 Atualizar `packages/utils/src/contracts/permissions.ts`:
  - Alterar `export const SENSITIVE_DATA_ROLE = "global:dados-sensiveis";`.
- [x] 1.3 Criar `packages/utils/src/contracts/roles.ts`:
  - Definir e exportar `FuncionalidadeAcaoDto` (`{ id: string; acao: string; role: string }`).
  - Definir e exportar `FuncionalidadeGroupDto` (`{ id: string; nome: string; acoes: FuncionalidadeAcaoDto[] }`).
  - Definir e exportar `RolesSyncResultDto` (`{ addedActions: number; removedActions: number; totalActiveActions: number }`).
  - Exportar `./contracts/roles` em `packages/utils/src/index.ts`.
- [x] 1.4 **Checkpoint da Fase 1**: Executar `pnpm --filter @repo/utils test && pnpm --filter @repo/utils build` e garantir 100% de aprovação.

---

## Fase 2 — Backend: Entidades `Funcionalidade`, `FuncionalidadeAcao`, Evolução de `Perfil` e Migration TypeORM

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seções 2 e 3), `apps/backend/src/auth/permissions/roles-catalog.ts`, `apps/backend/src/perfis/entities/perfil.entity.ts`, `apps/backend/src/migrations/`, `apps/backend/src/database/migrations.integration.spec.ts`.
> - Skills ativas: `execute-plan`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.

- [x] 2.1 **Testes** em `apps/backend/src/auth/permissions/roles-catalog.spec.ts`:
  - Validar que `RolesCatalog.isValid` aceita `'global:dados-sensiveis'` e `'perfis:sync'` diretamente via `ROLE_FORMAT` e rejeita strings sem `:`.
- [x] 2.2 Simplificar `apps/backend/src/auth/permissions/roles-catalog.ts`:
  - Em `isValid(role: string)`, validar exclusivamente com `ROLE_FORMAT.test(role)` e ajustar a mensagem de erro para indicar o formato `funcionalidade:acao`.
- [x] 2.3 Criar a entidade `Funcionalidade` em `apps/backend/src/perfis/entities/funcionalidade.entity.ts`:
  - `@Entity('funcionalidades')` estendendo `BaseEntity`.
  - `@Index('IDX_funcionalidades_nome_ativo', ['nome'], { unique: true, where: '"deletedAt" IS NULL' })`.
  - Coluna `nome` (`varchar`, length `100`).
  - Relação `@OneToMany(() => FuncionalidadeAcao, (acao) => acao.funcionalidade) acoes!: FuncionalidadeAcao[];`.
- [x] 2.4 Criar a entidade `FuncionalidadeAcao` em `apps/backend/src/perfis/entities/funcionalidade-acao.entity.ts`:
  - `@Entity('funcionalidades_acoes')` estendendo `BaseEntity`.
  - `@Index('IDX_funcionalidades_acoes_unique_ativo', ['funcionalidadeId', 'acao'], { unique: true, where: '"deletedAt" IS NULL' })`.
  - Coluna `funcionalidadeId` (`uuid`) e `@ManyToOne(() => Funcionalidade, (f) => f.acoes, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'funcionalidadeId' }) funcionalidade!: Funcionalidade;`.
  - Coluna `acao` (`varchar`, length `100`).
- [x] 2.5 Evoluir a entidade `Perfil` em `apps/backend/src/perfis/entities/perfil.entity.ts`:
  - Remover a coluna `roles` (`simple-json`).
  - Adicionar relação `@ManyToMany(() => FuncionalidadeAcao)` com `@JoinTable({ name: 'perfis_funcionalidades_acoes', joinColumn: { name: 'perfil_id', referencedColumnName: 'id' }, inverseJoinColumn: { name: 'funcionalidade_acao_id', referencedColumnName: 'id' } }) acoes!: FuncionalidadeAcao[];`.
  - Adicionar getter/propriedade virtual ou helper para expor `acaoIds`, `funcionalidades` e `roles` quando `acoes` estiver carregada.
- [x] 2.6 Criar/atualizar Migration TypeORM e testes de migration:
  - Criar migration `apps/backend/src/migrations/1710000000001-CreateFuncionalidadesAndAcoes.ts` que cria as tabelas `funcionalidades`, `funcionalidades_acoes` (com seus respectivos índices únicos parciais `WHERE "deletedAt" IS NULL`), cria a tabela pivô `perfis_funcionalidades_acoes` e remove a coluna `roles` de `perfis`.
  - Registrar `Funcionalidade` e `FuncionalidadeAcao` no `data-source.ts`, `database.module.ts`, `perfis.module.ts` e nos módulos de teste.
  - Atualizar `apps/backend/src/database/migrations.integration.spec.ts` para verificar a criação das tabelas `funcionalidades`, `funcionalidades_acoes`, `perfis_funcionalidades_acoes` e os índices parciais.
- [x] 2.7 **Checkpoint da Fase 2**: Executar `pnpm --filter backend test src/auth/permissions/roles-catalog.spec.ts src/database/migrations.integration.spec.ts` e garantir 100% de aprovação.

---

## Fase 3 — Backend: `RolesSyncService`, `SeedService` e `PermissionsService`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seções 4 e 5.4), `apps/backend/src/database/seed/seed.service.ts`, `apps/backend/src/auth/permissions/permissions.service.ts`.
> - Skills ativas: `execute-plan`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.

- [x] 3.1 **Testes** para `RolesSyncService` e `SeedService` em `apps/backend/src/database/seed/seed.service.spec.ts`:
  - `should populate funcionalidades and funcionalidades_acoes from RolesCatalog and link all active actions to Administrador perfil`
  - `should soft-delete FuncionalidadeAcao (and Funcionalidade when empty) when a role is removed from RolesCatalog`
  - `should create a brand new UUID when a previously soft-deleted action is re-added to RolesCatalog (never restoring old ID)`
  - `should automatically link newly synced actions to Administrador perfil and invalidate permissions cache`
- [x] 3.2 Criar `RolesSyncService` em `apps/backend/src/auth/permissions/roles-sync.service.ts` (ou `apps/backend/src/perfis/roles-sync.service.ts`) e integrá-lo ao `SeedService`:
  - Implementar `sync(): Promise<RolesSyncResultDto>` dentro de `TransactionRunner.runInTransaction`:
    1. Extrair pares `(funcionalidade, acao)` de `RolesCatalog.all()`.
    2. Fazer `softRemove` nas `FuncionalidadeAcao` ativas que não estão mais no catálogo.
    3. Fazer `softRemove` nas `Funcionalidade` ativas que ficaram sem nenhuma ação no catálogo.
    4. Para cada funcionalidade do catálogo sem registro ativo (`deletedAt IS NULL`), criar novo registro (novo UUID).
    5. Para cada `(funcionalidade, acao)` do catálogo sem registro ativo (`deletedAt IS NULL`), criar novo registro (novo UUID), sem restaurar registros soft-deleted anteriores.
    6. Criar ou atualizar o perfil `Administrador` (`sistema: true`, `ativo: true`) vinculando todas as `FuncionalidadeAcao` ativas.
    7. Se houve alteração, chamar `this.permissionsService.invalidateAll()`.
  - Atualizar `SeedService` para delegar a sincronização de roles e do perfil `Administrador` ao `RolesSyncService` antes de garantir a criação do usuário admin.
- [x] 3.3 **Testes** em `apps/backend/src/auth/permissions/permissions.service.spec.ts`:
  - Atualizar os testes para montar `Perfil` com `acoes: FuncionalidadeAcao[]` e `funcionalidade: Funcionalidade`.
  - Adicionar teste garantindo que ações com `deletedAt !== null` ou funcionalidades com `deletedAt !== null` são ignoradas em `getEffectiveRoles`.
- [x] 3.4 Atualizar `apps/backend/src/auth/permissions/permissions.service.ts`:
  - Carregar `relations: ['perfis', 'perfis.acoes', 'perfis.acoes.funcionalidade']`.
  - Construir o conjunto de roles efetivas (`${acao.funcionalidade.nome}:${acao.acao}`) apenas quando `perfil.ativo && !perfil.deletedAt && !acao.deletedAt && acao.funcionalidade && !acao.funcionalidade.deletedAt`.
- [x] 3.5 **Checkpoint da Fase 3**: Executar `pnpm --filter backend test src/database/seed/seed.service.spec.ts src/auth/permissions/permissions.service.spec.ts` e garantir 100% de aprovação.

---

## Fase 4 — Backend: Endpoints `/roles` (`/roles/sync`) e Refatoração de `PerfisService`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seções 5.2 e 5.3), `apps/backend/src/perfis/roles-catalog.controller.ts`, `apps/backend/src/perfis/perfis.service.ts`, `apps/backend/src/perfis/dto/perfil.dto.ts`.
> - Skills ativas: `execute-plan`, `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`.

- [x] 4.1 **Testes** em `apps/backend/src/perfis/roles-catalog.controller.spec.ts`:
  - `GET /roles should return active funcionalidades and their active acoes grouped and sorted`
  - `POST /roles/sync should require perfis:sync role and invoke RolesSyncService.sync()`
- [x] 4.2 Evoluir `apps/backend/src/perfis/roles-catalog.controller.ts`:
  - `GET /roles` (`@Operation('perfis:read')`): buscar do banco as `Funcionalidade`s ativas com suas `FuncionalidadeAcao`s ativas e retornar `{ funcionalidades: FuncionalidadeGroupDto[] }`.
  - `POST /roles/sync` (`@Operation('perfis:sync')`): acionar `RolesSyncService.sync()` e retornar `RolesSyncResultDto`.
- [x] 4.3 **Testes** em `apps/backend/src/perfis/perfis.service.spec.ts`:
  - Atualizar cenários de criação e edição de perfil para enviar `acaoIds: string[]` (IDs de `FuncionalidadeAcao` ativas).
  - Testar falha `400 PERFIL_ACAO_INVALID` (com `field: 'acaoIds'`) quando um `acaoId` não existe ou está com `deletedAt !== null`.
  - Testar que o retorno de `create`, `update`, `findOne` e `findAll` inclui `acaoIds`, `funcionalidades` (nomes únicos das funcionalidades) e `roles`.
- [x] 4.4 Evoluir `CreatePerfilDto`, `UpdatePerfilDto` (`apps/backend/src/perfis/dto/perfil.dto.ts`), `perfilCrudConfig` (`apps/backend/src/perfis/perfil.config.ts`) e `PerfisService` (`apps/backend/src/perfis/perfis.service.ts`):
  - Substituir `roles: string[]` por `acaoIds: string[]` (`@IsArray()`, `@ArrayUnique()`, `@IsUUID('4', { each: true })`) em `CreatePerfilDto`.
  - Configurar `relations: ['acoes', 'acoes.funcionalidade']` em `perfilCrudConfig`.
  - Em `PerfisService`, criar métodos privados nomeados para:
    - Validar `acaoIds` contra `FuncionalidadeAcao` ativas (`validarAcoesCreate` e `validarAcoesUpdate`).
    - Vincular as entidades `FuncionalidadeAcao` em `beforeCreate` e `beforeUpdate` (`vincularAcoesCreate` e `vincularAcoesUpdate`).
- [x] 4.5 Atualizar `apps/backend/src/crud-flow.integration.spec.ts` e demais specs do backend para utilizar `SENSITIVE_DATA_ROLE` (`'global:dados-sensiveis'`), o novo formato de `GET /roles`, `POST /roles/sync` e `acaoIds` em `/perfis`.
- [x] 4.6 **Checkpoint da Fase 4**: Executar `pnpm --filter backend test` e `pnpm --filter backend build` garantindo que todas as 27 suítes de teste do backend passem 100%.

---

## Fase 5 — Frontend: Extensão do `GenericCrudPageComponent` (Header Actions, Custom Modal e Modo Read-Only)

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seção 6.1), `apps/frontend/src/app/shared/components/crud/generic-crud-page.component.ts`, `apps/frontend/src/app/shared/components/crud/generic-crud-page.component.html`, `apps/frontend/src/app/pages/categorias/categorias-page.component.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `clean-code`.

- [ ] 5.1 **Testes** em `apps/frontend/src/app/shared/components/crud/generic-crud-page.component.spec.ts`:
  - `should render headerActions only when user has the required permission and execute handler on click`
  - `should open customModalComponent when configured instead of GenericCrudFormModalComponent`
  - `should keep Editar button enabled when isRowReadOnly(row) is true and pass readOnly: true to modal data`
- [ ] 5.2 Evoluir `GenericCrudPageComponent` (`generic-crud-page.component.ts` e `generic-crud-page.component.html`):
  - Exportar interface `CrudPageHeaderAction` (`id`, `label`, `variant?`, `permission?`, `handler: () => void`).
  - Adicionar em `CrudPageConfig<E>`:
    - `headerActions?: CrudPageHeaderAction[]`
    - `customModalComponent?: Type<unknown>`
    - `isRowReadOnly?: (row: E) => boolean`
  - Renderizar os botões de `visibleHeaderActions()` no cabeçalho ao lado do botão de criação.
  - Em `openCreateModal()` e `openEditModal(row)`: se `customModalComponent` estiver definido, abrir `dialogService.open(cfg.customModalComponent, { data: { mode, initialData: row, readOnly: isReadOnly, entityLabel: cfg.entityLabel, service: cfg.service } })`.
- [ ] 5.3 Atualizar referências de `'DADOS_SENSIVEIS'` para `SENSITIVE_DATA_ROLE` (`'global:dados-sensiveis'`) em `apps/frontend/src/app/pages/categorias/categorias-page.component.ts` e nos testes `categorias-page.component.spec.ts`, `ui-data-table.component.spec.ts` e `generic-crud-form.component.spec.ts`.
- [ ] 5.4 **Checkpoint da Fase 5**: Executar `pnpm --filter frontend test` e confirmar aprovação dos testes.

---

## Fase 6 — Frontend: Formulário Customizado de Perfis (Cards de Funcionalidades e Toggles) e Sincronização

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md` (Seções 6.2 e 6.3), `apps/frontend/src/app/pages/perfis/perfis.service.ts`, `apps/frontend/src/app/pages/perfis/perfis-page.component.ts`.
> - Skills ativas: `execute-plan`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`, `clean-code`.

- [ ] 6.1 Evoluir `PerfisService` em `apps/frontend/src/app/pages/perfis/perfis.service.ts`:
  - Atualizar `PerfilDto` com `acaoIds: string[]`, `funcionalidades: string[]` e `roles: string[]`.
  - Adicionar método `getRolesCatalog(): Observable<{ funcionalidades: FuncionalidadeGroupDto[] }>` (`GET /roles`).
  - Adicionar método `syncRoles(): Observable<RolesSyncResultDto>` (`POST /roles/sync`).
- [ ] 6.2 **Testes** para `PerfilFormModalComponent` em `apps/frontend/src/app/pages/perfis/perfil-form-modal.component.spec.ts`:
  - `should render a card for each funcionalidade and toggle buttons for each acao`
  - `should mark acao toggles as active when their id is in initialData.acaoIds and inactive otherwise`
  - `should toggle all actions of a funcionalidade when clicking the card global toggle`
  - `should submit payload with selected acaoIds only when clicking Salvar button`
  - `should disable all inputs and toggles and hide Salvar button when opened in readOnly mode (sistema=true)`
- [ ] 6.3 Criar `PerfilFormModalComponent` em `apps/frontend/src/app/pages/perfis/perfil-form-modal.component.ts` (e `.html`):
  - Seguir os padrões do Design System (Tailwind CSS v4, tokens semânticos, acessibilidade `role="switch"`, `aria-checked`).
  - Renderizar campos `Nome do Perfil` e `Perfil Ativo`.
  - Renderizar painel de **Cards agrupados por Funcionalidade**:
    - Cabeçalho do Card com nome da funcionalidade e **Toggle Global da Funcionalidade** (ativo quando todas as ações da funcionalidade estão selecionadas).
    - Corpo do Card com **Toggle Button individual** para cada ação (`acao`) da funcionalidade.
  - Quando `readOnly === true`, desabilitar todos os controles e **não renderizar** o botão `"Salvar"`.
  - Quando `readOnly === false`, enviar `create` ou `update` com `{ nome, ativo, acaoIds, version }` ao clicar em `"Salvar"`.
- [ ] 6.4 **Testes** em `apps/frontend/src/app/pages/perfis/perfis-page.component.spec.ts`:
  - `should configure headerAction for Sincronizar Permissões with permission perfis:sync`
  - `should display unique funcionalidades badges limited to at most 10 items in table column`
  - `should configure customModalComponent and isRowReadOnly for sistema profiles`
- [ ] 6.5 Atualizar `PerfisPageComponent` em `apps/frontend/src/app/pages/perfis/perfis-page.component.ts`:
  - Configurar `customModalComponent: PerfilFormModalComponent`.
  - Configurar `isRowReadOnly: (row) => row.sistema` e `canDeleteRow: (row) => !row.sistema`.
  - Configurar `headerActions` com o botão `"Sincronizar Permissões"` (`permission: 'perfis:sync'`), que chama `perfisService.syncRoles()`, exibe toast de sucesso e recarrega a tabela.
  - Ajustar a coluna de permissões para `"Funcionalidades"`, extraindo `(row.funcionalidades ?? []).slice(0, 10)`.
- [ ] 6.6 **Checkpoint da Fase 6**: Executar `pnpm --filter frontend test` e `pnpm --filter frontend typecheck` garantindo 100% de aprovação.

---

## Fase 7 — Validação Final Ponta a Ponta, Qualidade e Documentação

> **Contexto de Entrada da Fase:**
> - Ler: `specs/perfis-funcionalidades-roles.md`, `specs/arquitetura.md`, `specs/crud-generico.md`.
> - Skills ativas: `execute-plan`, `clean-code`.

- [ ] 7.1 Verificar ausência total do tipo `any` nos arquivos criados/modificados (`grep -rn ": any\|as any\|<any>" packages/ apps/`).
- [ ] 7.2 Executar `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` na raiz do monorepo, garantindo que todos os pacotes compilam e passam sem erros.
- [ ] 7.3 Atualizar `specs/arquitetura.md` e `specs/crud-generico.md` documentando as tabelas `funcionalidades`, `funcionalidades_acoes`, `perfis_funcionalidades_acoes`, a role `global:dados-sensiveis`, o endpoint `POST /roles/sync` (`perfis:sync`) e o formulário customizado de Perfis.

---

## Observações de Execução

- **Fase 1 Concluída**: Padronizado `SENSITIVE_DATA_ROLE` para `'global:dados-sensiveis'` em `@repo/utils`, criado contrato de roles em `packages/utils/src/contracts/roles.ts` (`FuncionalidadeAcaoDto`, `FuncionalidadeGroupDto`, `RolesSyncResultDto`) e exportado no pacote. Testes e build de `@repo/utils` 100% verdes.
- **Fase 2 Concluída**: Validação de roles simplificada via `ROLE_FORMAT` em `RolesCatalog`; criadas entidades `Funcionalidade`, `FuncionalidadeAcao` e relação `@ManyToMany` em `Perfil` com tabela pivô `perfis_funcionalidades_acoes` e remoção da coluna `roles`; criada migration `1793200000000-CreateFuncionalidadesAndAcoes.ts` com índices únicos parciais (`deletedAt IS NULL`); testes de migration e roles catalog 100% verdes.
- **Fase 3 Concluída**: Criado `RolesSyncService` com suporte a sincronização atômica (adição de novas funcionalidades/ações gerando novos UUIDs, soft delete de obsoletas e de funcionalidades vazias, auto-associação de todas as ações ativas ao perfil `Administrador` e invalidação de cache); `SeedService` integrado ao `RolesSyncService`; `PermissionsService` atualizado para carregar relações `acoes.funcionalidade` ignorando registros deletados; testes de seed e permissions 100% verdes.
- **Fase 4 Concluída**: Implementados endpoints `GET /roles` (agrupamento e ordenação de funcionalidades/ações) e `POST /roles/sync` (`perfis:sync`); DTOs de Perfil refatorados para `acaoIds: string[]` com validação de UUID e integridade semântica em `PerfisService` (`validarAcoesCreate` e `validarAcoesUpdate`), preservação de prototype em `MaskService` e sincronização de relações em `syncRelations`; todas as 27 suítes de teste do backend e o build 100% verdes.

