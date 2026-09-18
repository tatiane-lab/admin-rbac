import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface UserPermissions {
  userId: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private http = inject(HttpClient);
  private _permissions = signal<UserPermissions | null>(null);

  permissions = this._permissions.asReadonly();
  role = computed(() => this._permissions()?.role ?? null);
  tenantId = computed(() => this._permissions()?.tenantId ?? null);

  loadPermissions(): void {
    this.http.get<UserPermissions>('/api/auth/me/permissions').subscribe({
      next: (perms) => this._permissions.set(perms),
    });
  }

  has(permission: string): boolean {
    return this._permissions()?.permissions.includes(permission) ?? false;
  }

  hasAny(permissions: string[]): boolean {
    return permissions.some((p) => this.has(p));
  }

  hasAll(permissions: string[]): boolean {
    return permissions.every((p) => this.has(p));
  }

  isRole(role: string): boolean {
    return this.role() === role;
  }
}
