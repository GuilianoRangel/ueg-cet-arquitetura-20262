# Guia de Criação de Novos Módulos CRUD (`docs/novo-crud.md`)

Este guia detalha o passo a passo para criar novos módulos no monorepo utilizando a infraestrutura genérica de CRUD e o sistema granular de permissões por roles.

---

## 🏛️ Visão Geral da Arquitetura

O monorepo disponibiliza uma infraestrutura reutilizável para CRUDs em `apps/backend/src/common/crud/`:

* **`BaseEntity`**: Herança padrão para entidades contendo `id` (UUID), `dataCriacao`, `dataAtualizacao`, `ativo`, `versao` (optimistic locking incremental automático) e `ultimoUsuarioId`.
* **`CrudConfig<E>`**: Configuração declarativa de busca, ordenação padrão, relações eagerly loaded, limites de paginação e filtros permitidos.
* **`CrudService<E>`**: Classe base com métodos prontos (`findAll`, `findOne`, `create`, `update`, `remove`, `restore`), suporte a transações e mutex serializado para SQLite.
* **`CrudValidator<E>`**: Interface opcional de validação de regras de negócio antes de criação ou atualização.
* **`createCrudController<E>`**: Factory de Controllers NestJS com rotas REST completas protegidas automaticamente pelo `OperationGuard` e `JwtAuthGuard`, e totalmente documentadas no OpenAPI/Swagger (`@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiBody`).
* **OpenAPI / Swagger**: Rota interativa disponível em `/api/docs` com suporte a autenticação Bearer JWT integrada.
* **`@Sensitive()`**: Decorator de campo que mascara o valor para `null` caso o usuário autenticado não possua a role `DADOS_SENSIVEIS`.

---

## 🚀 Passo a Passo (Exemplo Real: `Categoria`)

### Passo 1: Definir a Entidade (`categoria.entity.ts`)

Crie o arquivo `apps/backend/src/categorias/categoria.entity.ts` estendendo `BaseEntity`:

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../common/crud/base.entity';
import { Sensitive } from '../common/security/sensitive.decorator';

@Entity('categorias')
export class Categoria extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  nome!: string;

  // Campo sensível: mascarado com null se o usuário não possuir DADOS_SENSIVEIS
  @Column({ type: 'integer', nullable: true })
  @Sensitive()
  valor?: number | null;
}
```

---

### Passo 2: Criar os DTOs de Validação (`dto/categoria.dto.ts`)

Crie o arquivo `apps/backend/src/categorias/dto/categoria.dto.ts` com validações via `class-validator`:

```typescript
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { createUpdateDto } from '../../common/crud/create-update-dto';

