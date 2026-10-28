import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type };
    
    this.toasts.update(currentToasts => [...currentToasts, toast]);

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

  remove(id: string): void {
    this.toasts.update(currentToasts => currentToasts.filter(t => t.id !== id));
  }
}
