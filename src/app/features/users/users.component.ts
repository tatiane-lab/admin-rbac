import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { HasPermissionDirective } from '../../auth/has-permission.directive';
import { apiMessage } from '../../core/http.interceptors';
import { Role, User, UserInput } from '../../core/models';
import { ROLES } from '../../core/rbac.config';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/icon.component';
import { ModalComponent } from '../../shared/modal.component';
import { RoleBadgeComponent } from '../../shared/role-badge.component';
import { UsersService } from './users.service';

const PAGE_SIZE = 8;

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, DatePipe, HasPermissionDirective, IconComponent, ModalComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-head">
      <div>
        <h1>Usuários</h1>
        <p class="muted">Gerencie quem acessa o painel e com qual papel.</p>
      </div>
      <div class="page-head__actions">
        <button *hasPermission="'users:write'" type="button" class="btn btn--primary" data-testid="new-user-btn" (click)="openCreate()">
          <app-icon name="plus" /> Novo usuário
        </button>
      </div>
    </header>

    <section class="card card--flush">
      <div class="toolbar">
        <label class="search">
          <app-icon name="search" [size]="16" />
          <span class="sr-only">Buscar</span>
          <input class="input" type="search" placeholder="Buscar por nome ou e-mail" [value]="search()" (input)="onSearch($event)" />
        </label>
        <select class="select" aria-label="Filtrar por papel" [value]="roleFilter()" (change)="onRole($event)">
          <option value="all">Todos os papéis</option>
          @for (r of roles; track r.id) {
            <option [value]="r.id">{{ r.label }}</option>
          }
        </select>
      </div>

      @switch (users.state()) {
        @case ('error') {
          <div class="state" role="alert">
            <app-icon name="alert" [size]="28" />
            <h3>Não foi possível carregar os usuários</h3>
            <p class="muted">Verifique sua conexão ou permissões e tente novamente.</p>
            <button type="button" class="btn btn--outline" (click)="users.load()"><app-icon name="refresh" /> Tentar de novo</button>
          </div>
        }
        @case ('ready') {
          @if (pageItems().length === 0) {
            <div class="state" data-testid="empty-state">
              <app-icon name="inbox" [size]="28" />
              <h3>{{ users.users().length === 0 ? 'Nenhum usuário ainda' : 'Nada encontrado' }}</h3>
              <p class="muted">{{ users.users().length === 0 ? 'Cadastre o primeiro usuário.' : 'Ajuste a busca ou o filtro de papel.' }}</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Usuário</th><th>Papel</th><th class="hide-sm">Status</th><th class="hide-sm">Criado em</th><th class="col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of pageItems(); track u.id) {
                    <tr [attr.data-testid]="'user-row'">
                      <td>
                        <div class="person">
                          <span class="avatar">{{ u.name.charAt(0) }}</span>
                          <div><strong>{{ u.name }}</strong><small>{{ u.email }}</small></div>
                        </div>
                      </td>
                      <td><app-role-badge [role]="u.role" /></td>
                      <td class="hide-sm"><span [class]="'badge badge--' + u.status">{{ u.status === 'active' ? 'Ativo' : 'Inativo' }}</span></td>
                      <td class="hide-sm">{{ u.createdAt | date: 'dd/MM/yyyy' }}</td>
                      <td class="col-actions">
                        <button *hasPermission="'users:write'" type="button" class="icon-btn" [attr.aria-label]="'Editar ' + u.name" data-testid="edit-btn" (click)="openEdit(u)">
                          <app-icon name="edit" />
                        </button>
                        <button *hasPermission="'users:delete'" type="button" class="icon-btn icon-btn--danger" [attr.aria-label]="'Excluir ' + u.name"
                                data-testid="row-delete-btn" [disabled]="u.id === auth.user()?.id" (click)="toDelete.set(u)">
                          <app-icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="pager">
              <span class="muted">{{ filtered().length }} resultado(s)</span>
              <div>
                <button type="button" class="icon-btn" aria-label="Página anterior" [disabled]="page() <= 1" (click)="page.set(page() - 1)"><app-icon name="left" /></button>
                <span>{{ page() }} / {{ totalPages() }}</span>
                <button type="button" class="icon-btn" aria-label="Próxima página" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)"><app-icon name="right" /></button>
              </div>
            </footer>
          }
        }
        @default {
          <div class="table-wrap" aria-busy="true" aria-label="Carregando">
            @for (i of skeletons; track i) {
              <div class="skeleton-row"><span class="skeleton skeleton--circle"></span><span class="skeleton"></span><span class="skeleton skeleton--short"></span></div>
            }
          </div>
        }
      }
    </section>

    @if (formOpen()) {
      <app-modal [heading]="editing() ? 'Editar usuário' : 'Novo usuário'" (closed)="closeForm()">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="modal__body">
            <label class="field">
              <span>Nome</span>
              <input class="input" formControlName="name" />
              @if (form.controls.name.touched && form.controls.name.invalid) {
                <small class="field__error">Informe o nome (mín. 2 caracteres).</small>
              }
            </label>
            <label class="field">
              <span>E-mail</span>
              <input class="input" type="email" formControlName="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <small class="field__error">Informe um e-mail válido.</small>
              }
            </label>
            <div class="field-row">
              <label class="field">
                <span>Papel</span>
                <select class="select" formControlName="role">
                  @for (r of roles; track r.id) {
                    <option [value]="r.id">{{ r.label }}</option>
                  }
                </select>
              </label>
              <label class="field">
                <span>Status</span>
                <select class="select" formControlName="status">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </div>
            @if (formError(); as msg) {
              <p class="alert alert--error" role="alert"><app-icon name="alert" /> {{ msg }}</p>
            }
          </div>
          <footer class="modal__foot">
            <button type="button" class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar' }}</button>
          </footer>
        </form>
      </app-modal>
    }

    @if (toDelete(); as target) {
      <app-modal heading="Excluir usuário" (closed)="toDelete.set(null)">
        <div class="modal__body">
          <p>Excluir <strong>{{ target.name }}</strong>? Esta ação não pode ser desfeita.</p>
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost" (click)="toDelete.set(null)">Cancelar</button>
          <button type="button" class="btn btn--danger" data-testid="confirm-delete" [disabled]="saving()" (click)="remove(target)">
            {{ saving() ? 'Excluindo...' : 'Excluir' }}
          </button>
        </footer>
      </app-modal>
    }
  `,
})
export class UsersComponent {
  protected readonly users = inject(UsersService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly roles = ROLES;
  protected readonly skeletons = [1, 2, 3, 4, 5];

  protected readonly search = signal('');
  protected readonly roleFilter = signal<Role | 'all'>('all');
  protected readonly page = signal(1);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<User | null>(null);
  protected readonly toDelete = signal<User | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['viewer' as Role],
    status: ['active' as User['status']],
  });

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    return this.users
      .users()
      .filter((u) => (role === 'all' || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
  });
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected readonly pageItems = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  constructor() {
    this.users.load();
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }

  protected onRole(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as Role | 'all');
    this.page.set(1);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', email: '', role: 'viewer', status: 'active' });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(user: User): void {
    this.editing.set(user);
    this.form.reset({ name: user.name, email: user.email, role: user.role, status: user.status });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input: UserInput = this.form.getRawValue();
    const current = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    const request$ = current ? this.users.update(current.id, input) : this.users.create(input);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(current ? 'Usuário atualizado.' : 'Usuário criado.');
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(apiMessage(err));
      },
    });
  }

  protected remove(user: User): void {
    this.saving.set(true);
    this.users.remove(user.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.toDelete.set(null);
        this.toast.success(`${user.name} foi excluído.`);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toDelete.set(null);
        this.toast.error(apiMessage(err));
      },
    });
  }
}
