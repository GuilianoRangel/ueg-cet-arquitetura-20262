import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { Masked } from '../../common/crud/masking/masked.decorator';

@Entity('categorias')
@Index('IDX_categorias_nome_ativo', ['nome'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Categoria extends BaseEntity {
  @ApiProperty({
    example: 'Eletrônicos',
    description: 'Nome da categoria',
  })
  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @ApiProperty({
    example: true,
    description: 'Status de ativação da categoria',
  })
  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @ApiProperty({
    example: 99999,
    description:
      'Valor monetário em centavos (mascarado caso o usuário não possua DADOS_SENSIVEIS)',
    type: Number,
    nullable: true,
  })
  @Masked({ maskValue: 99999 })
  @Column({ type: 'integer', nullable: true })
  valor!: number | null;
}
