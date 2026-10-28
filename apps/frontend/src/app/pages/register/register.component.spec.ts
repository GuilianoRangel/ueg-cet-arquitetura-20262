import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/auth/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  
  const mockAuthService = {
    register: vi.fn()
  };

  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthService.register.mockReturnValue(of({ success: true }));

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty fields', () => {
    expect(component.registerForm.value).toEqual({ nome: '', email: '', password: '' });
  });

  it('should validate form as invalid when empty', () => {
    expect(component.registerForm.valid).toBe(false);
  });

  it('should enforce name, email and password rules', () => {
    const form = component.registerForm;
    form.controls.nome.setValue('João da Silva');
    form.controls.email.setValue('invalid-email');
    form.controls.password.setValue('123'); // too short (min 6)
    
    expect(form.valid).toBe(false);
    expect(form.controls.email.errors?.['email']).toBeTruthy();
    expect(form.controls.password.errors?.['minlength']).toBeTruthy();

    form.controls.email.setValue('joao@ueg.br');
    form.controls.password.setValue('123456');
    expect(form.valid).toBe(true);
  });

  it('should submit registration and display success message', () => {
    const form = component.registerForm;
    form.controls.nome.setValue('João da Silva');
    form.controls.email.setValue('joao@ueg.br');
    form.controls.password.setValue('123456');

    component.onSubmit();

    expect(mockAuthService.register).toHaveBeenCalledWith({
      nome: 'João da Silva',
      email: 'joao@ueg.br',
      senha: '123456'
    });
    expect(component.successMsg()).toBe('Cadastro realizado com sucesso!');
  });

  it('should show error alert if api registration fails', () => {
    const errorObj = { error: { error: 'AUTH_EMAIL_EXISTS' } };
    mockAuthService.register.mockReturnValue(throwError(() => errorObj));

    const form = component.registerForm;
    form.controls.nome.setValue('João da Silva');
    form.controls.email.setValue('joao@ueg.br');
    form.controls.password.setValue('123456');

    component.onSubmit();

    expect(component.errorMsg()).toContain('Este e-mail já está em uso');
  });
});
