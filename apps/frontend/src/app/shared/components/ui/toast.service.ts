import { Injectable, signal } from '@angular/core';
import { toast as sonnerToast } from 'ngx-sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(
    message: string,
    type: ToastType = 'info',
    duration: number = 3000,
  ): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toastItem: Toast = { id, message, type };

    this.toasts.update((currentToasts) => [...currentToasts, toastItem]);

    switch (type) {
      case 'success':
        sonnerToast.success(message, { duration });
        break;
      case 'error':
        sonnerToast.error(message, { duration });
        break;
      case 'warning':
        sonnerToast.warning(message, { duration });
        break;
      case 'info':
      default:
        sonnerToast.info(message, { duration });
        break;
    }

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  remove(id: string): void {
    this.toasts.update((currentToasts) =>
      currentToasts.filter((t) => t.id !== id),
    );
  }
}
