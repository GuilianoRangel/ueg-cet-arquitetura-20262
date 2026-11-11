export interface FuncionalidadeAcaoDto {
  id: string;
  acao: string;
  role: string;
}

export interface FuncionalidadeGroupDto {
  id: string;
  nome: string;
  acoes: FuncionalidadeAcaoDto[];
}

export interface RolesSyncResultDto {
  addedActions: number;
  removedActions: number;
  totalActiveActions: number;
}

