import { Controller, Get, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Operation } from '../auth/permissions/operation.decorator';
import { RolesCatalog } from '../auth/permissions/roles-catalog';

@ApiBearerAuth('JWT-auth')
@ApiTags('roles')
@Controller('roles')
export class RolesCatalogController {
  @Get()
  @Operation('perfis:read')
  @ApiOperation({
    summary: 'Catálogo de permissões do sistema',
    description:
      'Retorna a lista completa de roles registradas no sistema. Exige a role "perfis:read".',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Catálogo de roles retornado com sucesso.',
    schema: {
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string' },
          example: ['categorias:read', 'users:read', 'perfis:read'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token JWT ausente ou inválido.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acesso negado (exige permissão "perfis:read").',
  })
  getRoles(this: void): { roles: string[] } {
    return { roles: RolesCatalog.all() };
  }
}
