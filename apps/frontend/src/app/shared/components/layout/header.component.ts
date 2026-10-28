import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-40 w-full border-b border-border bg-surface/80 backdrop-blur-md shadow-sm">
      <div class="flex h-16 items-center px-4 md:px-6">
        <!-- Mobile Menu Toggle -->
        @if (showMenuToggle()) {
          <button 
            (click)="menuToggle.emit()" 
            class="mr-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface hover:bg-muted text-foreground md:hidden transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            <span class="sr-only">Toggle menu</span>
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
  menuToggle = output<void>();
}
