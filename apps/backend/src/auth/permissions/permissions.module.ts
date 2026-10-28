import { Global, Module, OnModuleInit } from '@nestjs/common';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { PermissionsService } from './permissions.service';
import { RolesCatalog } from './roles-catalog';

@Global()
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule implements OnModuleInit {
  onModuleInit(): void {
    RolesCatalog.register(SENSITIVE_DATA_ROLE);
  }
}
