import { Injectable, computed, signal } from '@angular/core';
import { HttpContext, HttpContextToken } from '@angular/common/http';

export const SKIP_GLOBAL_LOADING = new HttpContextToken<boolean>(() => false);

export function withSkipGlobalLoading(
  context: HttpContext = new HttpContext(),
): HttpContext {
  return context.set(SKIP_GLOBAL_LOADING, true);
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeCount = signal<number>(0);
  private readonly visibleSignal = signal<boolean>(false);
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Indica se há requisições ativas imediatamente */
  readonly isBusy = computed(() => this.activeCount() > 0);

  /** Indica se o overlay visual deve ser exibido (após debounce de 150ms para evitar piscadas em respostas rápidas) */
  readonly isLoading = this.visibleSignal.asReadonly();

  show(): void {
    const nextCount = this.activeCount() + 1;
    this.activeCount.set(nextCount);

    if (nextCount === 1 && !this.visibleSignal() && !this.debounceTimer) {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        if (this.activeCount() > 0) {
          this.visibleSignal.set(true);
        }
      }, 150);
    }
  }

  hide(): void {
    const nextCount = Math.max(0, this.activeCount() - 1);
    this.activeCount.set(nextCount);

    if (nextCount === 0) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this.visibleSignal.set(false);
    }
  }

  reset(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.activeCount.set(0);
    this.visibleSignal.set(false);
  }
}

