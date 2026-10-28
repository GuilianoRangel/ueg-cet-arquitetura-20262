import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseAuthError } from '../../core/utils/error-handler.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <h2 class="text-3xl font-bold mb-2 text-center text-white">
          Recuperar Senha
        </h2>
        <p class="text-gray-400 text-center mb-8">Enviaremos um link para o seu e-mail</p>

        <div *ngIf="successMsg()" class="bg-blue-500/10 border border-blue-500/50 text-blue-400 px-4 py-4 rounded-xl text-center mb-6">
          <p class="font-medium">{{ successMsg() }}</p>
          <button routerLink="/login" class="mt-4 inline-block px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors">Voltar para o Login</button>
        </div>

        <form *ngIf="!successMsg()" [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input 
              type="email" 
              formControlName="email"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-500"
              placeholder="seu@email.com"
            />
          </div>

          <div *ngIf="errorMsg()" class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {{ errorMsg() }}
          </div>

          <button 
            type="submit" 
            [disabled]="forgotForm.invalid || isLoading()"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center">
            <span *ngIf="isLoading()" class="mr-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </span>
            {{ isLoading() ? 'Enviando...' : 'Enviar Link' }}
          </button>
        </form>

        <p *ngIf="!successMsg()" class="mt-8 text-center text-sm text-gray-400">
          Lembrou a senha? 
          <a routerLink="/login" class="text-blue-400 hover:text-blue-300 font-medium transition-colors">Voltar</a>
        </p>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading.set(true);
      this.errorMsg.set('');
      
      const { email } = this.forgotForm.value;
      
      this.authService.forgotPassword(email as string).subscribe({
        next: (res: any) => {
          this.successMsg.set(res.message);
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
