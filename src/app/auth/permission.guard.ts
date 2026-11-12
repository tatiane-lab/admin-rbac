import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { Permission, Role } from '../core/models';

/** Exige sessão ativa; guarda a URL pretendida para voltar após o login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Impede usuário logado de ver a tela de login. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !auth.isAuthenticated() || router.createUrlTree(['/dashboard']);
};

/** Lê `data.permissions` (qualquer uma) e `data.role` da rota; falha => /forbidden. */
export const permissionGuard: CanActivateFn & CanActivateChildFn = (route: ActivatedRouteSnapshot) => {
  const permissions = inject(PermissionsService);
  const router = inject(Router);

  const required = route.data['permissions'] as Permission[] | undefined;
  const requiredRole = route.data['role'] as Role | undefined;

  if (requiredRole && !permissions.isRole(requiredRole)) return router.createUrlTree(['/forbidden']);
  if (required && !permissions.hasAny(required)) return router.createUrlTree(['/forbidden']);
  return true;
};
