import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { HeaderComponent as UiHeaderComponent } from '../../shared/components/layout/header.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, UiHeaderComponent, ButtonComponent, BadgeComponent],
  template: `
    <ui-header (menuToggle)="menuToggle.emit()">
      <a logo routerLink="/" class="flex items-center gap-2 font-bold text-xl text-primary hover:text-primary-hover transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        <span>UEG Secure Portal</span>
      </a>

      <nav actions class="flex items-center gap-4">
        @if (authService.isAuth()) {
          <div class="hidden md:flex items-center gap-4 mr-4 border-r border-border pr-6">
            @if (authService.isAdmin()) {
              <a 
                routerLink="/admin" 
                routerLinkActive="text-primary border-primary" 
                [routerLinkActiveOptions]="{exact: true}"
                class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 border-b-2 border-transparent">
                Painel Admin
              </a>
            }
          </div>

          <div class="flex items-center gap-4">
            <div class="flex flex-col items-end hidden sm:flex">
              <span class="text-sm font-medium text-foreground">{{ authService.currentUser()?.nome }}</span>
              <ui-badge [variant]="authService.isAdmin() ? 'info' : 'success'">
                {{ authService.currentUser()?.role | uppercase }}
              </ui-badge>
            </div>
            
            <button ui-button variant="destructive" size="sm" (click)="logout()" class="gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span>Sair</span>
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-2">
            <a routerLink="/login" ui-button variant="ghost">Entrar</a>
            <a routerLink="/register" ui-button variant="default">Cadastrar</a>
          </div>
        }
      </nav>
    </ui-header>
  `
})
export class HeaderComponent {
  authService = inject(AuthService);
  menuToggle = output<void>();

  logout() {
    this.authService.logout();
  }
}
