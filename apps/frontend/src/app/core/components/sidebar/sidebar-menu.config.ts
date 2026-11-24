export type SidebarIconName =
  | 'home'
  | 'users'
  | 'shield'
  | 'tag'
  | 'film'
  | 'folder'
  | 'layers'
  | 'settings';

export interface SidebarMenuItem {
  /** Identificador único do item de menu */
  id: string;
  /** Título exibido no menu e no tooltip quando recolhido */
  label: string;
  /** Ícone do catálogo SidebarIconName */
  icon?: SidebarIconName;
  /** Rota Angular associada (opcional para grupos pai) */
  route?: string;
  /** Correspondência exata de rota para routerLinkActive */
  exact?: boolean;
  /** Lista de roles necessárias para visualizar o item (vazio = visível a qualquer autenticado) */
  roles?: string[];
  /** Estratégia de avaliação quando houver múltiplas roles (padrão: 'any') */
  roleMatch?: 'any' | 'all';
  /** Badge opcional exibido ao lado do rótulo */
  badge?: string;
  /** Subitens aninhados (pai e filhos) */
  children?: SidebarMenuItem[];
}

export const SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Início',
    icon: 'home',
    route: '/dashboard',
    exact: true,
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    icon: 'layers',
    children: [
      {
        id: 'filmes',
        label: 'Filmes',
        icon: 'film',
        route: '/filmes',
        exact: true,
        roles: ['filmes:read'],
      },
      {
        id: 'categorias',
        label: 'Categorias',
        icon: 'tag',
        route: '/categorias',
        exact: true,
        roles: ['categorias:read'],
      },
    ],
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: 'settings',
    children: [
      {
        id: 'users',
        label: 'Usuários',
        icon: 'users',
        route: '/admin',
        exact: true,
        roles: ['users:read'],
      },
      {
        id: 'perfis',
        label: 'Perfis',
        icon: 'shield',
        route: '/perfis',
        exact: true,
        roles: ['perfis:read'],
      },
    ],
  },
];
