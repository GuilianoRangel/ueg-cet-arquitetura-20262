# Plano de Implementação: Tratamento de Entidades Ativas/Inativas no CRUD Genérico (`@EntityStatus`)

> **Especificações relacionadas:** [specs/crud-generico.md](../crud-generico.md), [specs/crud-generico-frontend.md](../crud-generico-frontend.md)
> **Regra de UX definida:** Na edição (`update`), caso uma opção inativa previamente selecionada seja desmarcada no `multiselect` (ou trocada no `select`), ela permanece visível e **desabilitada** até o salvamento, impedindo sua re-seleção e evitando saltos de layout.

---

## Regras de Execução e Conformidade com `generic-crud-usecase`

1. **Execução Fase por Fase**:
   - Marcar a tarefa atual como `[/]` ao iniciar e como `[x]` somente após todos os testes e validações passarem.
   - Ao concluir cada fase, registrar um resumo na seção **Observações** abaixo.
2. **Skills Ativas**:
   - Backend: `generic-crud-usecase`, `nestjs-best-practices`, `nestjs-testing-expert`, `clean-code`.
   - Frontend: `generic-crud-usecase`, `angular-dev`, `angular-testing`, `tailwind-design-system`, `clean-code`.
3. **Princípios Mandatórios**:
   - **TDD Estrito**: escrever primeiro os testes (`*.spec.ts`), validar falha inicial e só então implementar.
   - **Proibição total de `any`**: zero ocorrências de `: any`, `as any` ou `<any>`.
   - **`BusinessException` com 4º parâmetro `field`**: sempre vincular erros de campo diretamente ao input do formulário.
4. **Ambiente NVM + PNPM**:
   `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && export PNPM_HOME="/home/guiliano/.local/share/pnpm" && export PATH="$PNPM_HOME:$PATH" && <comando>`

---

## Fase 1 — Contratos Compartilhados (`packages/utils`)

> **Contexto de Entrada da Fase:**
> - Ler: `packages/utils/src/contracts/crud-meta.ts`, `packages/utils/src/contracts/error-codes.ts`, `packages/utils/src/contracts/contracts.spec.ts`.

- [x] 1.1 **Testes** em `packages/utils/src/contracts/contracts.spec.ts`:
  - Validar `EntityStatusFieldMeta` (`field`, `type`, `inactiveValues`, `inactiveLabel?`) em `CrudFormFieldSchema.optionsStatusField` e `CrudResourceMetaDto.statusField`.
  - Validar presença de `INACTIVE_OPTION_NOT_ALLOWED` em `ERROR_CODES`.
- [x] 1.2 Em `packages/utils/src/contracts/crud-meta.ts`, exportar `EntityStatusFieldType`, `EntityStatusFieldMeta` e adicionar `optionsStatusField?: EntityStatusFieldMeta` em `CrudFormFieldSchema` e `statusField?: EntityStatusFieldMeta` em `CrudResourceMetaDto`.
- [x] 1.3 Em `packages/utils/src/contracts/error-codes.ts`, adicionar `INACTIVE_OPTION_NOT_ALLOWED: 'INACTIVE_OPTION_NOT_ALLOWED'` em `ERROR_CODES`.
- [x] 1.4 **Checkpoint da Fase 1**: Executar `pnpm --filter @repo/utils test && pnpm --filter @repo/utils build`.

---

## Fase 2 — Backend: Decorator `@EntityStatus`, `CrudResourceRegistry`, `DtoMetadataExplorer` e Entidades

> **Contexto de Entrada da Fase:**
> - Ler: `apps/backend/src/common/crud/decorators/form-field-meta.decorator.ts`, `apps/backend/src/common/crud/metadata/dto-metadata.explorer.ts`, `apps/backend/src/common/crud/metadata/dto-metadata.explorer.spec.ts`, `apps/backend/src/common/crud/masking/masked.decorator.ts`, `apps/backend/src/categorias/entities/categoria.entity.ts`, `apps/backend/src/perfis/entities/perfil.entity.ts`, `apps/backend/src/users/entities/user.entity.ts`, `apps/backend/src/filmes/entities/filme.entity.ts`.

- [x] 2.1 **Testes** em `apps/backend/src/common/crud/decorators/entity-status.decorator.spec.ts` e `apps/backend/src/common/crud/metadata/dto-metadata.explorer.spec.ts`:
  - Testar `@EntityStatus()` default booleano (`inactiveValues: [false]`).
  - Testar `@EntityStatus({ type: 'enum', inactiveValues: ['INATIVO', 'BLOQUEADO'] })` e com valor único `'INATIVO'`.
  - Testar erro *fail-fast* ao declarar `enum` sem `inactiveValues` ou múltiplos `@EntityStatus` na mesma entidade.
  - Testar `DtoMetadataExplorer.exploreFormSchema` preenchendo `optionsStatusField` automaticamente via relação TypeORM (`entityRelationProperty`), via `CrudResourceRegistry` (`optionsEndpoint`) e via `optionsEntity` explícito.
- [x] 2.2 Criar `apps/backend/src/common/crud/decorators/entity-status.decorator.ts` com `@EntityStatus(options?)` e `getEntityStatusMeta(entityClass)`.
- [x] 2.3 Criar `apps/backend/src/common/crud/metadata/crud-resource-registry.ts` para mapear `resource` (`'/categorias'`) -> `entityClass`.
- [x] 2.4 Atualizar `apps/backend/src/common/crud/decorators/form-field-meta.decorator.ts` adicionando `optionsEntity?: Type<unknown> | (() => Type<unknown>)`.
- [x] 2.5 Atualizar `apps/backend/src/common/crud/metadata/dto-metadata.explorer.ts` para resolver a entidade referenciada e anexar `optionsStatusField` em `CrudFormFieldSchema`.
- [x] 2.6 Decorar o campo `ativo` com `@EntityStatus()` nas entidades existentes:
  - `apps/backend/src/categorias/entities/categoria.entity.ts`
  - `apps/backend/src/perfis/entities/perfil.entity.ts`
  - `apps/backend/src/users/entities/user.entity.ts`
  - `apps/backend/src/filmes/entities/filme.entity.ts`
