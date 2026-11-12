import { Injectable, computed, inject } from '@angular/core';
import { Permission, Role, UserPermissions } from '../core/models';
import { AuthService } from './auth.service';

/** Fonte única de verdade para checagens de acesso (guards, diretiva, templates). */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly auth = inject(AuthService);

  readonly permissions = computed<UserPermissions | null>(() => {
    const session = this.auth.session();
    return session
      ? {
          userId: session.user.id,
          tenantId: 'acme',
          role: session.user.role,
          permissions: session.permissions,
        }
      : null;
  });
  readonly role = computed<Role | null>(() => this.permissions()?.role ?? null);
  readonly tenantId = computed(() => this.permissions()?.tenantId ?? null);
  readonly granted = computed<ReadonlySet<Permission>>(() => new Set(this.permissions()?.permissions ?? []));

  has(permission: Permission): boolean {
    return this.granted().has(permission);
  }

  hasAny(permissions: readonly Permission[]): boolean {
    return permissions.some((p) => this.has(p));
  }

  hasAll(permissions: readonly Permission[]): boolean {
    return permissions.every((p) => this.has(p));
  }

  isRole(role: Role): boolean {
    return this.role() === role;
  }
}
