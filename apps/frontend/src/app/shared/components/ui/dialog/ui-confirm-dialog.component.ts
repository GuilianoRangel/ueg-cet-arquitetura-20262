import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../button.component';
import {
  UI_DIALOG_DATA,
  UiCdkDialogRef,
  UiConfirmOptions,
} from './ui-dialog.types';

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './ui-confirm-dialog.component.html',
  styleUrl: './ui-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiConfirmDialogComponent {
  readonly data = inject<UiConfirmOptions>(UI_DIALOG_DATA);
  private readonly dialogRef = inject<UiCdkDialogRef<boolean>>(UiCdkDialogRef);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
