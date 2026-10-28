import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { PageResult } from '@repo/utils';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  nome: string;
  ativo?: boolean;
  perfis?: { id: string; nome: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = `${environment.apiUrl}/auth`;
  private usersApiUrl = `${environment.apiUrl}/users`;

  // State using Signals
  private currentUserSignal = signal<User | null>(null);
  private rolesSignal = signal<string[]>([]);
  private rolesLoadedSignal = signal<boolean>(false);

  // Exposed reactive state
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly roles = this.rolesSignal.asReadonly();
  readonly rolesLoaded = this.rolesLoadedSignal.asReadonly();
  readonly isAuth = computed(() => !!this.currentUserSignal());

  constructor() {
    this.loadToken();
  }

  hasRole(role: string): boolean {
    return this.rolesSignal().includes(role);
  }

  loadRoles(): Observable<string[]> {
    return this.http.get<{ roles: string[] }>(`${this.apiUrl}/me/roles`).pipe(
      tap(res => {
        this.rolesSignal.set(res.roles);
        this.rolesLoadedSignal.set(true);
      }),
      map(res => res.roles)
    );
  }

  private extractUserFromToken(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        this.currentUserSignal.set({
          id: payload.sub,
          email: payload.email,
          nome: payload.nome
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private loadToken(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      if (this.extractUserFromToken(token)) {
        this.loadRoles().subscribe({
          error: () => {
            this.logout();
          }
        });
      } else {
        this.logout();
      }
    }
  }

  login(credentials: { email?: string | null; senha?: string | null } | Record<string, unknown>): Observable<string[]> {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        this.extractUserFromToken(res.access_token);
      }),
      switchMap(() => this.loadRoles())
    );
  }

  register(userData: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.currentUserSignal.set(null);
    this.rolesSignal.set([]);
    this.rolesLoadedSignal.set(false);
    this.router.navigate(['/login']);
  }

  // Administrative methods
  getUsers(): Observable<User[]> {
    return this.http.get<PageResult<User>>(`${this.usersApiUrl}?limit=5000`).pipe(
      map(res => res.items)
    );
  }

  activateUser(id: string): Observable<User> {
    return this.http.patch<User>(`${this.usersApiUrl}/${id}/activate`, {});
  }

  resetUserPassword(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.usersApiUrl}/${id}/reset-password`, {});
  }
}
