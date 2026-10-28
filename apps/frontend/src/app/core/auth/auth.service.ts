import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  ativo?: boolean;
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
  
  // Exposed reactive state
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuth = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor() {
    this.loadToken();
  }

  private loadToken() {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          this.currentUserSignal.set({
            id: payload.sub,
            email: payload.email,
            nome: payload.nome,
            role: payload.role
          });
        } else {
          this.logout();
        }
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: any) {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access_token);
        this.loadToken();
      })
    );
  }

  register(userData: any) {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any) {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  logout() {
    localStorage.removeItem('access_token');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  // Administrative methods
  getUsers() {
    return this.http.get<User[]>(this.usersApiUrl);
  }

  activateUser(id: string) {
    return this.http.patch<User>(`${this.usersApiUrl}/${id}/activate`, {});
  }

  resetUserPassword(id: string) {
    return this.http.post<{ message: string }>(`${this.usersApiUrl}/${id}/reset-password`, {});
  }
}
