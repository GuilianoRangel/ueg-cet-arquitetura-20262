import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { RolesCatalog } from './roles-catalog';

export const OPERATION_KEY = 'operation';

export function Operation(role: string): MethodDecorator & ClassDecorator {
  RolesCatalog.register(role);
  return applyDecorators(
    SetMetadata(OPERATION_KEY, role),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}