- [x] 2.7 **Checkpoint da Fase 2**: Executar testes unitários do backend (`entity-status.decorator.spec.ts` e `dto-metadata.explorer.spec.ts`).

---

## Fase 3 — Backend: Validação Genérica de Opções Ativas no `CrudService`

> **Contexto de Entrada da Fase:**
> - Ler: `apps/backend/src/common/crud/crud.service.ts`, `apps/backend/src/common/crud/crud.service.spec.ts`, `apps/backend/src/filmes/filmes.service.ts`, `apps/backend/src/users/users.service.ts`.

- [x] 3.1 **Testes** em `apps/backend/src/common/crud/crud.service.spec.ts`:
  - Validar que `CrudService.create` e `CrudService.update` rejeitam opção referenciada inativa (`boolean` e `enum` multi-valor) ou removida (soft-deleted), lançando `BusinessException` com `ERROR_CODES.INACTIVE_OPTION_NOT_ALLOWED` e `field` no 4º parâmetro.
  - Validar que `getMeta()` retorna `statusField` quando a entidade possui `@EntityStatus`.
  - Validar que validators customizados das subclasses (`FilmesService`, `UsersService`) preservam seus códigos específicos (`FILME_CATEGORIA_INVALID`, `USER_PERFIL_INVALID`).
- [x] 3.2 Atualizar `apps/backend/src/common/crud/crud.service.ts`:
  - Registrar `(config.resource, config.entity)` no `CrudResourceRegistry`.
  - Expor `statusField` no `getMeta()` quando presente na entidade.
  - Executar `validarOpcoesRelacionadasAtivas(ctx, dtoClass)` em `create` e `update` (após os validators customizados da subclasse).
- [x] 3.3 **Checkpoint da Fase 3**: Executar toda a suíte de testes do backend (`pnpm --filter backend test`) e `typecheck`.

---

## Fase 4 — Frontend: Filtro Condicional, UI Desabilitada e Validação Reativa no `GenericCrudFormComponent`

> **Contexto de Entrada da Fase:**
> - Ler: `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.ts`, `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.html`, `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.spec.ts`.

- [x] 4.1 **Testes** em `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.spec.ts`:
  - Modo `create`: ocultar opções inativas (`boolean` e `enum` multi-valor).
  - Modo `update`: ocultar opções inativas **não selecionadas**; exibir opções inativas/removidas **quando selecionadas** com indicação visual `(Inativo)`.
  - Modo `update`: bloquear `onSubmit()` e exibir mensagem de validação no campo quando opção inativa/removida estiver selecionada (`select` e `multiselect`).
  - Modo `update`: ao desmarcar a opção inativa no `multiselect` (ou trocar no `select`), limpar o erro e permitir salvar, mantendo a opção desmarcada visível e **desabilitada** para impedir re-seleção.
  - Verificar compatibilidade com `initialData[entityRelationProperty]` e detecção de item removido (soft-deleted).
- [x] 4.2 Atualizar `apps/frontend/src/app/shared/components/crud/generic-crud-form.component.ts` e `.html`:
  - Mapear `inactive` e `removed` a partir de `field.optionsStatusField` e `initialData[entityRelationProperty]`.
  - Filtrar opções visíveis por `mode` (`create` vs `update` + `selected || initialSelected`).
  - Adicionar `buildInactiveOptionValidator(field)` e chamar `updateValueAndValidity` após carregar opções dinâmicas.
  - Exibir badge/sufixo `Inativo` e manter opções inativas desmarcadas desabilitadas (`[disabled]`) no template HTML.
- [x] 4.3 **Checkpoint da Fase 4**: Executar testes do frontend (`pnpm --filter frontend test`) e `typecheck`.

---

## Fase 5 — Verificação Final do Monorepo (Definition of Done)

- [x] 5.1 Verificar ausência total de `any` (`: any`, `as any`, `<any>`) em `apps/` e `packages/`.
- [x] 5.2 Executar `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` na raiz do monorepo com 0 erros.

---

## Observações

- **Fase 1**: Contratos `EntityStatusFieldType`, `EntityStatusFieldMeta`, `CrudFormFieldSchema.optionsStatusField`, `CrudResourceMetaDto.statusField` e `ERROR_CODES.INACTIVE_OPTION_NOT_ALLOWED` implementados e validados com `pnpm --filter @repo/utils test` (15/15) e `build`.
- **Fase 2**: Decorator `@EntityStatus`, `CrudResourceRegistry`, resolução automática de `optionsStatusField` no `DtoMetadataExplorer` e anotação `@EntityStatus()` em `Categoria`, `Perfil`, `User` e `Filme` concluídos (16/16 testes aprovados).
- **Fase 3**: Validação genérica de opções ativas/inativas no `CrudService` e exposição de `statusField` em `getMeta()` implementadas; 29 suítes e 249 testes do backend aprovados + `typecheck` limpo.
- **Fase 4**: Filtro condicional, badge/sufixo de item inativo, desabilitação após desmarcar e validator reativo implementados no `GenericCrudFormComponent`; 26 suítes / 113 testes e `typecheck` aprovados no frontend.
- **Fase 5**: Zero ocorrências de `any` confirmadas; `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` executados na raiz do monorepo com 0 erros.
