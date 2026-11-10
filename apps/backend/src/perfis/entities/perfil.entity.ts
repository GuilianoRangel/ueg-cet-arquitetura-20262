import { Entity, Column, Index, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/crud/base.entity';
import { FuncionalidadeAcao } from './funcionalidade-acao.entity';

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
    example: false,
    description:
      'Indica se é um perfil essencial do sistema (protegido contra alteração e exclusão)',
  })
  @Column({ type: 'boolean', default: false })
  sistema!: boolean;

  @ManyToMany(() => FuncionalidadeAcao, { eager: false })
  @JoinTable({
    name: 'perfis_funcionalidades_acoes',
    joinColumn: { name: 'perfil_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'funcionalidade_acao_id',
      referencedColumnName: 'id',
    },
  })
  acoes!: FuncionalidadeAcao[];

  private _rolesList?: string[];

  get acaoIds(): string[] {
    return Array.isArray(this.acoes) ? this.acoes.map((a) => a.id) : [];
  }

  get funcionalidades(): string[] {
    if (!Array.isArray(this.acoes)) return [];
    const nomes = new Set<string>();
    for (const a of this.acoes) {
      if (a.funcionalidade?.nome) {
        nomes.add(a.funcionalidade.nome);
      }
    }
    return Array.from(nomes).sort();
  }

  @ApiProperty({
    example: ['users:read', 'users:write'],
    description: 'Lista de permissões (roles) vinculadas ao perfil',
    type: [String],
  })
  get roles(): string[] {
    if (this._rolesList) {
      return this._rolesList;
    }
    if (!Array.isArray(this.acoes)) return [];
    const list: string[] = [];
    for (const a of this.acoes) {
      if (a.funcionalidade?.nome && a.acao) {
        list.push(`${a.funcionalidade.nome}:${a.acao}`);
      }
    }
    return list.sort();
  }

  set roles(vals: string[]) {
    this._rolesList = vals;
  }
}
