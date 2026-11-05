# Design System UEG

Este documento estabelece as diretrizes visuais e arquiteturais do Design System institucional adotado no monorepo da UEG. Todos os novos desenvolvimentos, refatorações de telas e implementações conduzidas por desenvolvedores ou agentes de IA DEVEM seguir estritamente estas definições.

## 🎨 1. Design Tokens (Variáveis CSS)

A fundação do nosso design system é baseada em propriedades CSS puras mapeadas no arquivo `styles.css` utilizando a funcionalidade de tokens do **TailwindCSS v4**. O sistema já está preparado para **Light e Dark modes** com variáveis ajustadas para contraste acessível (WCAG).

- **Cores Semânticas:**
  - `primary`: Verde institucional da UEG.
  - `success` / `warning` / `destructive` / `info`: Paleta para estados da aplicação.
  - `background` / `foreground`: Cores bases da aplicação.
  - `card` / `popover`: Tons de superfície que se destacam suavemente do background principal.
  - `muted` / `accent`: Usados para interações de `hover` e elementos de baixa ênfase.

- **Bordas e Sombras:**
  - `radius`: Padronizado para bordas arredondadas (xs a xl).
  - `shadow-sm` / `shadow-md` / `shadow-card`: Elevações padrão para cartões e modais.

## 🧩 2. Componentes UI (Atômicos)

A camada de componentes visuais está localizada em `apps/frontend/src/app/shared/components/ui/`. Todos são projetados como **Angular Standalone Components** consumindo as APIs de `signal()` e `input()` com a poderosa biblioteca CVA (`class-variance-authority`) para variantes de estado.

Sempre que precisar renderizar formulários, botões ou cartões informativos, importe diretamente esses módulos.

### 2.1 Botões (`ui-button`)
Componente universal de botão, compatível com as tags `<button>` e `<a>`.
**Variantes (`variant`):** `default` (verde), `destructive` (vermelho), `outline`, `secondary`, `ghost`, `link`.
**Tamanhos (`size`):** `default`, `sm`, `lg`, `icon`.

```html
<button ui-button variant="default" size="sm">Salvar</button>
```

### 2.2 Inputs (`ui-input`)
Substitui inputs nativos. Injeta formatação automática, trata acessibilidade, exibe rótulos (`label`) e mensagens de erro (`error`) de validações de formulário reativo. Integra nativamente com `ControlValueAccessor`.

```html
<ui-input 
  label="E-Mail" 
  type="email" 
  placeholder="nome@ueg.br"
  formControlName="email">
</ui-input>
```

### 2.3 Cartões (`ui-card`)
Padrão "Compound Component" (inspirado no Shadcn UI) para estruturar blocos de informações complexas de forma modularizada:
- `<ui-card>`: Container principal.
- `<ui-card-header>` e `<ui-card-title>`: Cabeçalho com título padronizado.
- `<ui-card-content>`: O corpo do cartão.

```html
<ui-card>
  <ui-card-header>
    <ui-card-title>Detalhes do Usuário</ui-card-title>
  </ui-card-header>
  <ui-card-content>
    <p>Conteúdo interno...</p>
  </ui-card-content>
</ui-card>
```

### 2.4 Badges (`ui-badge`)
Indicadores rápidos de status (ex: ativo/inativo).
**Variantes (`variant`):** `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`.

```html
<ui-badge variant="success">Ativo</ui-badge>
```

### 2.5 Dialogs e Modais (`UiDialogService` e `UiConfirmDialogComponent`)
Encapsula o `@angular/cdk/dialog` em `apps/frontend/src/app/shared/components/ui/dialog/` sem acoplar as páginas diretamente ao CDK:
- `uiDialogService.open(Component, { data, width })`: Abre modais com focus-trap, fechamento por `ESC`/backdrop e classes semânticas do Design System.
- `uiDialogService.confirm({ title, message, confirmText, cancelText, variant })`: Abre o modal padronizado de confirmação retornando `Observable<boolean>`.

### 2.6 Toasts (`ToastService` e `<ui-toast>`)
Encapsula a biblioteca `ngx-sonner` em `apps/frontend/src/app/shared/components/ui/toast.service.ts` e `toast.component.ts`, expondo os métodos `success()`, `error()`, `info()` e `warning()` além do signal reativo `toasts`.

