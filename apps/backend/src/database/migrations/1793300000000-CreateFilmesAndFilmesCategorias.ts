import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFilmesAndFilmesCategorias1793300000000 implements MigrationInterface {
  name = 'CreateFilmesAndFilmesCategorias1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "filmes" (
        "id" varchar PRIMARY KEY NOT NULL,
        "version" integer NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "deletedAt" datetime,
        "ultimoUsuarioId" varchar(36),
        "titulo" varchar(200) NOT NULL,
        "ano" integer NOT NULL,
        "diretor" varchar(150) NOT NULL,
        "duracao" integer NOT NULL,
        "sinopse" text NOT NULL,
        "generos" text NOT NULL,
        "ativo" boolean NOT NULL DEFAULT (1)
      )`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_filmes_titulo_ano_ativo" ON "filmes" ("titulo", "ano") WHERE "deletedAt" IS NULL`,
    );

    await queryRunner.query(
      `CREATE TABLE "filmes_categorias" (
        "filme_id" varchar NOT NULL,
        "categoria_id" varchar NOT NULL,
        CONSTRAINT "FK_filmes_categorias_filme" FOREIGN KEY ("filme_id") REFERENCES "filmes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_filmes_categorias_categoria" FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        PRIMARY KEY ("filme_id", "categoria_id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_filmes_categorias_filme_id" ON "filmes_categorias" ("filme_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_filmes_categorias_categoria_id" ON "filmes_categorias" ("categoria_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_filmes_categorias_categoria_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_filmes_categorias_filme_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "filmes_categorias"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_filmes_titulo_ano_ativo"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "filmes"`);
  }
}
