import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseAuthError } from '../../core/utils/error-handler.util';
import { CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent } from '../../shared/components/ui/card.component';
import { InputComponent } from '../../shared/components/ui/input.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardContentComponent,
    InputComponent,
    ButtonComponent
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <ui-card class="w-full max-w-md">
        <ui-card-header>
          <ui-card-title class="text-center text-3xl mb-1 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Bem-vindo de volta
          </ui-card-title>
          <p class="text-muted-foreground text-center">Faça login na sua conta para continuar</p>
        </ui-card-header>
        
        <ui-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <ui-input 
              label="E-Mail"
              type="email" 
              formControlName="email"
              placeholder="seu@email.com"
            ></ui-input>

            <div>
              <div class="flex items-center justify-end mb-1">
                <a routerLink="/forgot-password" class="text-sm text-primary hover:underline transition-colors">Esqueceu a senha?</a>
              </div>
              <ui-input 
                label="Senha"
                type="password" 
                formControlName="password"
                placeholder="••••••••"
              ></ui-input>
            </div>

            <div *ngIf="errorMsg()" class="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {{ errorMsg() }}
            </div>

            <button 
              ui-button 
              variant="default"
              type="submit" 
              [disabled]="loginForm.invalid || isLoading()"
              class="w-full mt-2">
              <span *ngIf="isLoading()" class="mr-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </span>
              {{ isLoading() ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>

          <p class="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem uma conta? 
            <a routerLink="/register" class="text-primary hover:underline font-medium transition-colors">Cadastre-se</a>
          </p>
        </ui-card-content>
      </ui-card>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = signal(false);
  errorMsg = signal('');

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMsg.set('');

      const { email, password } = this.loginForm.value;

      this.authService.login({ email, senha: password }).subscribe({
        next: () => {
          this.router.navigate(['/']);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMsg.set(parseAuthError(err));
          this.isLoading.set(false);
        }
      });
    }
  }
}
