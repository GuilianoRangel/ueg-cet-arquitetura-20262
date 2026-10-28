export interface PerfilDto {
  id: string;
  nome: string;
  ativo: boolean;
  roles: string[];
  sistema: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  ultimoUsuarioId: string | null;
}

export interface CategoriaDto {
  id: string;
  nome: string;
  ativo: boolean;
  valor: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  ultimoUsuarioId: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  perfis: PerfilDto[];
  version: number;
  createdAt: string;
  updatedAt: string;
  ultimoUsuarioId: string | null;
}

export interface UserRolesResponse {
  roles: string[];
}
