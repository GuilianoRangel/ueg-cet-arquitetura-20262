import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Observable } from 'rxjs';

export { DIALOG_DATA as UI_DIALOG_DATA, DialogRef as UiCdkDialogRef };

export interface UiDialogConfig<TData = unknown> {
  data?: TData;
  width?: string;
  maxWidth?: string;
  disableClose?: boolean;
  panelClass?: string | string[];
}

export interface UiConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

export interface UiDialogRef<TResult = unknown> {
  readonly closed: Observable<TResult | undefined>;
  close(result?: TResult): void;
}
