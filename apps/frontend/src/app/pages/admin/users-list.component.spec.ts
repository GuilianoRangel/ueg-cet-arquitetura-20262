import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersListComponent } from './users-list.component';
import { AuthService, User } from '../../core/auth/auth.service';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;
  
  const mockUsers: User[] = [
    { id: '1', email: 'admin@ueg.br', nome: 'Admin User', role: 'admin', ativo: true },
    { id: '2', email: 'pending@ueg.br', nome: 'Pending User', role: 'user', ativo: false }
  ];

  const mockAuthService = {
    getUsers: vi.fn(),
    activateUser: vi.fn(),
    resetUserPassword: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuthService.getUsers.mockReturnValue(of(mockUsers));
    mockAuthService.activateUser.mockReturnValue(of({ id: '2', ativo: true }));
    mockAuthService.resetUserPassword.mockReturnValue(of({ message: 'E-mail de recuperação de senha enviado com sucesso!' }));

    await TestBed.configureTestingModule({
      imports: [UsersListComponent, FormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    expect(mockAuthService.getUsers).toHaveBeenCalled();
    expect(component.usersList()).toEqual(mockUsers);
    expect(component.filteredUsers()).toEqual(mockUsers);
  });

  it('should filter users based on query search input', () => {
    component.searchQuery.set('pending');
    fixture.detectChanges();

    const filtered = component.filteredUsers();
    expect(filtered.length).toBe(1);
    expect(filtered[0].nome).toBe('Pending User');

    component.searchQuery.set('admin@ueg.br');
    fixture.detectChanges();
    expect(component.filteredUsers().length).toBe(1);
    expect(component.filteredUsers()[0].nome).toBe('Admin User');

    component.searchQuery.set('non-existing');
    fixture.detectChanges();
    expect(component.filteredUsers().length).toBe(0);
  });

  it('should call activateUser and refresh list on approval click', () => {
    component.activateUser('2');

    expect(mockAuthService.activateUser).toHaveBeenCalledWith('2');
    expect(mockAuthService.getUsers).toHaveBeenCalledTimes(2); // Initial + reload
    expect(component.successMsg()).toContain('ativado com sucesso');
  });

  it('should call resetUserPassword on reset action click', () => {
    component.resetPassword('1');

    expect(mockAuthService.resetUserPassword).toHaveBeenCalledWith('1');
    expect(component.successMsg()).toContain('E-mail de recuperação de senha enviado');
  });

  it('should handle API failure gracefully', () => {
    mockAuthService.getUsers.mockReturnValue(throwError(() => ({ error: { message: 'Não autorizado' } })));
    component.loadUsers();

    expect(component.errorMsg()).toContain('Não autorizado');
  });
});
