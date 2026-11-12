import { Directive, EmbeddedViewRef, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { Permission } from '../core/models';
import { PermissionsService } from './permissions.service';

/**
 * Diretiva estrutural com semântica de `*ngIf`, reativa a mudanças de permissão.
 *
 *   <button *hasPermission="'users:delete'; else locked">Excluir</button>
 *   <ng-template #locked>...</ng-template>
 *
 * Aceita uma permissão ou lista (basta ter uma). `hasPermissionAll` exige todas.
 */
@Directive({ selector: '[hasPermission]' })
export class HasPermissionDirective {
  readonly hasPermission = input.required<Permission | readonly Permission[]>();
  readonly hasPermissionElse = input<TemplateRef<unknown> | null>(null);
  readonly hasPermissionAll = input(false);

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissions = inject(PermissionsService);

  private view: EmbeddedViewRef<unknown> | null = null;
  private current: 'main' | 'else' | 'none' = 'none';

  constructor() {
    effect(() => {
      const wanted = this.hasPermission();
      const list = typeof wanted === 'string' ? [wanted] : wanted;
      const allowed = this.hasPermissionAll() ? this.permissions.hasAll(list) : this.permissions.hasAny(list);
      this.render(allowed ? 'main' : 'else');
    });
  }

  private render(target: 'main' | 'else'): void {
    const elseTpl = this.hasPermissionElse();
    const next = target === 'else' && !elseTpl ? 'none' : target;
    if (next === this.current) return;
    this.viewContainer.clear();
    this.view = null;
    if (next === 'main') this.view = this.viewContainer.createEmbeddedView(this.templateRef);
    else if (next === 'else' && elseTpl) this.view = this.viewContainer.createEmbeddedView(elseTpl);
    this.current = next;
    this.view?.markForCheck();
  }
}
