import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionsService } from './permissions.service';

export const permissionGuard = (route: ActivatedRouteSnapshot) => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  const required = route.data['permissions'] as string[] | undefined;
  const requiredRole = route.data['role'] as string | undefined;

  if (requiredRole && !permissionsService.isRole(requiredRole)) {
    return router.createUrlTree(['/forbidden']);
  }

  if (required && !permissionsService.hasAny(required)) {
    return router.createUrlTree(['/forbidden']);
  }

  return true;
};
