export type Role = 'admin' | 'manager' | 'viewer';

export type Permission =
  | 'dashboard:read'
  | 'reports:read'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'roles:read'
  | 'roles:manage';

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
}

export type UserInput = Pick<User, 'name' | 'email' | 'role' | 'status'>;

export interface UserPermissions {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: Permission[];
}

export interface Session {
  token: string;
  user: User;
  permissions: Permission[];
}

export type RoleMatrix = Record<Role, Permission[]>;
