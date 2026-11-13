import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { HasPermissionDirective } from '../auth/has-permission.directive';
import { PermissionsService } from '../auth/permissions.service';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from '../shared/icon.component';
import { RoleBadgeComponent } from '../shared/role-badge.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HasPermissionDirective, IconComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.shell--open]="menuOpen()">
      <aside class="sidebar" aria-label="Navegação principal">
        <div class="brand">
          <span class="brand__mark">{{ theme.theme().name.charAt(0) }}</span>
          <div>
            <strong>Admin RBAC</strong>
            <small>{{ theme.theme().name }}</small>
          </div>
        </div>

        <nav class="nav">
          <span class="nav__label">Geral</span>
          <a *hasPermission="'dashboard:read'" routerLink="/dashboard" routerLinkActive="is-active" class="nav__link">
            <app-icon name="dashboard" /> Dashboard
          </a>
          <span class="nav__label">Administração</span>
          <a *hasPermission="'users:read'; else usersLocked" routerLink="/admin/users" routerLinkActive="is-active" class="nav__link">
            <app-icon name="users" /> Usuários
          </a>
          <a *hasPermission="'roles:read'; else rolesLocked" routerLink="/admin/roles" routerLinkActive="is-active" class="nav__link">
            <app-icon name="shield" /> Papéis e permissões
          </a>
          <ng-template #usersLocked>
            <span class="nav__link is-locked" title="Requer users:read"><app-icon name="lock" /> Usuários</span>
          </ng-template>
          <ng-template #rolesLocked>
            <span class="nav__link is-locked" title="Requer roles:read"><app-icon name="lock" /> Papéis e permissões</span>
          </ng-template>
        </nav>

        <p class="sidebar__foot">Itens com cadeado exigem uma permissão que o seu papel não tem.</p>
      </aside>

      <button type="button" class="scrim" aria-label="Fechar menu" (click)="menuOpen.set(false)"></button>

      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" aria-label="Abrir menu" (click)="menuOpen.set(true)">
            <app-icon name="menu" />
          </button>
          <div class="topbar__spacer"></div>

          <label class="select-wrap" title="Tenant (tema)">
            <span class="sr-only">Tenant</span>
            <select class="select select--sm" [value]="theme.theme().tenantId" (change)="onTenant($event)">
              @for (t of theme.tenants; track t.tenantId) {
                <option [value]="t.tenantId">{{ t.name }}</option>
              }
            </select>
          </label>

          <button type="button" class="icon-btn" [attr.aria-label]="theme.isDark() ? 'Tema claro' : 'Tema escuro'" (click)="theme.toggleDarkMode()">
            <app-icon [name]="theme.isDark() ? 'sun' : 'moon'" />
          </button>

          @if (auth.user(); as user) {
            <div class="usermenu">
              <span class="avatar" aria-hidden="true">{{ user.name.charAt(0) }}</span>
              <div class="usermenu__meta">
                <strong>{{ user.name }}</strong>
                @if (perms.role(); as role) {
                  <app-role-badge [role]="role" />
                }
              </div>
              <button type="button" class="icon-btn" aria-label="Sair" title="Sair" data-testid="logout-btn" (click)="auth.logout()">
                <app-icon name="logout" />
              </button>
            </div>
          }
        </header>

        <main class="content" id="main">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly perms = inject(PermissionsService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  constructor() {
    // Fecha o drawer mobile ao navegar.
    toSignal(
      this.router.events.pipe(
        filter((e) => e instanceof NavigationEnd),
        map(() => this.menuOpen.set(false)),
      ),
    );
  }

  protected onTenant(event: Event): void {
    this.theme.loadTenantTheme((event.target as HTMLSelectElement).value);
  }
}
