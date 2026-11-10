import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Perfil } from './entities/perfil.entity';
import { Funcionalidade } from './entities/funcionalidade.entity';
import { FuncionalidadeAcao } from './entities/funcionalidade-acao.entity';
import { PerfisService } from './perfis.service';
import { PerfisController } from './perfis.controller';
import { RolesCatalogController } from './roles-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Perfil, Funcionalidade, FuncionalidadeAcao])],
  controllers: [PerfisController, RolesCatalogController],
  providers: [PerfisService],
  exports: [PerfisService],
})
export class PerfisModule {}
