import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-shell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground transition-colors duration-200">
      <!-- Top Navigation -->
      <ng-content select="ui-header, app-header, [shell-header]"></ng-content>

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <!-- Sidebar Navigation -->
        <ng-content select="ui-sidebar, app-sidebar, [shell-sidebar]"></ng-content>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto p-2 sm:p-4 md:p-5 focus:outline-none">
          <div class="mx-auto max-w-7xl animate-fade-in">
            <ng-content></ng-content>
          </div>
        </main>
      </div>
    </div>
  `
})
export class ShellComponent {}
