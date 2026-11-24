import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-md shadow-sm">
      <div class="flex h-16 items-center px-4 md:px-6">
        <!-- Sidebar Toggle (Desktop & Mobile) -->
        @if (showMenuToggle()) {
          <button
            type="button"
            data-testid="header-sidebar-toggle"
            (click)="menuToggle.emit()"
            [attr.title]="toggleTitle()"
            [attr.aria-label]="toggleTitle()"
            [attr.aria-expanded]="!sidebarCollapsed()"
            class="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        }
        
        <!-- Logo Area -->
        <div class="flex items-center gap-2">
          <ng-content select="[logo]"></ng-content>
        </div>

        <!-- Spacer -->
        <div class="flex-1">
          <ng-content select="[center]"></ng-content>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent {
  showMenuToggle = input<boolean>(true);
  sidebarCollapsed = input<boolean>(false);
  toggleTitle = input<string>('Alternar menu lateral');
  menuToggle = output<void>();
}
