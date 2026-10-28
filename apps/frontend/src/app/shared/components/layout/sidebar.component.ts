import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../utils/cn.util';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Mobile Backdrop -->
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
        (click)="close.emit()"
      ></div>
    }

    <!-- Sidebar Content -->
    <aside
      [class]="sidebarClasses()"
    >
      <!-- Header / Logo area inside sidebar (optional, good for mobile) -->
      <div class="flex h-16 shrink-0 items-center border-b border-border px-6">
        <ng-content select="[sidebar-header]"></ng-content>
      </div>

      <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto py-4">
        <ng-content></ng-content>
      </div>

      <!-- Footer / Profile -->
      <div class="mt-auto border-t border-border p-4 bg-muted/20">
        <ng-content select="[sidebar-footer]"></ng-content>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  isOpen = input<boolean>(false);
  close = output<void>();

  sidebarClasses = computed(() => {
    return cn(
      'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface text-surface-foreground shadow-xl transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 md:shadow-none md:border-r md:border-border',
      this.isOpen() ? 'translate-x-0' : '-translate-x-full'
    );
  });
}
