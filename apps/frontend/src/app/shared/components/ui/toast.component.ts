import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'ui-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <div
        *ngFor="let toast of toastService.toasts()"
        class="flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm transition-all duration-300 transform pointer-events-auto animate-slide-in-right"
        [ngClass]="{
          'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-900/50': toast.type === 'success',
          'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-900/50': toast.type === 'error',
          'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-900/50': toast.type === 'info'
        }"
      >
        <!-- Success Icon -->
        <svg *ngIf="toast.type === 'success'" class="w-5 h-5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <!-- Error Icon -->
        <svg *ngIf="toast.type === 'error'" class="w-5 h-5 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>

        <!-- Info Icon -->
        <svg *ngIf="toast.type === 'info'" class="w-5 h-5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <span class="flex-1 font-medium">{{ toast.message }}</span>

        <!-- Dismiss Button -->
        <button
          (click)="toastService.remove(toast.id)"
          class="p-1 rounded-lg text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
