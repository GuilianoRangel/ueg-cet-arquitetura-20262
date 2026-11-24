# Plano de Implementação: Caso de Uso de Cadastro de Filmes (`filmes`) e Suporte a Editor WYSIWYG (`richtext`) no CRUD Genérico

> **Especificação de negócio e arquitetura (fonte da verdade):** [specs/filmes.md](../filmes.md)
> **Especificações complementares:** [specs/crud-generico.md](../crud-generico.md), [specs/crud-generico-frontend.md](../crud-generico-frontend.md)
> Em caso de dúvida, a especificação prevalece. **Nenhuma decisão arquitetural foi deixada em aberto**: se surgir qualquer imprevisto não coberto, **pare e pergunte** ao usuário (marque a tarefa como `[!]` bloqueada).

---

## Regras de Execução e Conformidade com `generic-crud-usecase` (Leia antes de começar)

1. **Execução Fase por Fase**:
   - Verifique qual é a primeira Fase com tarefas pendentes (`- [ ]`), leia os arquivos listados em **"Contexto de Entrada da Fase"**, marque a tarefa atual como em progresso (`- [/]`) ao iniciar e como concluída (`- [x]`) **somente após** todos os testes e validações da tarefa passarem.
2. **Skills Ativas Obrigatórias**:
   - Backend: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.
   - Frontend: `generic-crud-usecase`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`, `clean-code`.
3. **Princípios Mandatórios da Skill `generic-crud-usecase`**:
   - **Configuração Única (`filme.config.ts`)**: `filmeCrudConfig` declarado em arquivo próprio e reutilizado no `FilmesService` e `FilmesController`.
   - **Hooks e Validadores como Métodos Privados Nomeados**: É proibido usar funções anônimas inline com lógica no construtor; todo hook deve delegar para um método privado nomeado (`validar...`, `preparar...`).
   - **`BusinessException` com 4º parâmetro `field`**: Sempre informar o campo do formulário quando o erro for específico de um input (`'titulo'`, `'categoriaIds'`, `'sinopse'`, `'ativo'`).
   - **Relações e Serialização**: `relationInputFields: ['categoriaIds']` no `filmeCrudConfig`, `syncRelations` no `FilmesService` e `toJSON()` na entidade `Filme` para expor o getter `categoriaIds`.
   - **TDD Estrito e Proibição de `any`**: Escrever testes (`*.spec.ts`) antes da implementação e jamais usar `any`, `as any` ou `<any>`.
4. **Ambiente de Execução (NVM + PNPM)**:
   - Carregar ambiente nos comandos de terminal quando necessário:
     `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && export PNPM_HOME="/home/guiliano/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH" && <comando>`

---

## Fase 1 — Contratos Compartilhados (`packages/utils`)

> **Contexto de Entrada da Fase:**
> - Ler: `specs/filmes.md` (Seção 3), `packages/utils/src/contracts/entities.ts`, `packages/utils/src/contracts/crud-meta.ts`, `packages/utils/src/contracts/error-codes.ts`, `packages/utils/src/contracts/contracts.spec.ts`.
> - Skills ativas: `generic-crud-usecase`, `clean-code`.

- [ ] 1.1 **Testes** em `packages/utils/src/contracts/contracts.spec.ts`:
  - `should export FILME_GENEROS with predefined movie genres and validate FilmeDto shape`
  - `should include CATEGORIA_IN_USE, FILME_TITULO_ANO_EXISTS and FILME_CATEGORIA_INVALID in ERROR_CODES`
  - `should support richtext as a valid FormInputType in CrudFormFieldSchema`
- [ ] 1.2 Em `packages/utils/src/contracts/crud-meta.ts`, adicionar `'richtext'` ao union type `FormInputType`.
- [ ] 1.3 Em `packages/utils/src/contracts/entities.ts`, exportar a constante `FILME_GENEROS`, o tipo `FilmeGenero` e a interface `FilmeDto`.
- [ ] 1.4 Em `packages/utils/src/contracts/error-codes.ts`, adicionar `CATEGORIA_IN_USE`, `FILME_TITULO_ANO_EXISTS` e `FILME_CATEGORIA_INVALID` em `ERROR_CODES`.
- [ ] 1.5 **Checkpoint da Fase 1**: Executar `pnpm --filter @repo/utils test && pnpm --filter @repo/utils build` e garantir 100% de aprovação.

---

## Fase 2 — Backend: Entidade `Filme`, Migration TypeORM e Proteção `CATEGORIA_IN_USE`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/filmes.md` (Seções 4.1, 4.2 e 4.5), `apps/backend/src/categorias/entities/categoria.entity.ts`, `apps/backend/src/categorias/categorias.service.ts`, `apps/backend/src/database/data-source.ts`, `apps/backend/src/database/migrations.integration.spec.ts`.
> - Skills ativas: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`.

- [ ] 2.1 Criar a entidade `apps/backend/src/filmes/entities/filme.entity.ts` estendendo `BaseEntity`:
  - Decorar com `@Entity('filmes')` e `@Index('IDX_filmes_titulo_ano_ativo', ['titulo', 'ano'], { unique: true, where: '"deletedAt" IS NULL' })`.
  - Definir colunas `titulo` (`varchar`, 200), `ano` (`integer`), `diretor` (`varchar`, 150), `duracao` (`integer`), `sinopse` (`text`), `generos` (`simple-json`, `string[]`), `ativo` (`boolean`, default `true`).
  - Definir relação `@ManyToMany(() => Categoria, { eager: false })` com `@JoinTable({ name: 'filmes_categorias', joinColumn: { name: 'filme_id', referencedColumnName: 'id' }, inverseJoinColumn: { name: 'categoria_id', referencedColumnName: 'id' } })` para `categorias!: Categoria[]`.
  - Implementar getter `get categoriaIds(): string[]` e método `toJSON()` para incluir `categoriaIds` na serialização JSON.
- [ ] 2.2 Criar a migration `apps/backend/src/database/migrations/1760000002000-CreateFilmesAndFilmesCategorias.ts`:
  - Criar tabela `filmes` com todas as colunas de `BaseEntity` (`id`, `version`, `createdAt`, `updatedAt`, `deletedAt`, `ultimoUsuarioId`) e de `Filme` (`titulo`, `ano`, `diretor`, `duracao`, `sinopse`, `generos`, `ativo`).
  - Criar índice único parcial `IDX_filmes_titulo_ano_ativo` em `("titulo", "ano") WHERE "deletedAt" IS NULL`.
  - Criar tabela associativa `filmes_categorias` (`filme_id`, `categoria_id`) com chaves primárias compostas, índices e foreign keys com `ON DELETE CASCADE`.
  - Implementar método `down()` revertendo `filmes_categorias` e `filmes`.
- [ ] 2.3 Registrar `Filme` em `apps/backend/src/database/data-source.ts` e atualizar `apps/backend/src/database/migrations.integration.spec.ts` para validar:
  - Execução das 3 migrations em banco in-memory.
  - Existência das tabelas `filmes` e `filmes_categorias`.
  - Índice único parcial de `(titulo, ano)` com `deletedAt IS NULL` (rejeita duplicados ativos e permite recriar após soft-delete).
  - Reversão limpa de todas as migrations (`undoLastMigration`).
- [ ] 2.4 Evoluir `apps/backend/src/categorias/categorias.service.ts` e `apps/backend/src/categorias/categorias.service.spec.ts`:
  - Adicionar testes unitários em `categorias.service.spec.ts` garantindo que `remove` e `update` (quando `ativo: false`) lançam `BusinessException` com código `CATEGORIA_IN_USE` (`409 Conflict`) caso existam filmes ativos vinculados à categoria.
  - Implementar métodos privados nomeados `validarCategoriaSemFilmesRemove(ctx)` e `validarCategoriaSemFilmesInativacao(ctx)` em `CategoriasService`.
- [ ] 2.5 **Checkpoint da Fase 2**: Executar `pnpm --filter backend test migrations.integration.spec.ts` e `pnpm --filter backend test categorias.service.spec.ts`.

---

## Fase 3 — Backend: DTOs, `filme.config.ts`, `FilmesService`, `FilmesController` e `FilmesModule`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/filmes.md` (Seções 4.3, 4.4 e 4.5), `.agents/skills/generic-crud-usecase/SKILL.md`, `apps/backend/src/perfis/perfil.config.ts`, `apps/backend/src/users/users.service.ts`.
> - Skills ativas: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.

