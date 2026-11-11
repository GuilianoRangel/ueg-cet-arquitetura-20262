import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FuncionalidadeGroupDto, RolesSyncResultDto } from '@repo/utils';
import { Operation } from '../auth/permissions/operation.decorator';
import { RolesSyncService } from './roles-sync.service';
import { Funcionalidade } from './entities/funcionalidade.entity';

@ApiBearerAuth('JWT-auth')
@ApiTags('roles')
@Controller('roles')
export class RolesCatalogController {
  constructor(
    @InjectRepository(Funcionalidade)
    private readonly funcRepo: Repository<Funcionalidade>,
    private readonly rolesSyncService: RolesSyncService,
  ) {}

  @Get()
  @Operation('perfis:read')
  @ApiOperation({
    summary: 'Catálogo de funcionalidades e ações do sistema',
    description:
      'Retorna as funcionalidades ativas e suas ações registradas no sistema, agrupadas e ordenadas. Exige a role "perfis:read".',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Catálogo de funcionalidades e ações retornado com sucesso.',
  })
  async getRoles(): Promise<{ funcionalidades: FuncionalidadeGroupDto[] }> {
    const funcs = await this.funcRepo.find({
      where: { deletedAt: IsNull() },
      relations: ['acoes'],
      order: { nome: 'ASC' },
    });

    const funcionalidades: FuncionalidadeGroupDto[] = [...funcs]
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((f) => {
        const activeAcoes = (f.acoes || [])
          .filter((a) => a.deletedAt === null)
          .sort((a, b) => a.acao.localeCompare(b.acao))
          .map((a) => ({
            id: a.id,
            acao: a.acao,
            role: `${f.nome}:${a.acao}`,
          }));

        return {
          id: f.id,
          nome: f.nome,
          acoes: activeAcoes,
        };
      });

    return { funcionalidades };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @Operation('perfis:sync')
  @ApiOperation({
    summary: 'Sincronizar catálogo de permissões com a base de dados',
    description:
      'Compara o catálogo em código com as tabelas relacionais, aplicando adições, soft deletes e vinculando ao perfil Administrador. Exige a role "perfis:sync".',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sincronização executada com sucesso.',
  })
  async syncRoles(): Promise<RolesSyncResultDto> {
    return this.rolesSyncService.sync();
  }
}
