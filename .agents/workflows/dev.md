# Workflow: Start Dev

**Comando:** `start dev`

**Objetivo:** preparar e iniciar o ambiente de desenvolvimento do monorepo no Antigravity.

## Pré-validação

1. Verificar se está na raiz do monorepo
2. Verificar se existe `package.json`
3. Verificar se existe `pnpm-workspace.yaml`
4. Verificar se existe `turbo.json`
5. Verificar se o `pnpm` está disponível

## Passos

1. Executar instalação das dependências:

```bash
pnpm install
```

2. Iniciar o ambiente de desenvolvimento:

```bash
pnpm dev
```

3. Confirmar se os serviços subiram corretamente:
   - **Backend NestJS:** `http://localhost:3000/api`
   - **Frontend Angular:** `http://localhost:4200`

4. Abrir o browser preview do Angular:
   - [http://localhost:4200](http://localhost:4200)

## Regras

- Não iniciar `pnpm dev` fora da raiz do monorepo.
- Não abrir preview antes do Angular estar disponível.
- Se `pnpm install` falhar, interromper e reportar o erro.
- Se alguma porta estiver ocupada, identificar o processo antes de tentar alterar a porta.
- Não alterar portas padrão sem solicitação explícita.
- Manter NestJS e Angular rodando em paralelo via Turborepo.
