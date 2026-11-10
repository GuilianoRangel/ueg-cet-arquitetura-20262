import { Entity, Column, Index, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { FuncionalidadeAcao } from './funcionalidade-acao.entity';

@Entity('funcionalidades')
@Index('IDX_funcionalidades_nome_ativo', ['nome'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Funcionalidade extends BaseEntity {
  @ApiProperty({
    example: 'categorias',
    description: 'Nome da funcionalidade no catálogo de permissões',
  })
  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @OneToMany(() => FuncionalidadeAcao, (acao) => acao.funcionalidade)
  acoes!: FuncionalidadeAcao[];
}
