import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { HasPermissionDirective } from '../../auth/has-permission.directive';
import { PermissionsService } from '../../auth/permissions.service';
import { apiMessage } from '../../core/http.interceptors';
import { PERMISSIONS, ROLES } from '../../core/rbac.config';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { RoleBadgeComponent } from '../../shared/role-badge.component';
import { UsersService } from '../users/users.service';

@Component({
  selector: 'app-dashboard',
  imports: [HasPermissionDirective, RouterLink, IconComponent, ModalComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="muted">Olá, {{ auth.user()?.name }}. Veja abaixo o que o seu papel permite.</p>
      </div>
      <div class="page-head__actions">
        <button *hasPermission="'reports:read'" type="button" class="btn btn--outline" data-testid="export-btn" (click)="exportReport()">
          <app-icon name="download" /> Exportar relatório
        </button>
        <button *hasPermission="'users:delete'" type="button" class="btn btn--danger" data-testid="delete-btn"
                [disabled]="inactiveCount() === 0" (click)="confirmPurge.set(true)">
          <app-icon name="trash" /> Remover inativos ({{ inactiveCount() }})
        </button>
      </div>
    </header>

    <section class="stats" aria-label="Indicadores">
      <ng-container *hasPermission="'users:read'; else restricted">
        <article class="stat"><span class="stat__label">Usuários</span><strong class="stat__value">{{ users.users().length }}</strong></article>
        <article class="stat"><span class="stat__label">Ativos</span><strong class="stat__value">{{ activeCount() }}</strong></article>
        <article class="stat"><span class="stat__label">Inativos</span><strong class="stat__value">{{ inactiveCount() }}</strong></article>
        <article class="stat"><span class="stat__label">Managers</span><strong class="stat__value">{{ managerCount() }}</strong></article>
      </ng-container>
      <ng-template #restricted>
        <article class="stat stat--locked" data-testid="stats-locked">
          <app-icon name="lock" [size]="22" />
          <div>
            <strong>Indicadores de usuários restritos</strong>
            <p class="muted">O seu papel não possui <code>users:read</code>.</p>
          </div>
        </article>
      </ng-template>
    </section>

    <div class="grid-2">
      <section class="card">
        <header class="card__head">
          <h2>Seu acesso</h2>
          @if (perms.role(); as role) {
            <app-role-badge [role]="role" />
          }
        </header>
        <ul class="perm-list">
          @for (p of permissions; track p.id) {
            <li [class.is-off]="!perms.has(p.id)" [attr.data-testid]="'perm-' + p.id">
              <app-icon [name]="perms.has(p.id) ? 'check' : 'lock'" [size]="16" />
              <div>
                <strong>{{ p.label }}</strong>
                <small>{{ p.description }} · <code>{{ p.id }}</code></small>
              </div>
            </li>
          }
        </ul>
      </section>

      <section class="card">
        <header class="card__head"><h2>Papéis do sistema</h2></header>
        <ul class="role-list">
          @for (r of roles; track r.id) {
            <li [class.is-current]="r.id === perms.role()">
              <app-role-badge [role]="r.id" />
              <span>{{ r.summary }}</span>
            </li>
          }
        </ul>
        <a *hasPermission="'users:read'" routerLink="/admin/users" class="btn btn--ghost">Ir para usuários</a>
      </section>
    </div>

    @if (confirmPurge()) {
      <app-modal heading="Remover usuários inativos" (closed)="confirmPurge.set(false)">
        <div class="modal__body">
          <p>{{ inactiveCount() }} usuário(s) inativo(s) serão excluídos permanentemente. Deseja continuar?</p>
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" (click)="confirmPurge.set(false)">Cancelar</button>
          <button type="button" class="btn btn--danger" data-testid="confirm-purge" [disabled]="busy()" (click)="purge()">
            {{ busy() ? 'Removendo...' : 'Remover' }}
          </button>
        </footer>
      </app-modal>
    }
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly perms = inject(PermissionsService);
  protected readonly users = inject(UsersService);
  private readonly toast = inject(ToastService);

  protected readonly permissions = PERMISSIONS;
  protected readonly roles = ROLES;
  protected readonly confirmPurge = signal(false);
  protected readonly busy = signal(false);

  protected readonly activeCount = computed(() => this.users.users().filter((u) => u.status === 'active').length);
  protected readonly inactiveCount = computed(() => this.users.users().filter((u) => u.status === 'inactive').length);
  protected readonly managerCount = computed(() => this.users.users().filter((u) => u.role === 'manager').length);

  constructor() {
    if (this.perms.has('users:read')) this.users.load();
  }

  protected exportReport(): void {
    const rows = ['permission,granted', ...PERMISSIONS.map((p) => `${p.id},${this.perms.has(p.id)}`)];
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-acesso.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success('Relatório exportado.');
  }

  protected purge(): void {
    const targets = this.users.users().filter((u) => u.status === 'inactive');
    if (targets.length === 0) return;
    this.busy.set(true);
    forkJoin(targets.map((u) => this.users.remove(u.id))).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmPurge.set(false);
        this.toast.success(`${targets.length} usuário(s) removido(s).`);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.toast.error(apiMessage(err));
      },
    });
  }
}
