# Especificação: Tabelas Relacionais de Funcionalidades e Ações, Sincronização de Catálogo e Tela Customizada de Manutenção de Perfis

## 1. Contexto e Objetivo

Substituir o armazenamento desnormalizado de roles em coluna `simple-json` na entidade `Perfil` por um modelo relacional normalizado composto pelas tabelas `funcionalidades`, `funcionalidades_acoes` e `perfis_funcionalidades_acoes`. Adicionalmente, padronizar o formato de todas as roles do sistema (`funcionalidade:acao`), criar um mecanismo de sincronização entre o `RolesCatalog` em memória e o banco de dados (no boot e sob demanda via botão administrativo), e evoluir a tela de manutenção de Perfis no frontend com um formulário customizado baseado em Cards por Funcionalidade e Toggles de Ações.

---

## 2. Padronização do Catálogo de Roles (`@repo/utils` e Backend)

1. **Formato Universal (`ROLE_FORMAT`)**:
   - Todas as roles do sistema seguem estritamente a expressão regular `/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/` (`funcionalidade:acao`).
2. **Role de Dados Sensíveis (`SENSITIVE_DATA_ROLE`)**:
   - A constante `SENSITIVE_DATA_ROLE` em `packages/utils/src/contracts/permissions.ts` passa de `'DADOS_SENSIVEIS'` para **`'global:dados-sensiveis'`**.
   - `RolesCatalog.isValid(role)` passa a validar exclusivamente via `ROLE_FORMAT.test(role)`, sem necessidade de exceções.
3. **Role de Sincronização de Permissões**:
   - Nova role **`'perfis:sync'`** registrada no catálogo através do decorator `@Operation('perfis:sync')` no endpoint de sincronização.

---

## 3. Modelagem de Dados e Migrations (TypeORM)

### 3.1 Entidade `Funcionalidade` (`apps/backend/src/perfis/entities/funcionalidade.entity.ts`)
Herda de `BaseEntity` (`id`, `version`, `createdAt`, `updatedAt`, `deletedAt`, `ultimoUsuarioId`).
- Tabela: `'funcionalidades'`
- Coluna `nome`: `varchar(100)`, obrigatório (ex: `'categorias'`, `'users'`, `'perfis'`, `'global'`).
- Índice único parcial (ignorando registros excluídos via soft-delete):
  `@Index('IDX_funcionalidades_nome_ativo', ['nome'], { unique: true, where: '"deletedAt" IS NULL' })`
- Relação `acoes`: `@OneToMany(() => FuncionalidadeAcao, (acao) => acao.funcionalidade)`

### 3.2 Entidade `FuncionalidadeAcao` (`apps/backend/src/perfis/entities/funcionalidade-acao.entity.ts`)
Herda de `BaseEntity`.
- Tabela: `'funcionalidades_acoes'`
- Coluna `funcionalidadeId`: `uuid`, obrigatório (`@Column({ type: 'uuid' })`).
- Relação `funcionalidade`: `@ManyToOne(() => Funcionalidade, (f) => f.acoes, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'funcionalidadeId' })`.
- Coluna `acao`: `varchar(100)`, obrigatório (ex: `'create'`, `'read'`, `'update'`, `'delete'`, `'sync'`, `'dados-sensiveis'`).
- Índice não-único em `funcionalidadeId` e índice único composto parcial:
  `@Index('IDX_funcionalidades_acoes_unique_ativo', ['funcionalidadeId', 'acao'], { unique: true, where: '"deletedAt" IS NULL' })`

### 3.3 Entidade `Perfil` (`apps/backend/src/perfis/entities/perfil.entity.ts`)
Herda de `BaseEntity`.
- Remove-se a coluna `roles` (`simple-json`).
- Adiciona-se a relação `ManyToMany` com `FuncionalidadeAcao`:
  ```ts
  @ManyToMany(() => FuncionalidadeAcao, { eager: false })
  @JoinTable({
    name: 'perfis_funcionalidades_acoes',
    joinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'funcionalidade_acao_id', referencedColumnName: 'id' },
  })
  acoes!: FuncionalidadeAcao[];
  ```

### 3.4 Migration TypeORM
- Criar migration que:
  1. Cria a tabela `funcionalidades` e o índice parcial `IDX_funcionalidades_nome_ativo`.
  2. Cria a tabela `funcionalidades_acoes` e o índice composto parcial `IDX_funcionalidades_acoes_unique_ativo`.
  3. Cria a tabela pivô `perfis_funcionalidades_acoes` (`perfil_id`, `funcionalidade_acao_id`).
  4. Remove a coluna `roles` da tabela `perfis`.

---

## 4. Algoritmo de Sincronização de Roles (`RolesSyncService` & `SeedService`)

