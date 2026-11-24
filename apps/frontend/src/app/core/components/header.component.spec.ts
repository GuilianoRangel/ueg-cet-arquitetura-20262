import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;

  const mockAuthService = {
    isAuth: signal(true),
    currentUser: signal({ id: 'u-1', nome: 'Maria Silva', email: 'm@ueg.br' }),
    hasRole: (role: string) => role === 'users:read',
    logout: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
  });

  it('should display sidebar toggle button when showSidebarToggle is true and emit menuToggle on click', () => {
    fixture.componentRef.setInput('showSidebarToggle', true);
    fixture.componentRef.setInput('sidebarCollapsed', false);
    fixture.detectChanges();

    const toggleSpy = vi.fn();
    component.menuToggle.subscribe(toggleSpy);

    const host = fixture.nativeElement as HTMLElement;
    const btn = host.querySelector(
      '[data-testid="header-sidebar-toggle"]',
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.className).not.toContain('md:hidden');

    btn.click();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it('should hide sidebar toggle button when showSidebarToggle is false', () => {
    fixture.componentRef.setInput('showSidebarToggle', false);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(
      host.querySelector('[data-testid="header-sidebar-toggle"]'),
    ).toBeNull();
  });
});
