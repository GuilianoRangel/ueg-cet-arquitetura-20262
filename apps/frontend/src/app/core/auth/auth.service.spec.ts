import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService, User } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  
  const mockRouter = {
    navigate: vi.fn()
  };

  beforeEach(() => {
    localStorage.clear();
    
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with isAuth = false', () => {
    expect(service.isAuth()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });

  it('should perform login and set access token', () => {
    const mockRes = { access_token: 'header.' + btoa(JSON.stringify({ sub: '123', email: 'test@ueg.br', nome: 'Test User', role: 'admin', exp: (Date.now() + 1000000) / 1000 })) + '.signature' };

    service.login({ email: 'test@ueg.br', senha: 'password' }).subscribe(res => {
      expect(res.access_token).toBe(mockRes.access_token);
      expect(localStorage.getItem('access_token')).toBe(mockRes.access_token);
      expect(service.isAuth()).toBe(true);
      expect(service.currentUser()?.nome).toBe('Test User');
      expect(service.isAdmin()).toBe(true);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockRes);
  });

  it('should register a new user', () => {
    const mockUserData = { email: 'user@ueg.br', nome: 'New User', senha: 'password' };

    service.register(mockUserData).subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockUserData);
    req.flush({ success: true });
  });

  it('should clear token and update state on logout', () => {
    localStorage.setItem('access_token', 'some_token');
    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.isAuth()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should retrieve users list for admins', () => {
    const mockUsers: User[] = [
      { id: '1', email: 'admin@ueg.br', nome: 'Admin', role: 'admin', ativo: true },
      { id: '2', email: 'user@ueg.br', nome: 'User', role: 'user', ativo: false }
    ];

    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users[1].ativo).toBe(false);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers);
  });

  it('should activate user', () => {
    service.activateUser('2').subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/2/activate`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ id: '2', ativo: true });
  });

  it('should trigger administrative password reset', () => {
    service.resetUserPassword('3').subscribe(res => {
      expect(res.message).toBe('E-mail enviado');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/3/reset-password`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'E-mail enviado' });
  });
});
