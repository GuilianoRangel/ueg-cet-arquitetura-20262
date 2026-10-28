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

    // Unique nome among non-deleted (case-insensitive) via hooks infrastructure
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

    this.addValidator('update', async (ctx) => {
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
        );
      }
    });
  }
}
