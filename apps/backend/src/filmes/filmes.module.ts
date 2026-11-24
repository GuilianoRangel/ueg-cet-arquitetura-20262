import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Filme } from './entities/filme.entity';
import { FilmesService } from './filmes.service';
import { FilmesController } from './filmes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Filme])],
  controllers: [FilmesController],
  providers: [FilmesService],
  exports: [FilmesService],
})
export class FilmesModule {}
