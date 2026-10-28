import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OPERATION_KEY } from '../permissions/operation.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { AuthenticatedUser } from '../../common/crud/crud.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.get<string | undefined>(
      OPERATION_KEY,
      context.getHandler(),
    );

    if (!requiredRole) {
      throw new ForbiddenException('Acesso negado');
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    const effectiveRoles = await this.permissionsService.getEffectiveRoles(
      user.id,
    );

    if (!effectiveRoles.has(requiredRole)) {
      throw new ForbiddenException(
        `Acesso negado: requer a role "${requiredRole}"`,
      );
    }

    return true;
  }
}