A sincronização é executada tanto na inicialização da aplicação (`SeedService.onApplicationBootstrap()`) quanto sob demanda pelo endpoint `POST /roles/sync` (`@Operation('perfis:sync')`).

### 4.1 Regras da Sincronização (`syncCatalogWithDatabase`)
Dentro de uma transação (`TransactionRunner.runInTransaction`):
1. **Leitura do Catálogo em Memória**:
   - Obtém todas as roles registradas em `RolesCatalog.all()`.
   - Decompõe cada role no formato `funcionalidade:acao` em `{ funcionalidade: string, acao: string }`.
2. **Remoção (Soft-Delete de Ações e Funcionalidades Obsoletas)**:
   - Busca todas as `FuncionalidadeAcao` ativas (`deletedAt IS NULL`) com suas respectivas `Funcionalidade`s.
   - Qualquer `FuncionalidadeAcao` ativa cuja chave `${funcionalidade.nome}:${acao}` **não** exista mais no `RolesCatalog` sofre **soft-delete** (`softRemove`, preenchendo `deletedAt`).
   - Qualquer `Funcionalidade` ativa que não possua mais nenhuma `FuncionalidadeAcao` no `RolesCatalog` também sofre **soft-delete** (`softRemove`).
3. **Adição (Sempre com Novo ID quando não ativa)**:
   - Para cada `funcionalidade` distinta do catálogo:
     - Verifica se existe registro ativo (`deletedAt IS NULL`) em `funcionalidades`.
     - Se **não** existir registro ativo (mesmo que exista um anterior com `deletedAt IS NOT NULL`), **cria um novo registro com novo UUID** (`repository.create` + `save`).
   - Para cada par `(funcionalidade, acao)` do catálogo:
     - Verifica se existe registro ativo (`deletedAt IS NULL`) em `funcionalidades_acoes` para aquela `funcionalidade.id` e `acao`.
     - Se **não** existir registro ativo (mesmo que tenha existido um registro anterior que sofreu soft-delete), **cria um novo registro com novo UUID**. Isso garante que ações recriadas não sejam liberadas automaticamente para perfis antigos que possuíam o ID anterior.
4. **Vínculo Automático ao Perfil `Administrador`**:
   - Busca (ou cria, caso não exista) o perfil `Administrador` (`sistema: true`, `ativo: true`).
   - Vincula ao perfil `Administrador` **todas as `FuncionalidadeAcao` ativas** resultantes da sincronização.
5. **Invalidação de Cache**:
   - Sempre que houver adição, remoção ou atualização de vínculos, executa `PermissionsService.invalidateAll()`.
6. **Retorno do Endpoint `POST /roles/sync`**:
   - Retorna resumo `{ addedActions: number, removedActions: number, totalActiveActions: number }`.

---

## 5. Contratos Semânticos da API (`@repo/utils` e Backend)

### 5.1 Contratos Compartilhados (`packages/utils/src/contracts/roles.ts`)
```ts
export interface FuncionalidadeAcaoDto {
  id: string;
  acao: string;
  role: string; // `${funcionalidade}:${acao}`
}

export interface FuncionalidadeGroupDto {
  id: string;
  nome: string;
  acoes: FuncionalidadeAcaoDto[];
}

export interface RolesSyncResultDto {
  addedActions: number;
  removedActions: number;
  totalActiveActions: number;
}
```

### 5.2 Endpoint de Catálogo e Sincronização (`RolesCatalogController` - `/roles`)
- **`GET /roles` (`@Operation('perfis:read')`)**:
  - Consulta o banco de dados retornando apenas `Funcionalidade`s ativas (`deletedAt IS NULL`) com suas `FuncionalidadeAcao`s ativas (`deletedAt IS NULL`), ordenadas alfabeticamente por `funcionalidade.nome` e `acao.acao`.
  - Formato de resposta: `{ funcionalidades: FuncionalidadeGroupDto[] }`.
- **`POST /roles/sync` (`@Operation('perfis:sync')`)**:
  - Executa `RolesSyncService.sync()` e retorna `RolesSyncResultDto`.

### 5.3 Contratos e Serviço de `Perfis` (`PerfisService`)
- **`CreatePerfilDto` e `UpdatePerfilDto`**:
  - `nome: string`
  - `ativo?: boolean`
  - `acaoIds: string[]` (array de UUIDs de `FuncionalidadeAcao` ativas).
- **Validação em `PerfisService`**:
  - Valida se todos os `acaoIds` informados existem na tabela `funcionalidades_acoes` com `deletedAt IS NULL`. Caso algum ID seja inválido ou esteja excluído, lança `BusinessException('Ações de permissão inválidas ou inexistentes', 'PERFIL_ACAO_INVALID', HttpStatus.BAD_REQUEST, 'acaoIds')`.
