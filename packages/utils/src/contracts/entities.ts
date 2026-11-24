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

export const FILME_GENEROS = [
  "Ação",
  "Aventura",
  "Animação",
  "Comédia",
  "Crime",
  "Documentário",
  "Drama",
  "Fantasia",
  "Ficção Científica",
  "Musical",
  "Romance",
  "Suspense",
  "Terror",
] as const;

export type FilmeGenero = (typeof FILME_GENEROS)[number];

export interface FilmeDto {
  id: string;
  titulo: string;
  ano: number;
  diretor: string;
  duracao: number;
  sinopse: string;
  generos: string[];
  ativo: boolean;
  categorias: CategoriaDto[];
  categoriaIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  ultimoUsuarioId: string | null;
}
