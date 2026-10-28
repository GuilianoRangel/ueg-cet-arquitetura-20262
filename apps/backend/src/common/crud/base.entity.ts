import {
  PrimaryGeneratedColumn,
  VersionColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export abstract class BaseEntity {
  @ApiProperty({
    example: 'd84b2c8a-1c32-45c1-8409-51a43ffb90a1',
    description: 'Identificador único (UUID v4)',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 1,
    description:
      'Versão do registro para controle de concorrência otimista (optimistic locking)',
  })
  @VersionColumn()
  version!: number;

  @ApiProperty({
    example: '2026-10-28T12:00:00.000Z',
    description: 'Data e hora da criação do registro',
  })
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty({
    example: '2026-10-28T12:00:00.000Z',
    description: 'Data e hora da última atualização do registro',
  })
  @UpdateDateColumn()
  updatedAt!: Date;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Data e hora da exclusão lógica (soft-delete), se houver',
  })
  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({
    example: 'be2e9495-5304-46c7-955e-fe02be5af38d',
    nullable: true,
    description: 'ID do último usuário que realizou mutação neste registro',
  })
  @Column({ type: 'varchar', length: 36, nullable: true })
  ultimoUsuarioId!: string | null;
}
