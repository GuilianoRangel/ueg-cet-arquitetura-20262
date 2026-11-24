import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../auth/auth.service';
import { AppSidebarComponent } from './app-sidebar.component';
import { SidebarMenuItem } from './sidebar-menu.config';

@Component({ standalone: true, template: '<p>Dummy</p>' })
class DummyRouteComponent {}

describe('AppSidebarComponent', () => {
  let fixture: ComponentFixture<AppSidebarComponent>;
  let grantedRoles: Set<string>;

  const mockAuthService = {
    isAuth: signal(true),
    currentUser: signal({ id: 'u-1', nome: 'Tester', email: 't@ueg.br' }),
    hasRole: (role: string) => grantedRoles.has(role),
  };

  const sampleMenu: SidebarMenuItem[] = [
    {
      id: 'dashboard',
      label: 'Início',
      icon: 'home',
      route: '/dashboard',
      exact: true,
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: 'layers',
      children: [
        {
          id: 'filmes',
          label: 'Filmes',
          icon: 'film',
          route: '/filmes',
          roles: ['filmes:read'],
        },
        {
          id: 'categorias',
          label: 'Categorias',
          icon: 'tag',
          route: '/categorias',
          roles: ['categorias:read'],
        },
      ],
    },
    {
      id: 'admin-group',
      label: 'Administração',
      icon: 'settings',
      children: [
        {
          id: 'users',
          label: 'Usuários',
          icon: 'users',
          route: '/admin',
          roles: ['users:read'],
        },
      ],
    },
  ];

  beforeEach(async () => {
    grantedRoles = new Set(['filmes:read', 'categorias:read']);

    await TestBed.configureTestingModule({
      imports: [AppSidebarComponent],
      providers: [
        provideRouter([
          { path: 'dashboard', component: DummyRouteComponent },
          { path: 'filmes', component: DummyRouteComponent },
          { path: 'categorias', component: DummyRouteComponent },
          { path: 'admin', component: DummyRouteComponent },
        ]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSidebarComponent);
  });

  it('should filter menu items by roles and hide parent groups with no permitted children', () => {
    fixture.componentRef.setInput('menuItems', sampleMenu);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Início');
    expect(host.textContent).toContain('Catálogo');
    // Administração has only 'users:read' which is NOT in grantedRoles
    expect(host.textContent).not.toContain('Administração');
  });

  it('should expand and collapse nested parent group when clicked in expanded mode', () => {
    fixture.componentRef.setInput('menuItems', sampleMenu);
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const catBtn = host.querySelector(
      '[data-testid="sidebar-group-catalogo"]',
    ) as HTMLButtonElement;
    expect(catBtn).toBeTruthy();

    // Expand group
    catBtn.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('Filmes');
    expect(host.textContent).toContain('Categorias');

    // Collapse group
    catBtn.click();
    fixture.detectChanges();
    expect(host.textContent).not.toContain('Filmes');
  });

  it('should show only icons when collapsed and display tooltip/flyout on hover', () => {
    fixture.componentRef.setInput('menuItems', sampleMenu);
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const aside = host.querySelector('aside');
    expect(aside?.className).toContain('md:w-16');

    // Inline labels are hidden when collapsed
    expect(
      host.querySelector('[data-testid="sidebar-label-dashboard"]'),
    ).toBeNull();

    // Hovering a leaf item shows tooltip with its label
    const dashContainer = host.querySelector(
      '[data-testid="sidebar-item-dashboard"]',
    ) as HTMLElement;
    dashContainer.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const tooltip = host.querySelector(
      '[data-testid="sidebar-tooltip-dashboard"]',
    );
    expect(tooltip?.textContent).toContain('Início');

    // Hovering a parent item shows floating flyout with parent label and child links
    const catContainer = host.querySelector(
      '[data-testid="sidebar-item-catalogo"]',
    ) as HTMLElement;
    catContainer.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const flyout = host.querySelector('[data-testid="sidebar-flyout-catalogo"]');
    expect(flyout?.textContent).toContain('Catálogo');
    expect(flyout?.textContent).toContain('Filmes');
    expect(flyout?.textContent).toContain('Categorias');
  });
});
