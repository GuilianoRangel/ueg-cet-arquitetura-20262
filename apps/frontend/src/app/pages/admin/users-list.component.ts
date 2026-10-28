import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/auth/auth.service';
import { parseAuthError } from '../../core/utils/error-handler.util';
import { CardComponent } from '../../shared/components/ui/card.component';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { BadgeComponent } from '../../shared/components/ui/badge.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
      <!-- Page Header -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-foreground">
            Painel de Administração
          </h1>
          <p class="text-muted-foreground mt-1">Gerencie os usuários cadastrados, aprove cadastros e redefina senhas.</p>
        </div>
      </div>

      <!-- Feedback Alerts -->
      <div *ngIf="successMsg()" class="mb-6 bg-success/10 border border-success/20 text-success px-4 py-3.5 rounded-xl flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span class="font-medium text-sm">{{ successMsg() }}</span>
        </div>
        <button (click)="successMsg.set('')" class="text-success hover:text-success/80 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div *ngIf="errorMsg()" class="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3.5 rounded-xl flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <span class="font-medium text-sm">{{ errorMsg() }}</span>
        </div>
        <button (click)="errorMsg.set('')" class="text-destructive hover:text-destructive/80 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <!-- Controls & Search -->
      <ui-card class="mb-6 p-4">
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-full sm:max-w-xs relative">
            <svg class="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Buscar por nome ou e-mail..." 
              class="flex h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            />
          </div>

          <button 
            ui-button
            variant="outline"
            (click)="loadUsers()"
            [disabled]="isLoading()"
            class="ml-auto flex items-center gap-2">
            <svg class="w-4 h-4" [ngClass]="{'animate-spin': isLoading()}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2"></path></svg>
            <span>Atualizar</span>
          </button>
        </div>
      </ui-card>

      <!-- Main Users Table Grid -->
      <ui-card>
        <div class="overflow-x-auto">
          <!-- Desktop Table View -->
          <table class="min-w-full divide-y divide-border hidden md:table">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Função</th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border bg-transparent">
              <tr *ngFor="let user of filteredUsers()" class="hover:bg-muted/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                      {{ user.nome.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="text-sm font-semibold text-foreground">{{ user.nome }}</div>
                      <div class="text-xs text-muted-foreground">{{ user.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <ui-badge [variant]="user.role === 'admin' ? 'info' : 'secondary'">
                    {{ user.role | uppercase }}
                  </ui-badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <ui-badge [variant]="user.ativo ? 'success' : 'warning'">
                    {{ user.ativo ? 'Ativo' : 'Pendente' }}
                  </ui-badge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-2">
                    <button 
                      *ngIf="!user.ativo"
                      ui-button
                      variant="outline"
                      size="sm"
                      (click)="activateUser(user.id)"
                      [disabled]="actionLoading() === user.id">
                      {{ actionLoading() === user.id ? 'Ativando...' : 'Aprovar' }}
                    </button>
                    <button 
                      ui-button
                      variant="secondary"
                      size="sm"
                      (click)="resetPassword(user.id)"
                      [disabled]="actionLoading() === user.id">
                      {{ actionLoading() === user.id ? 'Processando...' : 'Redefinir Senha' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Mobile Cards View -->
          <div class="md:hidden divide-y divide-border">
            <div *ngFor="let user of filteredUsers()" class="p-5 space-y-4 hover:bg-muted/50 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                  {{ user.nome.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-sm font-semibold text-foreground">{{ user.nome }}</div>
                  <div class="text-xs text-muted-foreground">{{ user.email }}</div>
                </div>
              </div>
              <div class="flex gap-2">
                <ui-badge [variant]="user.role === 'admin' ? 'info' : 'secondary'">
                  {{ user.role | uppercase }}
                </ui-badge>
                <ui-badge [variant]="user.ativo ? 'success' : 'warning'">
                  {{ user.ativo ? 'Ativo' : 'Pendente' }}
                </ui-badge>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-border">
                <button 
                  *ngIf="!user.ativo"
                  ui-button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  (click)="activateUser(user.id)"
                  [disabled]="actionLoading() === user.id">
                  {{ actionLoading() === user.id ? 'Ativando...' : 'Ativar' }}
                </button>
                <button 
                  ui-button
                  variant="secondary"
                  size="sm"
                  [ngClass]="{'w-full': user.ativo, 'flex-1': !user.ativo}"
                  (click)="resetPassword(user.id)"
                  [disabled]="actionLoading() === user.id">
                  {{ actionLoading() === user.id ? 'Processando...' : 'Redefinir' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty & Loading States -->
        <div *ngIf="isLoading() && filteredUsers().length === 0" class="py-20 flex flex-col items-center justify-center gap-3">
          <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span class="text-muted-foreground text-sm font-medium">Buscando lista de usuários...</span>
        </div>

        <div *ngIf="!isLoading() && filteredUsers().length === 0" class="py-20 flex flex-col items-center justify-center text-center p-6">
          <svg class="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          <h3 class="text-lg font-bold text-foreground mb-1">Nenhum usuário encontrado</h3>
          <p class="text-muted-foreground text-sm max-w-sm">Tente redefinir a busca ou verifique se há usuários cadastrados.</p>
        </div>
      </ui-card>
    </div>
  `
})
export class UsersListComponent implements OnInit {
  private authService = inject(AuthService);

  usersList = signal<User[]>([]);
  isLoading = signal(false);
  actionLoading = signal<string | null>(null);
  searchQuery = signal('');
  errorMsg = signal('');
  successMsg = signal('');

  // Computed state for filtered users
  filteredUsers = computed(() => {
    const list = this.usersList();
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(u => 
      u.nome.toLowerCase().includes(query) || 
      u.email.toLowerCase().includes(query)
    );
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.errorMsg.set('');
    
    this.authService.getUsers().subscribe({
      next: (users) => {
        this.usersList.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(parseAuthError(err));
        this.isLoading.set(false);
      }
    });
  }

  activateUser(id: string) {
    this.actionLoading.set(id);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.authService.activateUser(id).subscribe({
      next: () => {
        this.successMsg.set('Usuário ativado com sucesso e agora tem acesso ao portal!');
        this.actionLoading.set(null);
        this.loadUsers(); // refresh the list
      },
      error: (err) => {
        this.errorMsg.set(parseAuthError(err));
        this.actionLoading.set(null);
      }
    });
  }

  resetPassword(id: string) {
    this.actionLoading.set(id);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.authService.resetUserPassword(id).subscribe({
      next: (res) => {
        this.successMsg.set(res.message || 'E-mail de recuperação de senha enviado com sucesso!');
        this.actionLoading.set(null);
      },
      error: (err) => {
        this.errorMsg.set(parseAuthError(err));
        this.actionLoading.set(null);
      }
    });
  }
}
