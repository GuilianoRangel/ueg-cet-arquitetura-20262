# Especificação: Caso de Uso de Cadastro de Filmes (`filmes`) e Evolução do Formulário Genérico com Editor WYSIWYG (`richtext`)

> **Status:** APROVADA PARA PLANEJAMENTO (Todas as decisões de escopo Q1–Q6 foram esclarecidas com o usuário).
> **Plano técnico:** [specs/plan/filmes-plan.md](plan/filmes-plan.md)
> **Documentos relacionados:** [specs/crud-generico.md](crud-generico.md), [specs/crud-generico-frontend.md](crud-generico-frontend.md), [specs/design-system.md](design-system.md)

---

## 1. Visão Geral

### 1.1 História de Usuário
**Como** gestor ou operador autenticado da plataforma UEG,
**quero** gerenciar o catálogo de **Filmes** (contendo Título, Categorias vinculadas, Ano de lançamento, Diretor, Duração em minutos, Gêneros e Sinopse em texto rico WYSIWYG),
**para** manter o acervo audiovisual estruturado, pesquisável por múltiplos filtros e protegido por regras de integridade de domínio e permissões RBAC (`filmes:read`, `filmes:create`, `filmes:update`, `filmes:delete`).

### 1.2 Escopo desta Entrega
| Item | Incluído |
| :--- | :---: |
| Contratos compartilhados em `@repo/utils`: `FILME_GENEROS`, `FilmeDto`, novos códigos em `ERROR_CODES` e tipo `'richtext'` em `FormInputType` | ✅ |
| Entidade `Filme` (`apps/backend/src/filmes/entities/filme.entity.ts`) com relação N:N para `Categoria`, coluna `simple-json` para `generos`, getters `categoriaIds`/`categoriaNomes` e serialização `toJSON()` | ✅ |
| Migration TypeORM (`CreateFilmesAndFilmesCategorias`) com tabelas `filmes`, `filmes_categorias` e índice único parcial `(LOWER(titulo), ano) WHERE "deletedAt" IS NULL` | ✅ |
| DTOs `CreateFilmeDto` e `UpdateFilmeDto` (`createUpdateDto`) anotados com `class-validator`, `@ApiProperty` e `@FormFieldMeta` | ✅ |
| Configuração `filmeCrudConfig` (`apps/backend/src/filmes/filme.config.ts`) com `relations: ['categorias']`, `relationInputFields: ['categoriaIds']`, filtros rápidos/avançados e ordenação | ✅ |
| `FilmesService` estendendo `CrudService` com métodos privados nomeados para hooks/validadores (`validarTituloAnoUnicoCreate/Update`, `validarCategoriasCreate/Update`, `sanitizarSinopseHook`, `syncRelations`) | ✅ |
| Regra de integridade em `CategoriasService`: impedir exclusão ou inativação de `Categoria` vinculada a filmes ativos (`CATEGORIA_IN_USE`) | ✅ |
| Componente de Editor Rico Nativo do Design System (`UiRichTextEditorComponent`) com barra de ferramentas (Negrito, Itálico, Sublinhado, Lista ordenada, Lista não ordenada, Limpar formatação) e sanitização segura de HTML | ✅ |
| Evolução do `GenericCrudFormComponent` para renderizar controles `inputType: 'richtext'` de forma 100% orientada por metadados (`@FormFieldMeta`) | ✅ |
| `FilmesService` e `FilmesPageComponent` (`/filmes`) no Frontend utilizando `GenericCrudPageComponent` + link na Sidebar e rota protegida por `roleGuard('filmes:read')` | ✅ |

---

## 2. Decisões de Escopo Consolidadas

1. **Relacionamento Filme ↔ Categoria (`N:N` — `ManyToMany`)**:
   - Um filme pode pertencer a **uma ou mais Categorias** (`categorias: Categoria[]`, tabela de junção `filmes_categorias`).
   - O DTO recebe `categoriaIds: string[]` (array de UUIDs, obrigatório com pelo menos 1 categoria no cadastro).
   - O `filmeCrudConfig` declara `relations: ['categorias']` e `relationInputFields: ['categoriaIds']`.
   - A entidade `Filme` expõe o getter `get categoriaIds(): string[]` e implementa `toJSON()` para serializar `categoriaIds` nas respostas HTTP.
