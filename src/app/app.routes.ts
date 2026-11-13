import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './auth/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar · Admin RBAC',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Admin RBAC',
        data: { permissions: ['dashboard:read'] },
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'admin/users',
        title: 'Usuários · Admin RBAC',
        data: { permissions: ['users:read'] },
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'admin/roles',
        title: 'Papéis · Admin RBAC',
        data: { permissions: ['roles:read'] },
        loadComponent: () => import('./features/roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'forbidden',
        title: 'Acesso negado · Admin RBAC',
        loadComponent: () => import('./features/errors/errors.component').then((m) => m.ForbiddenComponent),
      },
    ],
  },
  {
    path: '**',
    title: 'Não encontrada · Admin RBAC',
    loadComponent: () => import('./features/errors/errors.component').then((m) => m.NotFoundComponent),
  },
];
