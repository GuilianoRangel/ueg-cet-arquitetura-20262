import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { Funcionalidade } from './funcionalidade.entity';

@Entity('funcionalidades_acoes')
@Index('IDX_funcionalidades_acoes_unique_ativo', ['funcionalidadeId', 'acao'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class FuncionalidadeAcao extends BaseEntity {
  @ApiProperty({
    example: 'a4b1c2d3-e4f5-6789-0123-456789abcdef',
    description: 'ID da funcionalidade proprietária',
  })
  @Column({ type: 'uuid' })
  funcionalidadeId!: string;

  @ManyToOne(() => Funcionalidade, (f) => f.acoes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'funcionalidadeId' })
  funcionalidade!: Funcionalidade;

  @ApiProperty({
    example: 'create',
    description:
      'Ação permitida para a funcionalidade (ex: create, read, update, delete)',
  })
  @Column({ type: 'varchar', length: 100 })
  acao!: string;
}
