import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/components/ui/toast.service';
import { UsersService, UserDto } from './users.service';
import { UsersListComponent } from './users-list.component';

describe('UsersListComponent', () => {
  let fixture: ComponentFixture<UsersListComponent>;
  let component: UsersListComponent;
  let usersServiceMock: {
    getMeta: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    activate: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
  };
  let toastServiceMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockUsers: UserDto[] = [
    {
      id: '1',
      email: 'admin@ueg.br',
      nome: 'Admin User',
      ativo: true,
      perfis: [{ id: 'p1', nome: 'Administrador' }],
      version: 1,
    },
    {
      id: '2',
      email: 'pending@ueg.br',
      nome: 'Pending User',
      ativo: false,
      perfis: [],
      version: 1,
    },
  ];

  beforeEach(async () => {
    usersServiceMock = {
      getMeta: vi.fn().mockReturnValue(
        of({
          resource: 'users',
          filters: { resource: 'users', fields: [] },
          createForm: { mode: 'create', fields: [] },
          updateForm: { mode: 'update', fields: [] },
        }),
      ),
      findAll: vi.fn().mockReturnValue(
        of({
          items: mockUsers,
          total: mockUsers.length,
          page: 1,
          limit: 10,
        }),
      ),
      activate: vi.fn().mockReturnValue(
        of({ ...mockUsers[1], ativo: true, version: 2 }),
      ),
      resetPassword: vi.fn().mockReturnValue(
        of({ message: 'E-mail de recuperação de senha enviado com sucesso!' }),
      ),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsersService, useValue: usersServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: AuthService,
          useValue: {
            hasRole: vi.fn().mockReturnValue(true),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render GenericCrudPageComponent for resource users with extra actions Aprovar (when inactive) and Redefinir Senha', () => {
    expect(component.pageConfig.resource).toBe('users');
    expect(component.pageConfig.entityLabel).toBe('Usuário');

    const extraActions = component.pageConfig.extraRowActions ?? [];
    const aprovarAction = extraActions.find((a) => a.id === 'activate');
    const resetAction = extraActions.find((a) => a.id === 'reset-password');

    expect(aprovarAction).toBeDefined();
    expect(aprovarAction?.permission).toBe('users:activate');
    expect(aprovarAction?.visible?.(mockUsers[0])).toBe(false);
    expect(aprovarAction?.visible?.(mockUsers[1])).toBe(true);

    expect(resetAction).toBeDefined();
    expect(resetAction?.permission).toBe('users:update');
  });

  it('should call activate and refresh table when clicking Aprovar', () => {
    usersServiceMock.findAll.mockClear();

    component.activateUser(mockUsers[1]);

    expect(usersServiceMock.activate).toHaveBeenCalledWith('2');
    expect(toastServiceMock.success).toHaveBeenCalled();
    expect(usersServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('should call resetPassword and show toast when clicking Redefinir Senha', () => {
    component.resetPassword(mockUsers[0]);

    expect(usersServiceMock.resetPassword).toHaveBeenCalledWith('1');
    expect(toastServiceMock.success).toHaveBeenCalledWith(
      'E-mail de recuperação de senha enviado com sucesso!',
    );
  });
});
