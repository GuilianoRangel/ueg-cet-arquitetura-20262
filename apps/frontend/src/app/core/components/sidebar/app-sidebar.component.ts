import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { cn } from '../../../shared/utils/cn.util';
import { SidebarIconComponent } from './sidebar-icon.component';
import { SIDEBAR_MENU_ITEMS, SidebarMenuItem } from './sidebar-menu.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SidebarIconComponent],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppSidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = input<SidebarMenuItem[]>(SIDEBAR_MENU_ITEMS);
  readonly collapsed = input<boolean>(false);
  readonly mobileOpen = input<boolean>(false);

  readonly closeMobile = output<void>();

  readonly expandedGroupIds = signal<Set<string>>(new Set());
  readonly hoveredCollapsedItemId = signal<string | null>(null);
  private readonly currentUrl = signal<string>(this.router.url || '/');
  private closeHoverTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visibleMenuItems = computed(() => {
    // Re-evaluate when roles change
    this.authService.isAuth();
    return this.filterItemsByRole(this.menuItems());
  });

  readonly asideClasses = computed(() => {
    const isCollapsed = this.collapsed();
    const isMobileOpen = this.mobileOpen();
    return cn(
      'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface text-surface-foreground border-r border-border shadow-xl transition-all duration-200 ease-in-out md:static md:z-20 md:translate-x-0 md:shadow-none',
      isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full',
      isCollapsed ? 'md:w-16 md:overflow-visible' : 'md:w-64',
    );
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCloseHoverTimer());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    effect(() => {
      const items = this.visibleMenuItems();
      const url = this.currentUrl();
      untracked(() => {
        const activeGroupIds = this.collectActiveParentIds(items, url);
        if (activeGroupIds.length > 0) {
          this.expandedGroupIds.update((prev) => {
            const next = new Set(prev);
            for (const id of activeGroupIds) {
              next.add(id);
            }
            return next;
          });
        }
      });
    });
  }

  isGroupExpanded(id: string): boolean {
    return this.expandedGroupIds().has(id);
  }

  toggleGroup(id: string): void {
    this.expandedGroupIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  hasActiveDescendant(item: SidebarMenuItem): boolean {
    const url = this.currentUrl();
    if (item.route && this.isRouteMatch(item.route, url, item.exact)) {
      return true;
    }
    if (!item.children?.length) {
      return false;
    }
    return item.children.some((child) => this.hasActiveDescendant(child));
  }

  onCollapsedItemEnter(id: string): void {
    if (!this.collapsed()) {
      return;
    }
    this.clearCloseHoverTimer();
    this.hoveredCollapsedItemId.set(id);
  }

  onCollapsedItemLeave(id: string): void {
    this.clearCloseHoverTimer();
    this.closeHoverTimer = setTimeout(() => {
      if (this.hoveredCollapsedItemId() === id) {
        this.hoveredCollapsedItemId.set(null);
      }
    }, 150);
  }

  onCollapsedParentClick(id: string): void {
    if (!this.collapsed()) {
      this.toggleGroup(id);
      return;
    }
    this.clearCloseHoverTimer();
    this.hoveredCollapsedItemId.update((curr) => (curr === id ? null : id));
  }

  onLeafClick(): void {
    this.clearCloseHoverTimer();
    this.hoveredCollapsedItemId.set(null);
    this.closeMobile.emit();
  }

  private clearCloseHoverTimer(): void {
    if (this.closeHoverTimer !== null) {
      clearTimeout(this.closeHoverTimer);
      this.closeHoverTimer = null;
    }
  }

  private filterItemsByRole(items: SidebarMenuItem[]): SidebarMenuItem[] {
    const result: SidebarMenuItem[] = [];

    for (const item of items) {
      if (!this.isItemPermitted(item)) {
        continue;
      }

      if (item.children) {
        const filteredChildren = this.filterItemsByRole(item.children);
        if (filteredChildren.length === 0) {
          continue;
        }
        result.push({ ...item, children: filteredChildren });
      } else {
        result.push(item);
      }
    }

    return result;
  }

  private isItemPermitted(item: SidebarMenuItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    if (item.roleMatch === 'all') {
      return item.roles.every((role) => this.authService.hasRole(role));
    }
    return item.roles.some((role) => this.authService.hasRole(role));
  }

  private collectActiveParentIds(
    items: SidebarMenuItem[],
    url: string,
  ): string[] {
    const ids: string[] = [];
    for (const item of items) {
      if (item.children?.length) {
        const childMatches = item.children.some((c) =>
          this.matchesUrlTree(c, url),
        );
        if (childMatches) {
          ids.push(item.id);
          ids.push(...this.collectActiveParentIds(item.children, url));
        }
      }
    }
    return ids;
  }

  private matchesUrlTree(item: SidebarMenuItem, url: string): boolean {
    if (item.route && this.isRouteMatch(item.route, url, item.exact)) {
      return true;
    }
    if (item.children?.length) {
      return item.children.some((c) => this.matchesUrlTree(c, url));
    }
    return false;
  }

  private isRouteMatch(route: string, currentUrl: string, exact?: boolean): boolean {
    const cleanCurrent = currentUrl.split('?')[0] ?? '';
    if (exact) {
      return cleanCurrent === route;
    }
    return cleanCurrent === route || cleanCurrent.startsWith(`${route}/`);
  }
}
