# Guia de Migrations (TypeORM)

Este documento descreve como trabalhar com as migrations do banco de dados (SQLite/TypeORM) no projeto.

## 1. Visão Geral
A opção `synchronize` do TypeORM está desabilitada em todos os ambientes para garantir integridade e rastreabilidade do schema.
Na inicialização da aplicação, as migrations são executadas automaticamente (`migrationsRun: true`).

## 2. Comandos Disponíveis

Todos os comandos devem ser executados a partir da raiz do monorepo:

### Gerar uma nova migration
Gera uma migration baseada nas alterações das entidades TypeORM:
```bash
pnpm --filter backend migration:generate src/database/migrations/NomeDaMigration
```

### Executar migrations pendentes
```bash
pnpm --filter backend migration:run
```

### Reverter a última migration aplicada
```bash
pnpm --filter backend migration:revert
```

## 3. Bancos de Dados Legados / Recriação do Banco

Com a remoção do `synchronize` e a introdução da migration inicial `InitialSchema`, bancos criados previamente com versões antigas das entidades devem ser descartados e recriados.

### Ambiente Local
1. Remova o arquivo SQLite local:
   ```bash
   rm -f apps/backend/database.sqlite
   ```
2. Inicie a aplicação normalmente (`pnpm dev` ou `pnpm --filter backend start:dev`). As migrations serão executadas automaticamente e o seed do Administrador será aplicado.

### Ambiente Docker
1. Pare e remova os containers com seus volumes:
   ```bash
   docker compose down -v
   ```
   (isso removerá o volume `sqlite_data`).
2. Suba os containers novamente:
   ```bash
   docker compose up -d
   ```