2. **Campo Gênero (`generos: string[]` — Seleção Múltipla Estática)**:
   - Modelado como lista pré-definida de gêneros cinematográficos em `@repo/utils` (`FILME_GENEROS`), permitindo selecionar múltiplos gêneros (`multiselect`) no formulário e filtrar na busca.
   - Armazenado como JSON/texto serializado (`simple-json` no TypeORM) na coluna `generos` da tabela `filmes`.
3. **Campo Sinopse (Editor WYSIWYG via `inputType: 'richtext'` no `GenericCrudFormComponent`)**:
   - O tipo `FormInputType` em `@repo/utils` é estendido com `'richtext'`.
   - O `GenericCrudFormComponent` passa a suportar `@case ('richtext')` nativamente usando o novo componente `<ui-rich-text-editor>`, mantendo o cadastro de Filmes 100% dinâmico via `GenericCrudPageComponent` sem necessidade de modal customizado.
   - O editor WYSIWYG é construído nativamente no Design System (sem dependências externas pesadas), com barra de ferramentas acessível (Negrito, Itálico, Sublinhado, Lista com marcadores, Lista numerada e Limpar formatação) e sanitização de HTML tanto no frontend quanto no backend.
4. **Formatos de Ano, Duração e Status (`ativo`)**:
   - `ano`: inteiro (`@IsInt()`, `@Min(1888)`, `@Max(anoAtual + 5)`).
   - `duracao`: inteiro representando a duração em **minutos** (`@IsInt()`, `@Min(1)`, `@Max(1440)`), exibido na listagem formatado (ex: `135 min (2h 15m)`).
   - `ativo`: booleano (`default: true`), seguindo o padrão das demais entidades.
5. **Regras de Negócio e Validações (Hooks Nomeados)**:
   - **Unicidade composta (`titulo` + `ano`)**: Não permitir dois filmes ativos (`deletedAt IS NULL`) com o mesmo `titulo` (case-insensitive) e mesmo `ano`. Lança `BusinessException` com código `FILME_TITULO_ANO_EXISTS` (`409 Conflict`) vinculado ao campo `'titulo'`.
   - **Validação de Categorias Ativas**: Todas as categorias informadas em `categoriaIds` devem existir e estar com `ativo === true`. Caso contrário, lança `BusinessException` com código `FILME_CATEGORIA_INVALID` (`400 Bad Request`) vinculado ao campo `'categoriaIds'`.
   - **Proteção de Categoria em Uso (`CATEGORIA_IN_USE`)**: No `CategoriasService`, impedir a exclusão (`remove`) ou inativação (`update` com `ativo: false`) de uma categoria que esteja vinculada a pelo menos um filme não excluído (`deletedAt IS NULL`). Lança `BusinessException` com código `CATEGORIA_IN_USE` (`409 Conflict`).

---

## 3. Contratos Compartilhados (`@repo/utils`)

### 3.1 Constante `FILME_GENEROS` e `FilmeDto` (`packages/utils/src/contracts/entities.ts`)
```typescript
export const FILME_GENEROS = [
  'Ação',
  'Aventura',
  'Animação',
  'Comédia',
  'Crime',
  'Documentário',
  'Drama',
  'Fantasia',
  'Ficção Científica',
  'Musical',
  'Romance',
  'Suspense',
  'Terror',
] as const;

export type FilmeGenero = (typeof FILME_GENEROS)[number];

export interface FilmeDto {
  id: string;
  titulo: string;
  ano: number;
  diretor: string;
  duracao: number;
  sinopse: string;
  generos: string[];
  ativo: boolean;
  categorias: CategoriaDto[];
  categoriaIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  ultimoUsuarioId: string | null;
}
```

### 3.2 Evolução de `FormInputType` (`packages/utils/src/contracts/crud-meta.ts`)
Adiciona-se `'richtext'` ao union type `FormInputType`:
```typescript
export type FormInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'richtext'
  | 'hidden';
```

### 3.3 Novos Códigos de Erro (`packages/utils/src/contracts/error-codes.ts`)
```typescript
export const ERROR_CODES = {
  // ... existentes
  CATEGORIA_IN_USE: 'CATEGORIA_IN_USE',
  FILME_TITULO_ANO_EXISTS: 'FILME_TITULO_ANO_EXISTS',
  FILME_CATEGORIA_INVALID: 'FILME_CATEGORIA_INVALID',
} as const;
```

---

## 4. Arquitetura e Modelagem no Backend (`apps/backend`)

