import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { apiMessage } from '../../core/http.interceptors';
import { ROLES, DEMO_ACCOUNTS, roleLabel } from '../../core/rbac.config';
import { ThemeService } from '../../core/theme.service';
import { IconComponent } from '../../shared/icon.component';
import { RoleBadgeComponent } from '../../shared/role-badge.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, IconComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <section class="login__hero">
        <div class="brand brand--light">
          <span class="brand__mark">{{ theme.theme().name.charAt(0) }}</span>
          <strong>Admin RBAC</strong>
        </div>
        <h1>Controle de acesso por papéis, do guard à diretiva.</h1>
        <p>
          Painel administrativo demo. Entre com um dos perfis ao lado e veja como menu, rotas e botões
          mudam conforme as permissões do papel.
        </p>
        <ul class="hero-list">
          <li><app-icon name="shield" /> Guards funcionais por permissão</li>
          <li><app-icon name="lock" /> Diretiva <code>*hasPermission</code></li>
          <li><app-icon name="check" /> RBAC reforçado também na API (403)</li>
        </ul>
      </section>

      <section class="login__panel">
        <div class="login__card">
          <h2>Entrar</h2>
          <p class="muted">Use uma conta demo ou digite as credenciais.</p>

          <div class="demo-grid" role="group" aria-label="Contas demo">
            @for (acc of accounts; track acc.role) {
              <article class="demo">
                <header>
                  <app-role-badge [role]="acc.role" />
                  <span class="muted">{{ describe(acc.role).summary }}</span>
                </header>
                <ul class="can-list">
                  @for (c of describe(acc.role).can; track c) {
                    <li class="can"><app-icon name="check" [size]="14" /> {{ c }}</li>
                  }
                  @for (c of describe(acc.role).cannot; track c) {
                    <li class="cannot"><app-icon name="x" [size]="14" /> {{ c }}</li>
                  }
                </ul>
                <p class="creds"><code>{{ acc.email }}</code> <code>{{ acc.password }}</code></p>
                <button type="button" class="btn btn--outline btn--block" [disabled]="loading()"
                        [attr.data-testid]="'demo-' + acc.role" (click)="loginAs(acc.email, acc.password)">
                  Entrar como {{ label(acc.role) }}
                </button>
              </article>
            }
          </div>

          <div class="divider"><span>ou</span></div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label class="field">
              <span>E-mail</span>
              <input class="input" type="email" formControlName="email" autocomplete="username" placeholder="voce@acme.dev" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <small class="field__error">Informe um e-mail válido.</small>
              }
            </label>
            <label class="field">
              <span>Senha</span>
              <input class="input" type="password" formControlName="password" autocomplete="current-password" />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <small class="field__error">Informe a senha.</small>
              }
            </label>
            @if (error(); as msg) {
              <p class="alert alert--error" role="alert"><app-icon name="alert" /> {{ msg }}</p>
            }
            <button type="submit" class="btn btn--primary btn--block" [disabled]="loading()">
              {{ loading() ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>
        </div>
      </section>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);

  protected readonly accounts = DEMO_ACCOUNTS;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly label = roleLabel;
  protected describe(role: string) {
    return ROLES.find((r) => r.id === role) ?? ROLES[0];
  }

  protected loginAs(email: string, password: string): void {
    this.form.setValue({ email, password });
    this.submit();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(email, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/dashboard');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(apiMessage(err, 'Não foi possível entrar.'));
      },
    });
  }
}
