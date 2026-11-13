import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state state--page" data-testid="forbidden">
      <app-icon name="lock" [size]="40" />
      <h1>Acesso negado</h1>
      <p class="muted">O seu papel não tem permissão para abrir esta página.</p>
      <a routerLink="/dashboard" class="btn btn--primary">Voltar ao dashboard</a>
    </div>
  `,
})
export class ForbiddenComponent {}

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state state--page">
      <app-icon name="search" [size]="40" />
      <h1>Página não encontrada</h1>
      <p class="muted">O endereço <code>{{ url }}</code> não existe.</p>
      <a [routerLink]="auth.isAuthenticated() ? '/dashboard' : '/login'" class="btn btn--primary">Voltar ao início</a>
    </div>
  `,
})
export class NotFoundComponent {
  protected readonly auth = inject(AuthService);
  protected readonly url = inject(Router).url;
}
