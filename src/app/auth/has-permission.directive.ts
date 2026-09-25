import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnDestroy,
  inject,
  effect,
} from '@angular/core';
import { PermissionsService } from './permissions.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  @Input({ required: true }) hasPermission!: string | string[];
  @Input() hasPermissionElse: TemplateRef<unknown> | null = null;

  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private permissionsService = inject(PermissionsService);

  private rendered: 'main' | 'else' | 'none' = 'none';

  ngOnInit() {
    this.updateView();
  }

  private updateView() {
    const permissions = Array.isArray(this.hasPermission)
      ? this.hasPermission
      : [this.hasPermission];

    const hasAccess = this.permissionsService.hasAny(permissions);

    if (hasAccess && this.rendered !== 'main') {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = 'main';
    } else if (!hasAccess && this.rendered !== 'else') {
      this.viewContainer.clear();
      if (this.hasPermissionElse) {
        this.viewContainer.createEmbeddedView(this.hasPermissionElse);
      }
      this.rendered = 'else';
    }
  }

  ngOnDestroy() {
    this.viewContainer.clear();
  }
}
