import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

describe('App', () => {
  const mockAuthService = {
    isAuth: signal(false),
    currentUser: signal(null),
    isAdmin: signal(false),
    logout: () => {}
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
