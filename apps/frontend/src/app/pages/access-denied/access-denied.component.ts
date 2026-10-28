import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 backdrop-blur-xl text-center">
        <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        
        <h2 class="text-3xl font-bold mb-4 text-white">
          Acesso Negado
        </h2>
        <p class="text-gray-400 mb-8">Você precisa estar logado e possuir as permissões adequadas para acessar esta página.</p>

        <button 
          routerLink="/login"
          class="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center">
          Ir para o Login
        </button>
      </div>
    </div>
  `
})
export class AccessDeniedComponent {}