### 4.1 Estrutura de Arquivos do Módulo `filmes`
```
apps/backend/src/filmes/
├── dto/
│   └── filme.dto.ts             # CreateFilmeDto e UpdateFilmeDto
├── entities/
│   └── filme.entity.ts          # Entidade Filme estendendo BaseEntity com toJSON()
├── filme.config.ts              # Configuração única filmeCrudConfig
├── filmes.service.ts            # Service estendendo CrudService com hooks nomeados
├── filmes.controller.ts         # Controller estendendo createCrudController(filmeCrudConfig)
├── filmes.module.ts             # Módulo NestJS
└── filmes.service.spec.ts       # Testes unitários e de integração do caso de uso
```

### 4.2 Entidade `Filme` (`apps/backend/src/filmes/entities/filme.entity.ts`)
- Tabela: `filmes`
- Índice parcial de unicidade: `@Index('IDX_filmes_titulo_ano_ativo', ['titulo', 'ano'], { unique: true, where: '"deletedAt" IS NULL' })`
- Colunas:
  - `titulo`: `varchar(200)`, não nulo.
  - `ano`: `integer`, não nulo.
  - `diretor`: `varchar(150)`, não nulo.
  - `duracao`: `integer`, não nulo (duração em minutos).
  - `sinopse`: `text`, não nulo (armazena HTML sanitizado do editor WYSIWYG).
  - `generos`: `simple-json`, não nulo (armazena `string[]`).
  - `ativo`: `boolean`, default `true`.
- Relacionamento:
  - `@ManyToMany(() => Categoria, { eager: false })` com `@JoinTable({ name: 'filmes_categorias', joinColumn: { name: 'filme_id', referencedColumnName: 'id' }, inverseJoinColumn: { name: 'categoria_id', referencedColumnName: 'id' } })` → `categorias!: Categoria[]`.
- Getters e `toJSON()`:
  ```typescript
  get categoriaIds(): string[] {
    return Array.isArray(this.categorias)
      ? this.categorias.map((c) => c.id)
      : [];
  }

  toJSON(): Record<string, unknown> {
    return Object.assign({}, this, {
      categoriaIds: this.categoriaIds,
    }) as unknown as Record<string, unknown>;
  }
  ```

