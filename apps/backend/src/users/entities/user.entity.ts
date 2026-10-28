import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { Perfil } from '../../perfis/entities/perfil.entity';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty({
    example: 'admin@ueg.br',
    description: 'E-mail do usuário',
  })
  @Column({ unique: true })
  email!: string;

  @ApiProperty({
    example: 'Administrador',
    description: 'Nome completo do usuário',
  })
  @Column()
  nome!: string;

  @Column({ select: false })
  senha!: string;

  @ApiProperty({
    example: true,
    description: 'Status de ativação da conta',
  })
  @Column({ default: false })
  ativo!: boolean;

  @ApiProperty({
    description: 'Lista de perfis atribuídos ao usuário',
    type: () => [Perfil],
  })
  @ManyToMany(() => Perfil)
  @JoinTable({ name: 'users_perfis' })
  perfis!: Perfil[];
}
