import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BaseEntity } from './base.entity';
import { AuthenticatedUser, CrudConfig } from './crud.types';
import { CrudService } from './crud.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { DtoValidationPipe } from './pipes/dto-validation.pipe';
import { Operation } from '../../auth/permissions/operation.decorator';
import { ValidationException } from '../exceptions/validation.exception';

export interface ICrudController<
  E extends BaseEntity,
  C extends object,
  U extends { version: number },
> {
  create(dto: C, user: AuthenticatedUser | null): Promise<E>;
  findAll(
    query: Record<string, unknown>,
    user: AuthenticatedUser | null,
  ): Promise<unknown>;
  findOne(id: string, user: AuthenticatedUser | null): Promise<E>;
  update(id: string, dto: U, user: AuthenticatedUser | null): Promise<E>;
  remove(
    id: string,
    rawVersion: unknown,
    user: AuthenticatedUser | null,
  ): Promise<void>;
}

export function createCrudController<
  E extends BaseEntity,
  C extends object,
  U extends { version: number },
>(
  config: CrudConfig<E, C, U>,
): new (service: CrudService<E, C, U>) => ICrudController<E, C, U> {
  const resource = config.resource;

  const uuidPipe = new ParseUUIDPipe({
    exceptionFactory: () =>
      new ValidationException(
        [{ field: 'id', message: 'O id deve ser um UUID válido' }],
        'Dados inválidos',
      ),
  });

  @ApiBearerAuth('JWT-auth')
  @ApiTags(resource)
  class CrudControllerBase implements ICrudController<E, C, U> {
    constructor(protected readonly service: CrudService<E, C, U>) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Operation(`${resource}:create`)
    @ApiOperation({
      summary: `Criar ${resource}`,
      description: `Cria um novo registro em "${resource}". Exige a role "${resource}:create".`,
    })
    @ApiBody({ type: config.createDto })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Registro criado com sucesso.',
      type: config.entity,
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Dados inválidos ou campos obrigatórios ausentes.',
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token JWT ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `Acesso negado (usuário sem permissão "${resource}:create").`,
    })
    @ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Conflito de unicidade ou regra de negócio.',
    })
    public async create(
      @Body(new DtoValidationPipe(config.createDto)) dto: C,
      @CurrentUser() user: AuthenticatedUser | null,
    ): Promise<E> {
      return this.service.create(dto, user);
    }

    @Get()
    @HttpCode(HttpStatus.OK)
    @Operation(`${resource}:read`)
    @ApiOperation({
      summary: `Listar ${resource}`,
      description: `Retorna lista paginada de "${resource}". Exige a role "${resource}:read".`,
    })
    @ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Número da página (padrão: 1)',
    })
    @ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 10,
      description: 'Quantidade de itens por página (padrão: 10, máx: 5000)',
    })
    @ApiQuery({
      name: 'sort',
      required: false,
      type: String,
      example: 'createdAt:DESC',
      description: 'Campo para ordenação',
    })
    @ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Termo de busca textual nos campos pesquisáveis',
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Lista paginada obtida com sucesso.',
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Parâmetros de paginação, ordenação ou filtro inválidos.',
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token JWT ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `Acesso negado (usuário sem permissão "${resource}:read").`,
    })
    public async findAll(
      @Query() query: Record<string, unknown>,
      @CurrentUser() user: AuthenticatedUser | null,
    ) {
      return this.service.findAll(query, user);
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @Operation(`${resource}:read`)
    @ApiOperation({
      summary: `Buscar ${resource} por ID`,
      description: `Retorna os dados do registro correspondente ao ID informado. Exige a role "${resource}:read".`,
    })
    @ApiParam({
      name: 'id',
      type: String,
      format: 'uuid',
      description: 'UUID do registro',
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Registro retornado com sucesso.',
      type: config.entity,
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'ID inválido (não é UUID).',
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token JWT ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `Acesso negado (usuário sem permissão "${resource}:read").`,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Registro não encontrado ou excluído.',
    })
    public async findOne(
      @Param('id', uuidPipe) id: string,
      @CurrentUser() user: AuthenticatedUser | null,
    ): Promise<E> {
      return this.service.findOne(id, user);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @Operation(`${resource}:update`)
    @ApiOperation({
      summary: `Atualizar ${resource}`,
      description: `Atualiza parcialmente o registro. Exige version para concorrência otimista e role "${resource}:update".`,
    })
    @ApiParam({
      name: 'id',
      type: String,
      format: 'uuid',
      description: 'UUID do registro',
    })
    @ApiBody({ type: config.updateDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Registro atualizado com sucesso.',
      type: config.entity,
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Dados inválidos ou versão ausente/inválida.',
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token JWT ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `Acesso negado (usuário sem permissão "${resource}:update").`,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Registro não encontrado ou já excluído.',
    })
    @ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Conflito de versão ou regra de negócio.',
    })
    public async update(
      @Param('id', uuidPipe) id: string,
      @Body(new DtoValidationPipe(config.updateDto)) dto: U,
      @CurrentUser() user: AuthenticatedUser | null,
    ): Promise<E> {
      return this.service.update(id, dto, user);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Operation(`${resource}:delete`)
    @ApiOperation({
      summary: `Remover ${resource}`,
      description: `Remove o registro (lógica ou fisicamente). Exige version e role "${resource}:delete".`,
    })
    @ApiParam({
      name: 'id',
      type: String,
      format: 'uuid',
      description: 'UUID do registro',
    })
    @ApiQuery({
      name: 'version',
      required: true,
      type: Number,
      example: 1,
      description: 'Versão atual do registro para locking otimista',
    })
    @ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Registro removido com sucesso.',
    })
    @ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Parâmetro version ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token JWT ausente ou inválido.',
    })
    @ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: `Acesso negado (usuário sem permissão "${resource}:delete").`,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Registro não encontrado ou já excluído.',
    })
    @ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Conflito de versão ou registro em uso.',
    })
    public async remove(
      @Param('id', uuidPipe) id: string,
      @Query('version') rawVersion: unknown,
      @CurrentUser() user: AuthenticatedUser | null,
    ): Promise<void> {
      if (
        rawVersion === undefined ||
        rawVersion === null ||
        rawVersion === ''
      ) {
        throw new ValidationException(
          [
            {
              field: 'version',
              message: 'O parâmetro "version" é obrigatório',
            },
          ],
          'Dados inválidos',
        );
      }

      const version = Number(rawVersion);
      if (!Number.isInteger(version) || version < 1) {
        throw new ValidationException(
          [
            {
              field: 'version',
              message: 'A versão deve ser um número inteiro maior ou igual a 1',
            },
          ],
          'Dados inválidos',
        );
      }

      await this.service.remove(id, version, user);
    }
  }

  Object.defineProperty(CrudControllerBase, 'name', {
    value: `${resource.charAt(0).toUpperCase() + resource.slice(1)}CrudControllerBase`,
  });

  return CrudControllerBase;
}
