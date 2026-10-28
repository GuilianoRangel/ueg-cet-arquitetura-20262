import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderComponent } from './core/components/header.component';
import { AuthService } from './core/auth/auth.service';
import { ShellComponent } from './shared/components/layout/shell.component';
import { SidebarComponent } from './shared/components/layout/sidebar.component';
import { ToastComponent } from './shared/components/ui/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, ShellComponent, SidebarComponent, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  authService = inject(AuthService);
  sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
}