- [ ] 3.1 Criar `apps/backend/src/filmes/dto/filme.dto.ts`:
  - `CreateFilmeDto` com validações `class-validator`, `@ApiProperty` e `@FormFieldMeta` para `titulo`, `categoriaIds`, `generos`, `ano`, `duracao`, `diretor`, `sinopse` (`inputType: 'richtext'`) e `ativo`.
  - `UpdateFilmeDto = createUpdateDto(CreateFilmeDto)`.
- [ ] 3.2 Criar `apps/backend/src/filmes/filme.config.ts`:
  - Exportar `filmeCrudConfig` e `FILME_CRUD_CONFIG` com `resource: 'filmes'`, `relations: ['categorias']`, `relationInputFields: ['categoriaIds']`, `sortable` e `filters` (`titulo`, `categoriaId` com `relationField: 'categorias.id'`, `generos`, `ano`, `diretor`, `duracao`, `ativo`).
- [ ] 3.3 **Testes** em `apps/backend/src/filmes/filmes.service.spec.ts` (escrever antes de implementar o service):
  - `should create a filme with valid categorias, generos and sanitized sinopse HTML`
  - `should serialize categoriaIds via toJSON() on returned Filme entity`
  - `should list filmes via findAll with relations (categorias) and filter by categoriaId and titulo`
  - `should reject creation and update when (titulo, ano) already exists (FILME_TITULO_ANO_EXISTS with field "titulo")`
  - `should allow reusing (titulo, ano) after previous filme is soft-deleted`
  - `should reject creation and update when any categoriaId is non-existent or inactive (FILME_CATEGORIA_INVALID with field "categoriaIds")`
  - `should strip unsafe HTML tags (<script>, onerror) from sinopse and reject empty sinopse HTML (e.g. "<p><br></p>") with field "sinopse"`
  - `should sync categorias relation on update and enforce optimistic lock (version)`
