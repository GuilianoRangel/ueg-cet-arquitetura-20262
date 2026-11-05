import { Injectable, Type, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Observable, map } from 'rxjs';
import {
  UiConfirmOptions,
  UiDialogConfig,
  UiDialogRef,
} from './ui-dialog.types';
import { UiConfirmDialogComponent } from './ui-confirm-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class UiDialogService {
  private readonly dialog = inject(Dialog);

  open<TResult = unknown, TData = unknown>(
    component: Type<unknown>,
    config?: UiDialogConfig<TData>,
  ): UiDialogRef<TResult> {
    const customPanelClasses = Array.isArray(config?.panelClass)
      ? config.panelClass
      : config?.panelClass
        ? [config.panelClass]
        : [];

    const cdkRef = this.dialog.open<TResult, TData>(component, {
      data: config?.data,
      width: config?.width,
      maxWidth: config?.maxWidth ?? '95vw',
      disableClose: config?.disableClose ?? false,
      panelClass: [
        'ui-dialog-panel',
        'bg-card',
        'text-foreground',
        'border',
        'border-border',
        'rounded-2xl',
        'shadow-xl',
        ...customPanelClasses,
      ],
      backdropClass: ['bg-background/60', 'backdrop-blur-xs'],
    });

    return {
      closed: cdkRef.closed,
      close: (result?: TResult) => cdkRef.close(result),
    };
  }

  confirm(options: UiConfirmOptions): Observable<boolean> {
    const ref = this.open<boolean, UiConfirmOptions>(UiConfirmDialogComponent, {
      data: {
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        variant: options.variant ?? 'default',
      },
      width: '440px',
    });

    return ref.closed.pipe(map((confirmed) => confirmed === true));
  }
}

