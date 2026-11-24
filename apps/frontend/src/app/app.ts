import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header.component';
import { AppSidebarComponent } from './core/components/sidebar/app-sidebar.component';
import { AuthService } from './core/auth/auth.service';
import { ShellComponent } from './shared/components/layout/shell.component';
import { ToastComponent } from './shared/components/ui/toast.component';
import { UiLoadingOverlayComponent } from './shared/components/ui/loading-overlay.component';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'ueg_sidebar_collapsed';
const DESKTOP_BREAKPOINT_PX = 768;

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    AppSidebarComponent,
    ShellComponent,
    ToastComponent,
    UiLoadingOverlayComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly authService = inject(AuthService);
  readonly sidebarCollapsed = signal<boolean>(this.readCollapsedState());
  readonly mobileSidebarOpen = signal<boolean>(false);

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth < DESKTOP_BREAKPOINT_PX) {
      this.mobileSidebarOpen.update((v) => !v);
      return;
    }

    this.sidebarCollapsed.update((prev) => {
      const next = !prev;
      this.persistCollapsedState(next);
      return next;
    });
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  private readCollapsedState(): boolean {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private persistCollapsedState(collapsed: boolean): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
      }
    } catch {
      // Ignore storage errors
    }
  }
}