### 4.3 DTOs (`apps/backend/src/filmes/dto/filme.dto.ts`)
`CreateFilmeDto`:
1. `titulo` (`order: 1`, `label: 'Título'`, `inputType: 'text'`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(200)`).
2. `categoriaIds` (`order: 2`, `label: 'Categorias'`, `inputType: 'multiselect'`, `optionsEndpoint: '/categorias'`, `optionsValueKey: 'id'`, `optionsLabelKey: 'nome'`, `entityRelationProperty: 'categorias'`, `entityRelationValueKey: 'id'`, `@IsArray()`, `@ArrayMinSize(1)`, `@IsUUID('4', { each: true })`).
3. `generos` (`order: 3`, `label: 'Gêneros'`, `inputType: 'multiselect'`, `optionsStatic: FILME_GENEROS.map(g => ({ label: g, value: g }))`, `@IsArray()`, `@ArrayMinSize(1)`, `@IsIn(FILME_GENEROS, { each: true })`).
4. `ano` (`order: 4`, `label: 'Ano de Lançamento'`, `inputType: 'number'`, `@IsInt()`, `@Min(1888)`, `@Max(2100)`).
5. `duracao` (`order: 5`, `label: 'Duração (minutos)'`, `inputType: 'number'`, `@IsInt()`, `@Min(1)`, `@Max(1440)`).
6. `diretor` (`order: 6`, `label: 'Diretor'`, `inputType: 'text'`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(150)`).
7. `sinopse` (`order: 7`, `label: 'Sinopse'`, `inputType: 'richtext'`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(10000)`).
8. `ativo` (`order: 8`, `label: 'Filme Ativo'`, `inputType: 'boolean'`, `@IsBoolean()`, `@IsOptional()`, default `true`).

`UpdateFilmeDto`:
- Gerado via `createUpdateDto(CreateFilmeDto)` (preservando `@FormFieldMeta` e adicionando `version!: number`).

### 4.4 Configuração `filmeCrudConfig` (`apps/backend/src/filmes/filme.config.ts`)
- `resource: 'filmes'`
- `entity: Filme`
- `createDto: CreateFilmeDto`
- `updateDto: UpdateFilmeDto`
- `deleteMode: 'soft'`
- `relations: ['categorias']`
- `relationInputFields: ['categoriaIds']`
- `sortable: ['titulo', 'ano', 'diretor', 'duracao', 'ativo', 'createdAt', 'updatedAt']`
- `filters`:
  - `titulo`: `type: 'string'`, `label: 'Título'`, `controlType: 'text'`, `defaultOperator: 'like'`, `quickFilter: true`, `operators: ['eq', 'like']`
  - `categoriaId`: `type: 'uuid'`, `label: 'Categoria'`, `controlType: 'select'`, `optionsEndpoint: '/categorias'`, `optionsValueKey: 'id'`, `optionsLabelKey: 'nome'`, `relationField: 'categorias.id'`, `defaultOperator: 'eq'`, `quickFilter: true`, `operators: ['eq', 'in']`
  - `generos`: `type: 'string'`, `label: 'Gênero'`, `controlType: 'select'`, `options: FILME_GENEROS.map(g => ({ label: g, value: g }))`, `defaultOperator: 'like'`, `quickFilter: true`, `operators: ['like', 'eq']`
  - `ano`: `type: 'number'`, `label: 'Ano'`, `controlType: 'number'`, `defaultOperator: 'eq'`, `quickFilter: false`, `operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between']`
  - `diretor`: `type: 'string'`, `label: 'Diretor'`, `controlType: 'text'`, `defaultOperator: 'like'`, `quickFilter: false`, `operators: ['eq', 'like']`
  - `duracao`: `type: 'number'`, `label: 'Duração (min)'`, `controlType: 'number'`, `defaultOperator: 'gte'`, `quickFilter: false`, `operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between']`
  - `ativo`: `type: 'boolean'`, `label: 'Status'`, `controlType: 'boolean'`, `defaultOperator: 'eq'`, `quickFilter: true`, `operators: ['eq']`

### 4.5 Regras e Hooks Nomeados no `FilmesService` e `CategoriasService`
No `FilmesService`:
1. `prepararDadosCreate(ctx)` / `prepararDadosUpdate(ctx)` (`addBeforeHook`):
   - Sanitiza `ctx.input.sinopse` removendo tags perigosas (`<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, atributos `on*` e URLs `javascript:`), mantendo apenas tags de formatação de texto seguras (`<p>`, `<br>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<ul>`, `<ol>`, `<li>`, `<div>`, `<span>`).
   - Verifica se o conteúdo textual da sinopse (após remover tags HTML) não está vazio; se estiver vazio (ex: `<p><br></p>`), lança `BusinessException('A sinopse não pode estar vazia', 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, 'sinopse')`.
2. `validarTituloAnoUnicoCreate(ctx)` e `validarTituloAnoUnicoUpdate(ctx)` (`addValidator`):
   - Verifica se já existe outro registro ativo (`deletedAt IS NULL`) com `LOWER(titulo) = LOWER(:titulo)` e `ano = :ano`.
   - Em caso positivo, lança `new BusinessException('Já existe um filme cadastrado com este título e ano', 'FILME_TITULO_ANO_EXISTS', HttpStatus.CONFLICT, 'titulo')`.
3. `validarCategoriasCreate(ctx)` e `validarCategoriasUpdate(ctx)` (`addValidator`):
   - Verifica se todos os UUIDs em `categoriaIds` existem na tabela `categorias` e possuem `ativo === true`.
   - Caso algum não exista ou esteja inativo, lança `new BusinessException('Uma ou mais categorias informadas são inválidas ou inativas', 'FILME_CATEGORIA_INVALID', HttpStatus.BAD_REQUEST, 'categoriaIds')`.
4. `syncRelations(id, input, ctx)`:
   - Sincroniza a relação `ManyToMany` `categorias` via `ctx.manager.createQueryBuilder().relation(Filme, 'categorias').of(id).addAndRemove(input.categoriaIds, currentIds)`.

No `CategoriasService`:
1. `validarCategoriaSemFilmesRemove(ctx)` (`addValidator('remove', ...)`):
   - Conta quantos registros em `Filme` (com `deletedAt IS NULL`) estão vinculados à categoria `ctx.id`.
   - Se `count > 0`, lança `new BusinessException('Não é possível excluir uma categoria vinculada a filmes ativos', 'CATEGORIA_IN_USE', HttpStatus.CONFLICT)`.
2. `validarCategoriaSemFilmesInativacao(ctx)` (`addValidator('update', ...)`):
   - Se `ctx.input.ativo === false` e a categoria estava ativa, verifica se há filmes ativos vinculados a `ctx.id`.
   - Se `count > 0`, lança `new BusinessException('Não é possível inativar uma categoria vinculada a filmes ativos', 'CATEGORIA_IN_USE', HttpStatus.CONFLICT, 'ativo')`.

---

## 5. Arquitetura no Frontend (`apps/frontend`)

### 5.1 Componente Editor Rico Nativo (`UiRichTextEditorComponent`)
Localização: `apps/frontend/src/app/shared/components/ui/rich-text-editor.component.ts`
- Implementa `ControlValueAccessor` (`NG_VALUE_ACCESSOR`) para integração transparente com `ReactiveFormsModule` (`formControlName`).
- **Inputs**:
  - `id = input<string>('')`
  - `label = input<string>('')`
  - `placeholder = input<string>('Digite aqui...')`
  - `error = input<string | null>(null)`
  - `disabled = input<boolean>(false)`
- **Barra de Ferramentas (Toolbar)**:
  - Botões com ícones SVG e `title` acessível:
    - **Negrito** (`<b>` / `<strong>`)
    - **Itálico** (`<i>` / `<em>`)
    - **Sublinhado** (`<u>`)
    - **Lista com marcadores** (`<ul><li>`)
    - **Lista numerada** (`<ol><li>`)
    - **Limpar formatação** (`removeFormat`)
- **Área Editável**:
  - `<div contenteditable="true" role="textbox" aria-multiline="true" ...>` estilizada com tokens do Design System (`bg-background text-foreground border-border focus-within:ring-2 focus-within:ring-ring min-h-32 p-3 text-sm`).
  - Sanitiza o HTML a cada alteração (`input` / `blur`), removendo scripts/atributos inseguros e emitindo `''` quando o texto visível estiver vazio.

### 5.2 Evolução do `GenericCrudFormComponent`
Localização: `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.ts` e `.html`
- No `@switch (field.inputType)`, adiciona-se o bloco `@case ('richtext')`:
  ```html
  @case ('richtext') {
    <ui-rich-text-editor
      [id]="'ctrl-' + field.name"
      [label]="field.label + (field.required ? ' *' : '')"
      [placeholder]="field.placeholder || ''"
      [formControlName]="field.name"
      [error]="getControlErrorMessage(field.name)"
    ></ui-rich-text-editor>
  }
  ```
- No `FormErrorHandlerService` (`apps/frontend/src/app/core/errors/form-error-handler.service.ts`), mapeiam-se os códigos de fallback:
  - `FILME_TITULO_ANO_EXISTS: 'titulo'`
  - `FILME_CATEGORIA_INVALID: 'categoriaIds'`

### 5.3 Página de Filmes (`FilmesPageComponent` e `FilmesService`)
Localização:
- `apps/frontend/src/app/pages/filmes/filmes.service.ts` (`extends GenericCrudService<FilmeDto>` com `super('filmes')`).
- `apps/frontend/src/app/pages/filmes/filmes-page.component.ts` utilizando `<app-generic-crud-page [config]="pageConfig" />`.
- **Colunas da Tabela (`columns`)**:
  1. `titulo`: `'Título'`, `sortable: true`, `type: 'text'`
  2. `categorias`: `'Categorias'`, `type: 'badge-list'`, `badgeVariant: 'secondary'`, `formatter: (_val, row) => (row.categorias ?? []).map(c => c.nome)`
  3. `generos`: `'Gêneros'`, `type: 'badge-list'`, `badgeVariant: 'outline'`, `formatter: (_val, row) => row.generos ?? []`
  4. `ano`: `'Ano'`, `sortable: true`, `type: 'text'`
  5. `diretor`: `'Diretor'`, `sortable: true`, `type: 'text'`
  6. `duracao`: `'Duração'`, `sortable: true`, `type: 'text'`, `formatter: (_val, row) => `${row.duracao} min``
  7. `ativo`: `'Status'`, `sortable: true`, `type: 'boolean'`, `booleanLabels: { trueLabel: 'Ativo', falseLabel: 'Inativo', trueVariant: 'success', falseVariant: 'secondary' }`
- **Rota e Menu Lateral**:
  - Rota `/filmes` em `app.routes.ts` protegida por `canActivate: [authGuard, roleGuard('filmes:read')]`.
  - Item **Filmes** na `<ui-sidebar>` em `app.html` exibido quando `authService.hasRole('filmes:read')`.

