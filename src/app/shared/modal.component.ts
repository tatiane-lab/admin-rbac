import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { IconComponent } from './icon.component';

/** Modal sobre <dialog> nativo: focus trap, Esc e backdrop vêm do navegador. */
@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="modal" [attr.aria-labelledby]="'modal-title'" (cancel)="onCancel($event)" (click)="onBackdrop($event)">
      <div class="modal__panel">
        <header class="modal__head">
          <h2 id="modal-title">{{ heading() }}</h2>
          <button type="button" class="icon-btn" aria-label="Fechar" (click)="closed.emit()">
            <app-icon name="x" />
          </button>
        </header>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class ModalComponent {
  readonly heading = input.required<string>();
  readonly closed = output<void>();
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    afterNextRender(() => this.dlg().nativeElement.showModal());
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === this.dlg().nativeElement) this.closed.emit();
  }
}
