import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-8 md:p-12 mb-8 shadow-sm">
        <h1 class="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
          Olá, <span class="text-primary">{{ authService.currentUser()?.nome || 'Usuário' }}</span>!
        </h1>
        <p class="text-muted-foreground text-lg max-w-2xl mb-6">
          Bem-vindo ao portal. Este ambiente está limpo, configurado e pronto para o início do desenvolvimento das novas funcionalidades do seu projeto.
        </p>
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-sm text-muted-foreground">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Nest.js Backend: Online
          </div>
          <div class="flex items-center gap-2 px-4 py-2 bg-background border rounded-lg text-sm text-muted-foreground">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Angular Frontend: Online
          </div>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <div class="border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="font-semibold text-lg mb-2 text-foreground">Autenticação JWT</h3>
          <p class="text-sm text-muted-foreground">
            Sistema de login, registro, recuperação e redefinição de senha estruturado de ponta a ponta com segurança ativa.
          </p>
        </div>

        <div class="border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <h3 class="font-semibold text-lg mb-2 text-foreground">Gestão de Usuários</h3>
          <p class="text-sm text-muted-foreground">
            Painel administrativo pronto para gerenciar perfis, redefinir senhas e aprovar ativação de contas pendentes.
          </p>
        </div>

        <div class="border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="font-semibold text-lg mb-2 text-foreground">Arquitetura de Qualidade</h3>
          <p class="text-sm text-muted-foreground">
            Monorepo configurado com Turborepo, pnpm workspaces, checagem de tipos unificada e TDD rigoroso.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent {
  authService = inject(AuthService);
}
