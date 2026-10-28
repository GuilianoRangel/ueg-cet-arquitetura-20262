import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793149133035 implements MigrationInterface {
  name = 'InitialSchema1793149133035';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "perfis" ("id" varchar PRIMARY KEY NOT NULL, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "ultimoUsuarioId" varchar(36), "nome" varchar(100) NOT NULL, "ativo" boolean NOT NULL DEFAULT (1), "roles" text NOT NULL DEFAULT ('[]'), "sistema" boolean NOT NULL DEFAULT (0))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_perfis_nome_ativo" ON "perfis" ("nome") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" varchar PRIMARY KEY NOT NULL, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "ultimoUsuarioId" varchar(36), "email" varchar NOT NULL, "nome" varchar NOT NULL, "senha" varchar NOT NULL, "ativo" boolean NOT NULL DEFAULT (0), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "categorias" ("id" varchar PRIMARY KEY NOT NULL, "version" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "deletedAt" datetime, "ultimoUsuarioId" varchar(36), "nome" varchar(100) NOT NULL, "ativo" boolean NOT NULL DEFAULT (1), "valor" integer)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_categorias_nome_ativo" ON "categorias" ("nome") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "users_perfis" ("usersId" varchar NOT NULL, "perfisId" varchar NOT NULL, CONSTRAINT "FK_d4abdc652716de4db8f840644d9" FOREIGN KEY ("usersId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_5a1093718df3aea677ed914fa1d" FOREIGN KEY ("perfisId") REFERENCES "perfis" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("usersId", "perfisId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4abdc652716de4db8f840644d" ON "users_perfis" ("usersId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a1093718df3aea677ed914fa1" ON "users_perfis" ("perfisId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_5a1093718df3aea677ed914fa1"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_d4abdc652716de4db8f840644d"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "users_perfis"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categorias_nome_ativo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categorias"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_perfis_nome_ativo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "perfis"`);
  }
}
