import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';

@Entity('perfis')
@Index('IDX_perfis_nome_ativo', ['nome'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Perfil extends BaseEntity {
  @ApiProperty({
    example: 'Administrador',
    description: 'Nome do perfil de acesso',
  })
  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @ApiProperty({
    example: true,
    description: 'Status de ativação do perfil',
  })
  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @ApiProperty({
    example: ['users:read', 'users:write'],
    description: 'Lista de permissões (roles) vinculadas ao perfil',
    type: [String],
  })
  @Column({ type: 'simple-json', default: '[]' })
  roles!: string[];

  @ApiProperty({
    example: false,
    description:
      'Indica se é um perfil essencial do sistema (protegido contra alteração e exclusão)',
  })
  @Column({ type: 'boolean', default: false })
  sistema!: boolean;
}
