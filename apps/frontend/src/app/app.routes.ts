import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { UsersListComponent } from './pages/admin/users-list.component';
import { CategoriasPageComponent } from './pages/categorias/categorias-page.component';
import { PerfisPageComponent } from './pages/perfis/perfis-page.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard, roleGuard } from './core/auth/auth.guard';
import { AuthService } from './core/auth/auth.service';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'access-denied', component: AccessDeniedComponent },
  {
    path: 'admin',
    component: UsersListComponent,
    canActivate: [authGuard, roleGuard('users:read')],
  },
  {
    path: 'users',
    component: UsersListComponent,
    canActivate: [authGuard, roleGuard('users:read')],
  },
  {
    path: 'perfis',
    component: PerfisPageComponent,
    canActivate: [authGuard, roleGuard('perfis:read')],
  },
  {
    path: 'categorias',
    component: CategoriasPageComponent,
    canActivate: [authGuard, roleGuard('categorias:read')],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: () => {
      const authService = inject(AuthService);
      return authService.hasRole('users:read') ? '/admin' : '/dashboard';
    },
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: () => {
      const authService = inject(AuthService);
      return authService.hasRole('users:read') ? '/admin' : '/dashboard';
    },
  },
];
