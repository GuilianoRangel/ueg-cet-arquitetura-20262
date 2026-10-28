import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { parseAuthError } from '../../core/utils/error-handler.util';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
        <h2 class="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          Criar Conta
        </h2>
        <p class="text-gray-400 text-center mb-8">Preencha os dados para se cadastrar</p>

        <div *ngIf="successMsg()" class="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-4 rounded-xl text-center mb-6">
          <p class="font-medium mb-2">{{ successMsg() }}</p>
          <p class="text-sm">Por favor, aguarde o administrador ativar sua conta para poder realizar o login.</p>
          <button routerLink="/login" class="mt-4 inline-block px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors">Voltar para o Login</button>
        </div>

        <form *ngIf="!successMsg()" [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
            <input 
              type="text" 
              formControlName="nome"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-500"
              placeholder="João da Silva"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">E-mail</label>
            <input 
              type="email" 
              formControlName="email"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Senha</label>
            <input 
              type="password" 
              formControlName="password"
              class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-white placeholder-gray-500"
              placeholder="Min. 6 caracteres"
            />
          </div>

          <div *ngIf="errorMsg()" class="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {{ errorMsg() }}
          </div>

          <button 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading()"
            class="w-full py-3 px-4 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center">
            <span *ngIf="isLoading()" class="mr-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </span>
            {{ isLoading() ? 'Criando conta...' : 'Cadastrar' }}
          </button>
        </form>

        <p *ngIf="!successMsg()" class="mt-8 text-center text-sm text-gray-400">
          Já tem uma conta? 
          <a routerLink="/login" class="text-blue-400 hover:text-blue-300 font-medium transition-colors">Faça login</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  registerForm = this.fb.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMsg.set('');
      
      const { nome, email, password } = this.registerForm.value;
      
      this.authService.register({ nome, email, senha: password }).subscribe({
        next: () => {
          this.successMsg.set('Cadastro realizado com sucesso!');
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