export class CreateCategoriaDto {
  @IsString({ message: 'Nome deve ser texto' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value
  )
  nome!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  valor?: number | null;
}

export class UpdateCategoriaDto extends createUpdateDto(CreateCategoriaDto) {}
```

---

### Passo 3: Criar a Migration do TypeORM

Crie o arquivo versionado em `apps/backend/src/migrations/`:

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCategoriasTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'categorias',
        columns: [
          { name: 'id', type: 'varchar', isPrimary: true },
          { name: 'dataCriacao', type: 'datetime' },
          { name: 'dataAtualizacao', type: 'datetime' },
          { name: 'ativo', type: 'boolean', default: 1 },
          { name: 'versao', type: 'integer', default: 1 },
          { name: 'ultimoUsuarioId', type: 'varchar', isNullable: true },
          { name: 'nome', type: 'varchar', length: '150', isUnique: true },
          { name: 'descricao', type: 'text', isNullable: true },
          { name: 'valor', type: 'varchar', length: '255', isNullable: true }
        ]
      }),
      true
    );

    await queryRunner.createIndex(
      'categorias',
      new TableIndex({
        name: 'IDX_CATEGORIAS_NOME',
        columnNames: ['nome'],
        isUnique: true
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('categorias', true);
  }
}
```

Aplique a migration:
```bash
pnpm --filter backend migration:run
```

---

### Passo 4: Implementar o Service com Validador de Negócio (`categorias.service.ts`)

Estenda `CrudService<Categoria, CreateCategoriaDto, UpdateCategoriaDto>` e forneça a `CrudConfig`. Regras de validação de negócio (ex.: unicidade de nome) podem ser adicionadas usando `this.addValidator`:

```typescript
import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class CategoriasService extends CrudService<
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto
> {
  constructor(deps: CrudDeps) {
    super(deps, {
      resource: 'categorias',
      entity: Categoria,
      createDto: CreateCategoriaDto,
      updateDto: UpdateCategoriaDto,
      deleteMode: 'soft',
      sortable: ['nome', 'ativo', 'valor', 'createdAt', 'updatedAt'],
      filters: {
        nome: { type: 'string', operators: ['eq', 'like'] },
        ativo: { type: 'boolean', operators: ['eq'] },
        valor: {
          type: 'number',
          operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
        },
        createdAt: { type: 'date', operators: ['gte', 'lte', 'between'] },
      },
    });

    // Unicidade de nome (case-insensitive) na criação
    this.addValidator('create', async (ctx) => {
      const nome = ctx.input.nome?.trim();
      if (!nome) return;
      const count = await ctx.manager.getRepository(Categoria).count({
        where: {
          nome: Raw((alias) => `LOWER(${alias}) = LOWER(:nome)`, { nome }),
        },
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe uma categoria com este nome',
          'CATEGORIA_NOME_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });

    // Unicidade de nome na atualização
    this.addValidator('update', async (ctx) => {
      const nome = ctx.input.nome?.trim();
      if (!nome) return;
      const count = await ctx.manager.getRepository(Categoria).count({
        where: {
          id: Not(ctx.id),
          nome: Raw((alias) => `LOWER(${alias}) = LOWER(:nome)`, { nome }),
        },
      });
      if (count > 0) {
        throw new BusinessException(
          'Já existe uma categoria com este nome',
          'CATEGORIA_NOME_EXISTS',
          HttpStatus.CONFLICT,
        );
      }
    });
  }
}
```

---

### Passo 5: Criar o Controller REST (`categorias.controller.ts`)

Utilize `createCrudController` para gerar todas as rotas padrões com `@Operation` automático:

```typescript
import { Controller } from '@nestjs/common';
import { createCrudController } from '../common/crud/crud.controller.factory';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { CategoriasService } from './categorias.service';

const BaseController = createCrudController(
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto,
  { resourceName: 'categorias' }
);

@Controller('categorias')
export class CategoriasController extends BaseController {
  constructor(service: CategoriasService) {
    super(service);
  }

  // Para adicionar operações personalizadas, use @Operation('categorias:sua-acao')
}
```

As rotas geradas automaticamente são:
* `GET /categorias`: Exige role `categorias:read`
* `GET /categorias/:id`: Exige role `categorias:read`
* `POST /categorias`: Exige role `categorias:create`
* `PATCH /categorias/:id`: Exige role `categorias:update`
* `DELETE /categorias/:id`: Exige role `categorias:delete`
* `POST /categorias/:id/restore`: Exige role `categorias:restore`

---

### Passo 6: Registrar o Módulo (`categorias.module.ts`)

Registre a entidade e os providers no módulo do NestJS e importe no `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categoria } from './categoria.entity';
import { CategoriasService } from './categorias.service';
import { CategoriasController } from './categorias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria])],
  controllers: [CategoriasController],
  providers: [CategoriasService],
  exports: [CategoriasService]
})
export class CategoriasModule {}
```

---

## 🔒 Permissões Granulares e Segurança

1. **Catálogo de Roles**: Ao criar um novo CRUD, as roles correspondentes (`categorias:read`, `categorias:create`, etc.) devem ser listadas nos perfis desejados através da interface de administração ou via migration.
2. **Campos Sensíveis**: O decorator `@Sensitive()` garante que informações protegidas nunca sejam expostas a usuários sem a role `DADOS_SENSIVEIS`.
3. **Locking Otimista**: Ao atualizar ou remover um registro, envie o header ou query param `version`. Se o registro no banco tiver uma versão diferente, o sistema rejeita com HTTP 409 `OPTIMISTIC_LOCK_CONFLICT`.

