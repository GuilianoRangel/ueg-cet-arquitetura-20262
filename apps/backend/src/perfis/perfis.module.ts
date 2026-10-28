import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { PerfisService } from './perfis.service';
import { PerfisController } from './perfis.controller';
import { RolesCatalogController } from './roles-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Perfil])],
  controllers: [PerfisController, RolesCatalogController],
  providers: [PerfisService],
  exports: [PerfisService],
})
export class PerfisModule {}
