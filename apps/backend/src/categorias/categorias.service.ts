import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { CrudContext } from '../common/crud/crud.types';
import { Categoria } from './entities/categoria.entity';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto/categoria.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { categoriaCrudConfig } from './categoria.config';
import { Filme } from '../filmes/entities/filme.entity';

@Injectable()
export class CategoriasService extends CrudService<
  Categoria,
  CreateCategoriaDto,
  UpdateCategoriaDto
> {
  constructor(deps: CrudDeps) {
    super(deps, categoriaCrudConfig);

    // Unique nome among non-deleted (case-insensitive) via hooks infrastructure
    this.addValidator('create', (ctx) => this.validarNomeUnicoCreate(ctx));

    this.addValidator('update', async (ctx) =>
      this.validarNomeUnicoUpdate(ctx),
    );

    this.addValidator('update', (ctx) =>
      this.validarCategoriaSemFilmesInativacao(ctx),
    );

    this.addValidator('remove', (ctx) =>
      this.validarCategoriaSemFilmesRemove(ctx),
    );
  }

  private async validarNomeUnicoCreate(
    ctx: CrudContext<Categoria, CreateCategoriaDto>,
  ): Promise<void> {
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
        'nome',
      );
    }
  }
  private async validarNomeUnicoUpdate(
    ctx: CrudContext<Categoria, UpdateCategoriaDto>,
  ): Promise<void> {
    const nome = ctx.input.nome?.trim();
    if (!nome) return;
    const existing = ctx.existing;
    if (existing && existing.nome.toLowerCase() === nome.toLowerCase()) {
      return;
    }
    const targetId = existing ? existing.id : ctx.id!;
    const count = await ctx.manager.getRepository(Categoria).count({
      where: {
        nome: Raw((alias) => `LOWER(${alias}) = LOWER(:nome)`, { nome }),
        id: Not(targetId),
      },
    });
    if (count > 0) {
      throw new BusinessException(
        'Já existe uma categoria com este nome',
        'CATEGORIA_NOME_EXISTS',
        HttpStatus.CONFLICT,
        'nome',
      );
    }
  }

  private async validarCategoriaSemFilmesRemove(
    ctx: CrudContext<Categoria, never>,
  ): Promise<void> {
    const categoriaId = ctx.id;
    if (!categoriaId) return;

    const count = await ctx.manager
      .getRepository(Filme)
      .createQueryBuilder('filme')
      .innerJoin(
        'filme.categorias',
        'categoria',
        'categoria.id = :categoriaId',
        { categoriaId },
      )
      .where('filme.deletedAt IS NULL')
      .getCount();

    if (count > 0) {
      throw new BusinessException(
        'Não é possível excluir uma categoria vinculada a filmes ativos',
        'CATEGORIA_IN_USE',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async validarCategoriaSemFilmesInativacao(
    ctx: CrudContext<Categoria, UpdateCategoriaDto>,
  ): Promise<void> {
    if (ctx.input.ativo !== false) return;
    const existing = ctx.existing;
    if (existing && !existing.ativo) {
      return;
    }
    const categoriaId = existing ? existing.id : ctx.id;
    if (!categoriaId) return;

    const count = await ctx.manager
      .getRepository(Filme)
      .createQueryBuilder('filme')
      .innerJoin(
        'filme.categorias',
        'categoria',
        'categoria.id = :categoriaId',
        { categoriaId },
      )
      .where('filme.deletedAt IS NULL')
      .getCount();

    if (count > 0) {
      throw new BusinessException(
        'Não é possível inativar uma categoria vinculada a filmes ativos',
        'CATEGORIA_IN_USE',
        HttpStatus.CONFLICT,
        'ativo',
      );
    }
  }
}
