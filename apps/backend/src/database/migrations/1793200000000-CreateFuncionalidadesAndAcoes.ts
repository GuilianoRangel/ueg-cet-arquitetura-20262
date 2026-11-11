import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFuncionalidadesAndAcoes1793200000000 implements MigrationInterface {
  name = 'CreateFuncionalidadesAndAcoes1793200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "funcionalidades" (
        "id" varchar PRIMARY KEY NOT NULL,
        "version" integer NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "deletedAt" datetime,
        "ultimoUsuarioId" varchar(36),
        "nome" varchar(100) NOT NULL
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_funcionalidades_nome_ativo" ON "funcionalidades" ("nome") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "funcionalidades_acoes" (
        "id" varchar PRIMARY KEY NOT NULL,
        "version" integer NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "deletedAt" datetime,
        "ultimoUsuarioId" varchar(36),
        "funcionalidadeId" varchar NOT NULL,
        "acao" varchar(100) NOT NULL,
        CONSTRAINT "FK_funcionalidades_acoes_funcionalidade" FOREIGN KEY ("funcionalidadeId") REFERENCES "funcionalidades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_funcionalidades_acoes_funcionalidadeId" ON "funcionalidades_acoes" ("funcionalidadeId")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_funcionalidades_acoes_unique_ativo" ON "funcionalidades_acoes" ("funcionalidadeId", "acao") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "perfis_funcionalidades_acoes" (
        "perfil_id" varchar NOT NULL,
        "funcionalidade_acao_id" varchar NOT NULL,
        CONSTRAINT "FK_perfis_funcionalidades_acoes_perfil" FOREIGN KEY ("perfil_id") REFERENCES "perfis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_perfis_funcionalidades_acoes_acao" FOREIGN KEY ("funcionalidade_acao_id") REFERENCES "funcionalidades_acoes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        PRIMARY KEY ("perfil_id", "funcionalidade_acao_id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_perfis_funcionalidades_acoes_perfil" ON "perfis_funcionalidades_acoes" ("perfil_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_perfis_funcionalidades_acoes_acao" ON "perfis_funcionalidades_acoes" ("funcionalidade_acao_id")`,
    );

    // Drop roles column from perfis if it exists
    const perfilTable = await queryRunner.getTable('perfis');
    if (perfilTable?.findColumnByName('roles')) {
      await queryRunner.query(`ALTER TABLE "perfis" DROP COLUMN "roles"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const perfilTable = await queryRunner.getTable('perfis');
    if (perfilTable && !perfilTable.findColumnByName('roles')) {
      await queryRunner.query(
        `ALTER TABLE "perfis" ADD COLUMN "roles" text NOT NULL DEFAULT ('[]')`,
      );
    }

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_perfis_funcionalidades_acoes_acao"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_perfis_funcionalidades_acoes_perfil"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "perfis_funcionalidades_acoes"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_funcionalidades_acoes_unique_ativo"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_funcionalidades_acoes_funcionalidadeId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "funcionalidades_acoes"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_funcionalidades_nome_ativo"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "funcionalidades"`);
  }
}
