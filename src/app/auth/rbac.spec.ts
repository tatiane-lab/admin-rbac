import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { Session } from '../core/models';
import { DEFAULT_ROLE_MATRIX } from '../core/rbac.config';
import { AuthService } from './auth.service';
import { HasPermissionDirective } from './has-permission.directive';
import { permissionGuard } from './permission.guard';
import { PermissionsService } from './permissions.service';

const sessionFor = (role: 'admin' | 'manager' | 'viewer'): Session => ({
  token: 'mock.x',
  user: { id: 'u1', name: 'Teste', email: 't@acme.dev', role, status: 'active', createdAt: '2026-01-01' },
  permissions: DEFAULT_ROLE_MATRIX[role],
});

const signIn = (role: 'admin' | 'manager' | 'viewer'): void => {
  const auth = TestBed.inject(AuthService);
  // setSession é privado de propósito; a sessão é restaurada via storage no fluxo real.
  (auth as unknown as { setSession(s: Session): void }).setSession(sessionFor(role));
};

describe('RBAC', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
  });

  it('PermissionsService reflete as permissões do papel', () => {
    signIn('manager');
    const perms = TestBed.inject(PermissionsService);
    expect(perms.role()).toBe('manager');
    expect(perms.has('users:write')).toBe(true);
    expect(perms.has('users:delete')).toBe(false);
    expect(perms.hasAny(['users:delete', 'users:read'])).toBe(true);
    expect(perms.hasAll(['users:delete', 'users:read'])).toBe(false);
  });

  it('permissionGuard redireciona para /forbidden sem permissão', () => {
    signIn('viewer');
    const route = { data: { permissions: ['users:read'] } } as unknown as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => permissionGuard(route, {} as never));
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/forbidden');
  });

  it('permissionGuard libera quando há permissão', () => {
    signIn('admin');
    const route = { data: { permissions: ['roles:read'] } } as unknown as ActivatedRouteSnapshot;
    expect(TestBed.runInInjectionContext(() => permissionGuard(route, {} as never))).toBe(true);
  });

  it('*hasPermission mostra e esconde conforme o papel', async () => {
    @Component({
      imports: [HasPermissionDirective],
      template: `
        <button *hasPermission="'users:delete'; else locked" id="del">Excluir</button>
        <ng-template #locked><span id="locked">Bloqueado</span></ng-template>
      `,
    })
    class HostComponent {}

    signIn('viewer');
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#del')).toBeNull();
    expect(el.querySelector('#locked')).not.toBeNull();

    signIn('admin');
    await fixture.whenStable();
    expect(el.querySelector('#del')).not.toBeNull();
    expect(el.querySelector('#locked')).toBeNull();
  });
});
