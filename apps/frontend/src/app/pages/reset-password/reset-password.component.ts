import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseAuthError } from '../../core/utils/error-handler.util';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <h2 class="text-3xl font-bold mb-2 text-center text-white">
          Nova Senha
        </h2>
        <p class="text-gray-400 text-center mb-8">Defina sua nova senha de acesso</p>

        <div *ngIf="invalidToken()" class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-4 rounded-xl text-center mb-6">
          <p class="font-medium">Link inválido ou expirado.</p>
          <button routerLink="/forgot-password" class="mt-4 inline-block px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">Solicitar novo link</button>
        </div>

        <div *ngIf="successMsg()" class="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-4 rounded-xl text-center mb-6">
          <p class="font-medium">{{ successMsg() }}</p>
          <button routerLink="/login" class="mt-4 inline-block px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors">Fazer Login</button>
        </div>

        <form *ngIf="!invalidToken() && !successMsg()" [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nova Senha</label>
            <input 
              type="password" 
              formControlName="newPassword"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-500"
              placeholder="••••••••"
            />
          </div>

          <div *ngIf="errorMsg()" class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {{ errorMsg() }}
          </div>

          <button 
            type="submit" 
            [disabled]="resetForm.invalid || isLoading()"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center">
            <span *ngIf="isLoading()" class="mr-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </span>
            {{ isLoading() ? 'Salvando...' : 'Salvar Nova Senha' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  resetForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  token = '';
  isLoading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  invalidToken = signal(false);

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.invalidToken.set(true);
    }
  }

  onSubmit() {
    if (this.resetForm.valid && this.token) {
      this.isLoading.set(true);
      this.errorMsg.set('');
      
      const { newPassword } = this.resetForm.value;
      
      this.authService.resetPassword({ token: this.token, newPassword }).subscribe({
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
