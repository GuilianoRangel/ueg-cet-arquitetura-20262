# Workflow: Build Check

**Comando:** `check build`

**Objetivo:** validar a integridade do monorepo antes de commit, PR ou deploy, garantindo qualidade de código, tipagem, testes e build.

## Pré-validação

1. Verificar se está na raiz do monorepo
2. Verificar se existe `package.json`
3. Verificar se existe `pnpm-workspace.yaml`
4. Verificar se existe `turbo.json`
5. Verificar se o `pnpm` está disponível

## Passos

1. Executar checagem de tipos:
```bash
pnpm typecheck
```

2. Executar lint:
```bash
pnpm lint
```

3. Executar testes unitários:
```bash
pnpm test
```

4. Executar build completo:
```bash
pnpm build
```

## Correção automática assistida

Se qualquer etapa falhar:

1. Identificar o app/pacote afetado:
   - `apps/backend`
   - `apps/frontend`
   - `packages/*`

2. Analisar a causa do erro.

3. Tentar corrigir problemas simples sem alterar o funcionamento:
   - Erros de tipagem
   - Imports ausentes ou não utilizados
   - Problemas de lint
   - Ajustes de formatação
   - Mocks quebrados em testes
   - Testes desalinhados com contratos existentes
   - Ajustes necessários para build

4. Não alterar regra de negócio sem confirmação.

5. Se a correção puder alterar comportamento, regra de negócio, contrato público ou fluxo da aplicação:
   - Interromper
   - Apresentar um plano de implementação
   - Explicar o impacto esperado
   - Aguardar confirmação antes de aplicar

## Validação após correção

Após qualquer correção:

1. Executar novamente a etapa que falhou.
2. Se passar, continuar o fluxo.
3. Ao final, executar novamente:
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Regras

- Não ignorar erros de typecheck.
- Não ignorar erros de lint.
- Não ignorar testes falhando.
- Não considerar válido se o build falhar.
- Não alterar funcionamento existente para “fazer passar”.
- Não corrigir teste quebrado removendo cobertura válida.
- Corrigir implementação quando o teste representar regra de negócio válida.
- Corrigir teste apenas quando houver erro claro no próprio teste.
- Toda alteração deve preservar o comportamento existente.
- Reportar erros agrupados por app/pacote afetado.

## Saída esperada

- **Status por etapa:**
  - `typecheck`: OK | FAIL
  - `lint`: OK | FAIL
  - `test`: OK | FAIL
  - `build`: OK | FAIL
- Correções aplicadas, quando houver.
- Plano de implementação, quando uma correção exigir confirmação.
- **Lista de erros restantes agrupados por:**
  - `apps/backend`
  - `apps/frontend`
  - `packages/*`
