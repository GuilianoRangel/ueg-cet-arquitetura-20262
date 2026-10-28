import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  
  const mockAuthService = {
    login: vi.fn(),
    isAuth: signal(false)
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthService.login.mockReturnValue(of({ access_token: 'token' }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty controls', () => {
    expect(component.loginForm.value).toEqual({ email: '', password: '' });
  });

  it('should validate email and password as required', () => {
    const form = component.loginForm;
    expect(form.valid).toBe(false);

    form.controls.email.setValue('invalid-email');
    expect(form.valid).toBe(false);

    form.controls.email.setValue('user@ueg.br');
    form.controls.password.setValue('password');
    expect(form.valid).toBe(true);
  });

  it('should call login on AuthService when form is submitted and navigate to root', () => {
    component.loginForm.controls.email.setValue('user@ueg.br');
    component.loginForm.controls.password.setValue('password');
    
    component.onSubmit();
    
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'user@ueg.br',
      senha: 'password'
    });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should display error message on login failure', () => {
    const errorObj = { error: { error: 'AUTH_INVALID_CREDENTIALS' } };
    mockAuthService.login.mockReturnValue(throwError(() => errorObj));

    component.loginForm.controls.email.setValue('user@ueg.br');
    component.loginForm.controls.password.setValue('password');
    
    component.onSubmit();

    expect(component.errorMsg()).toContain('E-mail ou senha incorretos');
  });
});
