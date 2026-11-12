import { Permission, Role, RoleMatrix } from './models';

export interface RoleInfo {
  id: Role;
  label: string;
  summary: string;
  can: string[];
  cannot: string[];
}

export interface PermissionInfo {
  id: Permission;
  label: string;
  description: string;
}

export const ROLES: readonly RoleInfo[] = [
  {
    id: 'admin',
    label: 'Admin',
    summary: 'Acesso total: usuários, papéis e permissões.',
    can: ['Criar, editar e excluir usuários', 'Gerenciar a matriz de permissões', 'Ver relatórios e dashboard'],
    cannot: [],
  },
  {
    id: 'manager',
    label: 'Manager',
    summary: 'Gerencia usuários no dia a dia, sem excluir.',
    can: ['Ver, criar e editar usuários', 'Ver relatórios e dashboard'],
    cannot: ['Excluir usuários', 'Ver ou editar papéis'],
  },
  {
    id: 'viewer',
    label: 'Viewer',
    summary: 'Somente leitura do dashboard e relatórios.',
    can: ['Ver dashboard', 'Ver relatórios'],
    cannot: ['Acessar usuários', 'Acessar papéis'],
  },
];

export const PERMISSIONS: readonly PermissionInfo[] = [
  { id: 'dashboard:read', label: 'Ver dashboard', description: 'Acessa a página inicial' },
  { id: 'reports:read', label: 'Ver relatórios', description: 'Exporta o relatório do painel' },
  { id: 'users:read', label: 'Listar usuários', description: 'Acessa a página de usuários' },
  { id: 'users:write', label: 'Criar/editar usuários', description: 'Botões de novo e editar' },
  { id: 'users:delete', label: 'Excluir usuários', description: 'Botão de excluir' },
  { id: 'roles:read', label: 'Ver papéis', description: 'Acessa a matriz de permissões' },
  { id: 'roles:manage', label: 'Editar papéis', description: 'Altera a matriz de permissões' },
];

export const DEFAULT_ROLE_MATRIX: RoleMatrix = {
  admin: PERMISSIONS.map((p) => p.id),
  manager: ['dashboard:read', 'reports:read', 'users:read', 'users:write'],
  viewer: ['dashboard:read', 'reports:read'],
};

export const DEMO_ACCOUNTS: readonly { role: Role; email: string; password: string; name: string }[] = [
  { role: 'admin', email: 'admin@acme.dev', password: 'admin123', name: 'Ana Admin' },
  { role: 'manager', email: 'manager@acme.dev', password: 'manager123', name: 'Marcos Manager' },
  { role: 'viewer', email: 'viewer@acme.dev', password: 'viewer123', name: 'Vera Viewer' },
];

export const roleLabel = (role: Role): string => ROLES.find((r) => r.id === role)?.label ?? role;