### 2.7 Loading Global (`LoadingService` e `<ui-loading-overlay>`)
Gerencia automaticamente o estado de carregamento das requisições HTTP via `loadingInterceptor` com debounce de `150ms` para evitar flicker em chamadas rápidas. Casos de uso específicos podem desabilitar o loading global passando `{ skipGlobalLoading: true }` ou `withSkipGlobalLoading()` no `HttpContext`.

## 📋 3. Componentes Compostos de CRUD (`apps/frontend/src/app/shared/components/crud/`)

1. **`UiDataTableComponent` (`<ui-data-table>`) e `CrudTableDataSource<E>`**:
   - Tabela padronizada com linhas zebradas (`odd:bg-background even:bg-muted/30`), ordenação simples (clique no cabeçalho) e ordenação por múltiplas colunas (`Shift + Clique` com indicador numérico de prioridade `1`, `2`, ...).
   - Renderização automática de células por tipo: `text`, `boolean` (badge), `currency-cents` (formatação em BRL `R$` e proteção automática de valores mascarados `99999` / role `DADOS_SENSIVEIS`), `date`, `datetime` e `badges`.
   - Coluna de operações à direita respeitando permissões (`authService.hasRole`), `visible(row)` e `disabled(row)`.
2. **`UiPaginatorComponent` (`<ui-paginator>`)**:
   - Paginador conectado ao `CrudTableDataSource` com seletor de itens por página (`10`, `25`, `50`, `100`), faixa de registros exibidos e botões de navegação (`«`, `‹`, páginas, `›`, `»`).
3. **`SmartFilterBarComponent` (`<app-smart-filter-bar>`)**:
   - Barra de filtros inteligente orientada pelos metadados do backend (`GET /:resource/meta`), com filtros rápidos (`text`, `select`, `boolean` e `master-detail` em cascata) e painel expansível de **Filtros Avançados** com operadores dinâmicos (`eq`, `ne`, `like`, `gt`, `gte`, `lt`, `lte`, `between`, `in`).
4. **`GenericCrudFormComponent` (`<app-generic-crud-form>`) e `GenericCrudFormModalComponent`**:
   - Constrói formulários reativos e validações dinamicamente a partir dos schemas `createForm` e `updateForm` extraídos dos DTOs do backend (`DtoMetadataExplorer` + `@FormFieldMeta`).
   - Integra o tratamento de erros em 3 níveis (`FormErrorHandlerService` + `errorInterceptor`): erros de campo (Nível 1) abaixo do respectivo controle, erros de negócio gerais (Nível 2) em Banner de alerta no topo do formulário, e erros inesperados 500/rede (Nível 3) via Toast amigável.
5. **`GenericCrudPageComponent` (`<app-generic-crud-page>`)**:
   - Orquestra cabeçalho, botão de criação, `SmartFilterBar`, `UiDataTable`, `UiPaginator`, modais de criação/edição e confirmação de exclusão com código mínimo por página.

## 🏗 3. App Shell e Estrutura de Layout

Toda a área restrita da aplicação utiliza a arquitetura de **Shell** (`apps/frontend/src/app/shared/components/layout/shell.component.ts`), composta por:
1. `ui-header`: Navegação principal superior, logo, e menu de logout.
2. `ui-sidebar`: Navegação responsiva com itens de menu (links primários).
3. `main`: Container principal flexível com fundo padronizado (`bg-background`).

**Regra para Páginas (Views):**
As páginas devem utilizar uma estrutura limpa interna:
- Classes como `max-w-7xl mx-auto p-6` para alinhar com o espaçamento do shell.
- Não usar `bg-gray-900` hardcoded. O fundo principal é injetado pelo `<app-shell>` (`bg-background`), e blocos internos devem usar `<ui-card>`.

## 🛠 4. O Utilitário `cn`

Para combinar de forma elegante classes Tailwind estáticas e condicionais no Angular (resolvendo conflitos automaticamente), existe a função `cn` no arquivo `cn.util.ts`:
```typescript
import { cn } from '../../utils/cn.util';
// Mistura clsx e tailwind-merge nativamente
const classes = cn('p-4 text-white', condition ? 'bg-blue-500' : 'bg-red-500');
```
