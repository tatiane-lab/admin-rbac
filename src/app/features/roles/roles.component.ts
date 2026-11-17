import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { PermissionsService } from '../../auth/permissions.service';
import { apiMessage } from '../../core/http.interceptors';
import { Permission, Role } from '../../core/models';
import { PERMISSIONS, ROLES } from '../../core/rbac.config';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { RoleBadgeComponent } from '../../shared/role-badge.component';
import { RolesService } from './roles.service';

@Component({
  selector: 'app-roles',
  imports: [IconComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>Papéis e permissões</h1>
        <p class="muted">Matriz de acesso. As alterações valem na hora (o papel Admin é fixo).</p>
      </div>
    </header>

    <section class="card card--flush">
      @switch (roles.state()) {
        @case ('error') {
          <div class="state" role="alert">
            <app-icon name="alert" [size]="28" />
            <h3>Não foi possível carregar a matriz</h3>
            <button type="button" class="btn btn--outline" (click)="roles.load()"><app-icon name="refresh" /> Tentar de novo</button>
          </div>
        }
        @case ('ready') {
          @if (roles.matrix(); as matrix) {
            <div class="table-wrap">
              <table class="table table--matrix">
                <thead>
                  <tr>
                    <th>Permissão</th>
                    @for (r of roleList; track r.id) {
                      <th class="center"><app-role-badge [role]="r.id" /></th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (p of permissions; track p.id) {
                    <tr>
                      <td><strong>{{ p.label }}</strong><small><code>{{ p.id }}</code> · {{ p.description }}</small></td>
                      @for (r of roleList; track r.id) {
                        <td class="center">
                          <input type="checkbox" class="check"
                                 [attr.data-testid]="'toggle-' + r.id + '-' + p.id"
                                 [attr.aria-label]="r.label + ': ' + p.label"
                                 [checked]="matrix[r.id].includes(p.id)"
                                 [disabled]="r.id === 'admin' || busy() !== null"
                                 (change)="toggle(r.id, p.id, matrix[r.id], $event)" />
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
        @default {
          <div class="table-wrap" aria-busy="true">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="skeleton-row"><span class="skeleton"></span><span class="skeleton skeleton--short"></span></div>
            }
          </div>
        }
      }
    </section>
  `,
})
export class RolesComponent {
  protected readonly roles = inject(RolesService);
  private readonly perms = inject(PermissionsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly permissions = PERMISSIONS;
  protected readonly roleList = ROLES;
  protected readonly busy = signal<Role | null>(null);

  constructor() {
    this.roles.load();
  }

  protected toggle(role: Role, permission: Permission, current: Permission[], event: Event): void {
    if (!this.perms.has('roles:manage')) {
      (event.target as HTMLInputElement).checked = current.includes(permission);
      this.toast.error('Você não pode editar papéis.');
      return;
    }
    const checked = (event.target as HTMLInputElement).checked;
    const next = checked ? [...current, permission] : current.filter((p) => p !== permission);
    this.busy.set(role);
    this.roles.save(role, next).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('Permissões atualizadas.');
        this.auth.refresh().subscribe();
      },
      error: (err: unknown) => {
        this.busy.set(null);
        (event.target as HTMLInputElement).checked = !checked;
        this.toast.error(apiMessage(err));
      },
    });
  }
}
