import { HttpStatus, Injectable } from '@nestjs/common';
import { Raw, Not, In, EntityManager } from 'typeorm';
import { CrudService, CrudDeps } from '../common/crud/crud.service';
import { CrudContext } from '../common/crud/crud.types';
import { Filme } from './entities/filme.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { CreateFilmeDto, UpdateFilmeDto } from './dto/filme.dto';
import { filmeCrudConfig } from './filme.config';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class FilmesService extends CrudService<
  Filme,
  CreateFilmeDto,
  UpdateFilmeDto
> {
  constructor(deps: CrudDeps) {
    super(deps, filmeCrudConfig);

    // 1. Before hooks: defaults and sanitization
    this.addBeforeHook('create', (ctx) => this.prepararDadosCreate(ctx));
    this.addBeforeHook('update', (ctx) => this.prepararDadosUpdate(ctx));

    // 2. Validators: sinopse not empty
    this.addValidator('create', (ctx) => this.validarSinopseCreate(ctx));
    this.addValidator('update', (ctx) => this.validarSinopseUpdate(ctx));

    // 3. Validators: unique (titulo, ano)
    this.addValidator('create', (ctx) => this.validarTituloAnoUnicoCreate(ctx));
    this.addValidator('update', (ctx) => this.validarTituloAnoUnicoUpdate(ctx));

    // 4. Validators: active categorias
    this.addValidator('create', (ctx) => this.validarCategoriasCreate(ctx));
    this.addValidator('update', (ctx) => this.validarCategoriasUpdate(ctx));
  }

  private prepararDadosCreate(ctx: CrudContext<Filme, CreateFilmeDto>): void {
    if (ctx.input.ativo === undefined) {
      ctx.input.ativo = true;
    }
    if (ctx.input.sinopse !== undefined) {
      ctx.input.sinopse = this.sanitizarHtml(ctx.input.sinopse);
    }
  }

  private prepararDadosUpdate(ctx: CrudContext<Filme, UpdateFilmeDto>): void {
    if (ctx.input.sinopse !== undefined) {
      ctx.input.sinopse = this.sanitizarHtml(ctx.input.sinopse);
    }
  }

  private validarSinopseCreate(ctx: CrudContext<Filme, CreateFilmeDto>): void {
    this.verificarSinopseNaoVazia(ctx.input.sinopse);
  }

  private validarSinopseUpdate(ctx: CrudContext<Filme, UpdateFilmeDto>): void {
    if (ctx.input.sinopse !== undefined) {
      this.verificarSinopseNaoVazia(ctx.input.sinopse);
    }
  }

  private verificarSinopseNaoVazia(sinopse: string | undefined): void {
    if (!sinopse || this.extrairTextoHtml(sinopse).length === 0) {
      throw new BusinessException(
        'A sinopse não pode estar vazia',
        'VALIDATION_ERROR',
        HttpStatus.BAD_REQUEST,
        'sinopse',
      );
    }
  }

  private async validarTituloAnoUnicoCreate(
    ctx: CrudContext<Filme, CreateFilmeDto>,
  ): Promise<void> {
    const titulo = ctx.input.titulo?.trim();
    const ano = ctx.input.ano;
    if (!titulo || !ano) return;

    const count = await ctx.manager.getRepository(Filme).count({
      where: {
        titulo: Raw((alias) => `LOWER(${alias}) = LOWER(:titulo)`, { titulo }),
        ano,
      },
    });

    if (count > 0) {
      throw new BusinessException(
        'Já existe um filme cadastrado com este título e ano',
        'FILME_TITULO_ANO_EXISTS',
        HttpStatus.CONFLICT,
        'titulo',
      );
    }
  }

  private async validarTituloAnoUnicoUpdate(
    ctx: CrudContext<Filme, UpdateFilmeDto>,
  ): Promise<void> {
    const existing = ctx.existing;
    const titulo = (ctx.input.titulo ?? existing?.titulo)?.trim();
    const ano = ctx.input.ano ?? existing?.ano;
    if (!titulo || !ano) return;

    if (
      existing &&
      existing.titulo.toLowerCase() === titulo.toLowerCase() &&
      existing.ano === ano
    ) {
      return;
    }

    const targetId = existing ? existing.id : ctx.id!;
    const count = await ctx.manager.getRepository(Filme).count({
      where: {
        titulo: Raw((alias) => `LOWER(${alias}) = LOWER(:titulo)`, { titulo }),
        ano,
        id: Not(targetId),
      },
    });

    if (count > 0) {
      throw new BusinessException(
        'Já existe um filme cadastrado com este título e ano',
        'FILME_TITULO_ANO_EXISTS',
        HttpStatus.CONFLICT,
        'titulo',
      );
    }
  }

  private async validarCategoriasCreate(
    ctx: CrudContext<Filme, CreateFilmeDto>,
  ): Promise<void> {
    await this.verificarCategoriasAtivas(ctx.input.categoriaIds, ctx.manager);
  }

  private async validarCategoriasUpdate(
    ctx: CrudContext<Filme, UpdateFilmeDto>,
  ): Promise<void> {
    if (ctx.input.categoriaIds !== undefined) {
      await this.verificarCategoriasAtivas(ctx.input.categoriaIds, ctx.manager);
    }
  }

  private async verificarCategoriasAtivas(
    categoriaIds: string[] | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!categoriaIds || categoriaIds.length === 0) {
      throw new BusinessException(
        'Uma ou mais categorias informadas são inválidas ou inativas',
        'FILME_CATEGORIA_INVALID',
        HttpStatus.BAD_REQUEST,
        'categoriaIds',
      );
    }

    const categorias = await manager.getRepository(Categoria).find({
      where: {
        id: In(categoriaIds),
        ativo: true,
      },
    });

    if (categorias.length !== categoriaIds.length) {
      throw new BusinessException(
        'Uma ou mais categorias informadas são inválidas ou inativas',
        'FILME_CATEGORIA_INVALID',
        HttpStatus.BAD_REQUEST,
        'categoriaIds',
      );
    }
  }

  private sanitizarHtml(html: string): string {
    if (!html) return '';
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

    clean = clean.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    clean = clean.replace(/javascript\s*:[^"'>]*/gi, '');

    const allowed = [
      'p',
      'br',
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ul',
      'ol',
      'li',
      'div',
      'span',
    ];

    clean = clean.replace(
      /<\/?([a-z0-9]+)(?:\s+[^>]*)?>/gi,
      (match, tag: string) => {
        if (allowed.includes(tag.toLowerCase())) {
          if (match.startsWith('</')) {
            return `</${tag.toLowerCase()}>`;
          }
          if (tag.toLowerCase() === 'br') {
            return '<br>';
          }
          return `<${tag.toLowerCase()}>`;
        }
        return '';
      },
    );

    return clean.trim();
  }

  private extrairTextoHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }
}