- **Serialização / Resposta de `Perfil`**:
  - `PerfisService` carrega a relação `acoes` e `acoes.funcionalidade` (filtrando apenas ativas) em `findAll`, `findOne`, `create` e `update`.
  - Cada item de `Perfil` retornado expõe:
    - `id`, `nome`, `ativo`, `sistema`, `version`, `createdAt`, `updatedAt`
    - `acaoIds: string[]` (IDs das ações ativas associadas)
    - `funcionalidades: string[]` (nomes únicos ordenados das funcionalidades ativas que o perfil possui, usado para os badges da tabela)
    - `roles: string[]` (lista derivada `${func.nome}:${acao.acao}` das ações ativas, útil para inspeção/compatibilidade)

### 5.4 Resolução de Permissões (`PermissionsService`)
- `PermissionsService.getEffectiveRoles(userId)` carrega `user.perfis`, `perfis.acoes` e `perfis.acoes.funcionalidade`.
- Considera apenas perfis ativos (`perfil.ativo && !perfil.deletedAt`), ações ativas (`!acao.deletedAt`) e funcionalidades ativas (`!acao.funcionalidade.deletedAt`).
- Compõe a string `${acao.funcionalidade.nome}:${acao.acao}` e valida contra `RolesCatalog`.

---

## 6. Experiência do Usuário (UX) na Tela de Perfis (Frontend)

### 6.1 Extensão de `GenericCrudPageComponent`
Para manter a reutilização do CRUD Genérico (filtros, tabela, paginação, exclusão) e permitir formulários customizados e ações extras no cabeçalho:
1. **`CrudPageHeaderAction`**:
   - Permite configurar botões adicionais no cabeçalho da página (ao lado do botão `+ Novo`), com `id`, `label`, `variant`, `permission?: string` e `handler: () => void`.
2. **Suporte a Modal Customizado e Modo Visualização**:
   - `CrudPageConfig<E>` passa a suportar:
     - `headerActions?: CrudPageHeaderAction[]`
     - `customModalComponent?: ComponentType<unknown>` (quando fornecido, `openCreateModal` e `openEditModal` abrem este componente passando `{ mode: 'create' | 'update', initialData, readOnly, service, entityLabel }`).
     - `isRowReadOnly?: (row: E) => boolean`: quando `true` para uma linha (ex: `row.sistema === true`), o botão `"Editar"` permanece **habilitado**, mas ao clicar abre o modal com `readOnly: true`.

### 6.2 Tela de Administração de Perfis (`PerfisPageComponent`)
1. **Botão "Sincronizar Permissões"**:
   - Configurado em `headerActions` com `permission: 'perfis:sync'`.
   - Ao clicar, chama `POST /roles/sync`, exibe toast de sucesso informando as permissões sincronizadas e atualiza a listagem.
2. **Coluna de Funcionalidades na Tabela**:
   - Coluna `"Funcionalidades"` do tipo `'badges'`.
   - Extrai os nomes únicos das funcionalidades do perfil (`row.funcionalidades`) **limitado aos 10 primeiros itens** (ex: `row.funcionalidades.slice(0, 10)`).
3. **Edição em Somente Leitura para Perfis de Sistema**:
   - `isRowReadOnly: (row) => row.sistema === true`.
   - `canDeleteRow: (row) => !row.sistema`.

### 6.3 Formulário Customizado de Perfil (`PerfilFormModalComponent`)
- **Campos Superiores**:
  - `Nome do Perfil` (`ui-input`, obrigatório, máx. 100 caracteres).
  - `Perfil Ativo` (toggle switch booleano).
- **Painel de Funcionalidades e Ações (Cards)**:
  - Carrega a árvore `GET /roles` (`FuncionalidadeGroupDto[]`).
  - Renderiza um grid de **Cards** (um Card para cada `Funcionalidade`).
  - **Cabeçalho do Card**:
    - Exibe o nome da funcionalidade formatado e um **Toggle Global da Funcionalidade**.
    - O Toggle Global reflete se todas as ações daquela funcionalidade estão ativas para o perfil; ao alternar, marca ou desmarca todas as ações daquele Card.
  - **Corpo do Card**:
    - Exibe a lista de ações (`acao`) da funcionalidade, cada uma com seu próprio **Toggle Button** indicando se está ativa ou inativa para o perfil.
- **Modo Somente Leitura (`readOnly === true`, ex: perfil `Administrador`)**:
  - Inputs (`nome`, `ativo`), Toggle Global de cada Card e Toggles individuais de cada ação ficam desabilitados (`disabled`).
  - O botão **"Salvar"** é **removido do DOM**, restando apenas o botão **"Fechar"**.
- **Persistência (`readOnly === false`)**:
  - As alterações nos toggles atualizam o estado local do formulário e são enviadas em lote (`acaoIds: string[]`) apenas ao clicar no botão **"Salvar"**.

