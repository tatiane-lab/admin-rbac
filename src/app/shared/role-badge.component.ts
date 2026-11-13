import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Role } from '../core/models';
import { roleLabel } from '../core/rbac.config';

@Component({
  selector: 'app-role-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge--' + role()">{{ label() }}</span>`,
})
export class RoleBadgeComponent {
  readonly role = input.required<Role>();
  protected readonly label = computed(() => roleLabel(this.role()));
}
