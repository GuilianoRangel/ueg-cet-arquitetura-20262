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
    expect(service.roles()).toEqual([]);
    expect(service.rolesLoaded()).toBe(false);
  });

  it('should not expose role in the current user', () => {
    const token = 'header.' + btoa(JSON.stringify({ sub: '123', email: 'test@ueg.br', nome: 'Test User', exp: (Date.now() + 1000000) / 1000 })) + '.signature';
    localStorage.setItem('access_token', token);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter }
      ]
    });

    const localService = TestBed.inject(AuthService);
    const localHttpMock = TestBed.inject(HttpTestingController);

    const rolesReq = localHttpMock.expectOne(`${environment.apiUrl}/auth/me/roles`);
    rolesReq.flush({ roles: ['users:read'] });

    const user = localService.currentUser();
    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@ueg.br');
    expect((user as unknown as Record<string, unknown>)['role']).toBeUndefined();
  });

  it('should call GET /auth/me/roles after login and expose roles signal', () => {
    const mockRes = { access_token: 'header.' + btoa(JSON.stringify({ sub: '123', email: 'test@ueg.br', nome: 'Test User', exp: (Date.now() + 1000000) / 1000 })) + '.signature' };

    service.login({ email: 'test@ueg.br', senha: 'password' }).subscribe(roles => {
      expect(roles).toEqual(['users:read', 'users:write']);
      expect(service.isAuth()).toBe(true);
      expect(service.currentUser()?.nome).toBe('Test User');
      expect(service.roles()).toEqual(['users:read', 'users:write']);
      expect(service.rolesLoaded()).toBe(true);
    });

    const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush(mockRes);

    const rolesReq = httpMock.expectOne(`${environment.apiUrl}/auth/me/roles`);
    expect(rolesReq.request.method).toBe('GET');
    rolesReq.flush({ roles: ['users:read', 'users:write'] });
  });

  it('should load roles on startup when a valid token exists', () => {
    const token = 'header.' + btoa(JSON.stringify({ sub: '456', email: 'init@ueg.br', nome: 'Init User', exp: (Date.now() + 1000000) / 1000 })) + '.signature';
    localStorage.setItem('access_token', token);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter }
      ]
    });

    const initService = TestBed.inject(AuthService);
    const initHttp = TestBed.inject(HttpTestingController);

    const rolesReq = initHttp.expectOne(`${environment.apiUrl}/auth/me/roles`);
    expect(rolesReq.request.method).toBe('GET');
    rolesReq.flush({ roles: ['users:read'] });

    expect(initService.currentUser()?.email).toBe('init@ueg.br');
    expect(initService.roles()).toEqual(['users:read']);
    expect(initService.rolesLoaded()).toBe(true);
  });

  it('hasRole should return true only for roles present', () => {
    const mockRes = { access_token: 'header.' + btoa(JSON.stringify({ sub: '123', email: 'test@ueg.br', nome: 'Test User', exp: (Date.now() + 1000000) / 1000 })) + '.signature' };

    service.login({ email: 'test@ueg.br', senha: 'password' }).subscribe();

    const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    loginReq.flush(mockRes);

    const rolesReq = httpMock.expectOne(`${environment.apiUrl}/auth/me/roles`);
    rolesReq.flush({ roles: ['users:read', 'categorias:read'] });

    expect(service.hasRole('users:read')).toBe(true);
    expect(service.hasRole('categorias:read')).toBe(true);
    expect(service.hasRole('perfis:read')).toBe(false);
  });

  it('should clear roles on logout', () => {
    const mockRes = { access_token: 'header.' + btoa(JSON.stringify({ sub: '123', email: 'test@ueg.br', nome: 'Test User', exp: (Date.now() + 1000000) / 1000 })) + '.signature' };

    service.login({ email: 'test@ueg.br', senha: 'password' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush(mockRes);
    httpMock.expectOne(`${environment.apiUrl}/auth/me/roles`).flush({ roles: ['users:read'] });

    expect(service.roles()).toEqual(['users:read']);
    expect(service.rolesLoaded()).toBe(true);

    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.isAuth()).toBe(false);
    expect(service.currentUser()).toBeNull();
    expect(service.roles()).toEqual([]);
    expect(service.rolesLoaded()).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
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

  it('should retrieve users list for admins', () => {
    const mockUsers: User[] = [
      { id: '1', email: 'admin@ueg.br', nome: 'Admin', ativo: true, perfis: [{ id: 'p1', nome: 'Administrador' }] },
      { id: '2', email: 'user@ueg.br', nome: 'User', ativo: false, perfis: [] }
    ];

    service.getUsers().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users[1].ativo).toBe(false);
      expect(users[0].perfis?.[0].nome).toBe('Administrador');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users?limit=5000`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: mockUsers, total: 2, page: 1, limit: 5000, pages: 1 });
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
