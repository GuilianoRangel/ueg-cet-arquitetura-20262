import { Entity, Column, Index, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { EntityStatus } from '../../common/crud/decorators/entity-status.decorator';
import { Categoria } from '../../categorias/entities/categoria.entity';

@Entity('filmes')
@Index('IDX_filmes_titulo_ano_ativo', ['titulo', 'ano'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Filme extends BaseEntity {
  @ApiProperty({
    example: 'Interestelar',
    description: 'Título do filme',
  })
  @Column({ type: 'varchar', length: 200 })
  titulo!: string;

  @ApiProperty({
    example: 2014,
    description: 'Ano de lançamento do filme',
  })
  @Column({ type: 'integer' })
  ano!: number;

  @ApiProperty({
    example: 'Christopher Nolan',
    description: 'Diretor do filme',
  })
  @Column({ type: 'varchar', length: 150 })
  diretor!: string;

  @ApiProperty({
    example: 169,
    description: 'Duração do filme em minutos',
  })
  @Column({ type: 'integer' })
  duracao!: number;

  @ApiProperty({
    example:
      '<p>Uma equipe de exploradores viaja através de um buraco de minhoca no espaço.</p>',
    description: 'Sinopse formatada em texto rico (HTML sanitizado)',
  })
  @Column({ type: 'text' })
  sinopse!: string;

  @ApiProperty({
    example: ['Ficção Científica', 'Drama'],
    description: 'Gêneros cinematográficos atribuídos ao filme',
    type: [String],
  })
  @Column({ type: 'simple-json' })
  generos!: string[];

  @ApiProperty({
    example: true,
    description: 'Status de ativação do filme',
    default: true,
  })
  @EntityStatus()
  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @ApiProperty({
    description: 'Categorias vinculadas ao filme',
    type: () => [Categoria],
  })
  @ManyToMany(() => Categoria, { eager: false })
  @JoinTable({
    name: 'filmes_categorias',
    joinColumn: { name: 'filme_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoria_id', referencedColumnName: 'id' },
  })
  categorias!: Categoria[];

  get categoriaIds(): string[] {
    return Array.isArray(this.categorias)
      ? this.categorias.map((c) => c.id)
      : [];
  }

  get categoriaNomes(): string[] {
    return Array.isArray(this.categorias)
      ? this.categorias.map((c) => c.nome)
      : [];
  }

  toJSON(): Record<string, unknown> {
    return Object.assign({}, this, {
      categoriaIds: this.categoriaIds,
      categoriaNomes: this.categoriaNomes,
    }) as unknown as Record<string, unknown>;
  }
}
