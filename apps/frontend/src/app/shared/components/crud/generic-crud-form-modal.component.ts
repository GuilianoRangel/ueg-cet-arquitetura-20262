import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Observable } from 'rxjs';
import { CrudFormSchemaDto } from '@repo/utils';
import {
  UI_DIALOG_DATA,
  UiCdkDialogRef,
} from '../ui/dialog/ui-dialog.types';
import { GenericCrudFormComponent } from './generic-crud-form.component';

export interface GenericCrudFormModalData {
  title: string;
  subtitle?: string;
  schema: CrudFormSchemaDto;
  initialData?: Record<string, unknown> | null;
  submitHandler: (payload: Record<string, unknown>) => Observable<unknown>;
}

@Component({
  selector: 'app-generic-crud-form-modal',
  standalone: true,
  imports: [GenericCrudFormComponent],
  templateUrl: './generic-crud-form-modal.component.html',
  styleUrl: './generic-crud-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericCrudFormModalComponent {
  readonly data = inject<GenericCrudFormModalData>(UI_DIALOG_DATA);
  private readonly dialogRef = inject<UiCdkDialogRef<unknown>>(UiCdkDialogRef);
  readonly formComp = viewChild(GenericCrudFormComponent);

  readonly submitting = signal<boolean>(false);

  onSave(payload: Record<string, unknown>): void {
    this.submitting.set(true);
    this.data.submitHandler(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.dialogRef.close(res ?? true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.formComp()?.applyBackendError(err);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}