- [ ] 3.4 Implementar `apps/backend/src/filmes/filmes.service.ts`:
  - Estender `CrudService<Filme, CreateFilmeDto, UpdateFilmeDto>`.
  - Registrar hooks no construtor delegando exclusivamente para métodos privados nomeados:
    - `prepararDadosCreate` / `prepararDadosUpdate` (sanitização de `sinopse` e defaults)
    - `validarSinopseCreate` / `validarSinopseUpdate`
    - `validarTituloAnoUnicoCreate` / `validarTituloAnoUnicoUpdate`
    - `validarCategoriasCreate` / `validarCategoriasUpdate`
  - Sobrescrever `syncRelations` para atualizar a relação `ManyToMany` `categorias`.
- [ ] 3.5 Implementar `apps/backend/src/filmes/filmes.controller.ts` (`extends createCrudController(filmeCrudConfig)`) e `apps/backend/src/filmes/filmes.module.ts`, registrando `FilmesModule` em `apps/backend/src/app.module.ts`.
- [ ] 3.6 **Checkpoint da Fase 3**: Executar `pnpm --filter backend test && pnpm --filter backend typecheck && pnpm --filter backend lint`.

---

## Fase 4 — Frontend: `UiRichTextEditorComponent` e Suporte a `richtext` no `GenericCrudFormComponent`

> **Contexto de Entrada da Fase:**
> - Ler: `specs/filmes.md` (Seções 5.1 e 5.2), `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.ts`, `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.html`, `apps/frontend/src/app/core/errors/form-error-handler.service.ts`.
> - Skills ativas: `angular-dev`, `angular-testing`, `tailwind-design-system`, `frontend-design`, `clean-code`.

- [ ] 4.1 **Testes** em `apps/frontend/src/app/shared/components/ui/rich-text-editor.component.spec.ts`:
  - `should render toolbar buttons (bold, italic, underline, unordered list, ordered list, clear) and editable area`
  - `should bind initial HTML value via ControlValueAccessor and emit sanitized HTML on input`
  - `should emit empty string when editable content has only whitespace or empty tags`
  - `should strip unsafe <script> tags and inline event handlers when sanitizing HTML`
  - `should disable toolbar buttons and contenteditable when form control is disabled`
  - `should display error message and destructive border when error input is provided`
- [ ] 4.2 Implementar `apps/frontend/src/app/shared/components/ui/rich-text-editor.component.ts` seguindo o Design System institucional.
- [ ] 4.3 **Testes** em `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.spec.ts`:
  - Adicionar teste `should render ui-rich-text-editor when field inputType is richtext and include its HTML value in formSubmit payload`.
- [ ] 4.4 Evoluir `GenericCrudFormComponent` (`.ts` e `.html`) importando `UiRichTextEditorComponent` e adicionando `@case ('richtext')`, e adicionar `FILME_TITULO_ANO_EXISTS: 'titulo'` e `FILME_CATEGORIA_INVALID: 'categoriaIds'` no `FIELD_CODE_FALLBACK_MAP` de `FormErrorHandlerService`.
- [ ] 4.5 **Checkpoint da Fase 4**: Executar `pnpm --filter frontend test && pnpm --filter frontend typecheck`.

---

## Fase 5 — Frontend: Cadastro de Filmes (`/filmes`), Rota e Sidebar + Validação Final

> **Contexto de Entrada da Fase:**
> - Ler: `specs/filmes.md` (Seção 5.3), `apps/frontend/src/app/pages/categorias/categorias-page.component.ts`, `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/app.html`.
> - Skills ativas: `generic-crud-usecase`, `angular-dev`, `angular-testing`, `clean-code`.

- [ ] 5.1 **Testes** em `apps/frontend/src/app/pages/filmes/filmes-page.component.spec.ts`:
  - `should configure GenericCrudPageComponent for resource filmes with Titulo, Categorias, Generos, Ano, Diretor, Duracao and Status columns`
  - `should format categorias as names array, generos as array and duracao with min suffix`
- [ ] 5.2 Criar `apps/frontend/src/app/pages/filmes/filmes.service.ts` (`extends GenericCrudService<FilmeDto>`) e `apps/frontend/src/app/pages/filmes/filmes-page.component.ts` (`.html`, `.scss`).
- [ ] 5.3 Atualizar `apps/frontend/src/app/app.routes.ts` (adicionando a rota `/filmes` com `canActivate: [authGuard, roleGuard('filmes:read')]`) e `apps/frontend/src/app/app.html` (adicionando link **Filmes** na `<ui-sidebar>` protegido por `authService.hasRole('filmes:read')`).
- [ ] 5.4 Executar o checklist final de conformidade do monorepo:
  - Verificar ausência de `any`: `grep -rn ": any\|as any\|<any>" apps packages --include="*.ts" --exclude-dir=node_modules --exclude-dir=dist`
  - Executar `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` na raiz do monorepo.

---

## Observações (Preencher ao final de cada Fase)
- *(A preencher durante a execução)*

