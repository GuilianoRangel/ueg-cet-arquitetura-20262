import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { FormErrorHandlerService } from '../../core/errors/form-error-handler.service';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from '../../shared/components/crud/generic-crud-page.component';
import { ToastService } from '../../shared/components/ui/toast.service';
import { UserDto, UsersService } from './users.service';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [GenericCrudPageComponent],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);
  private readonly errorHandler = inject(FormErrorHandlerService);

  readonly crudPage = viewChild(GenericCrudPageComponent<UserDto>);

  readonly pageConfig: CrudPageConfig<UserDto> = {
    title: 'Gerenciamento de Usuários',
    subtitle:
      'Gerencie os usuários cadastrados, aprove cadastros, atribua perfis e redefina senhas.',
    entityLabel: 'Usuário',
    resource: 'users',
    service: this.usersService,
    columns: [
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        type: 'text',
      },
      {
        key: 'email',
        label: 'E-mail',
        sortable: true,
        type: 'text',
      },
      {
        key: 'perfis',
        label: 'Perfis',
        sortable: false,
        type: 'badges',
        badgeExtractor: (row) =>
          (row.perfis ?? []).map((p) => ({
            label: p.nome,
            variant: 'info' as const,
          })),
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        type: 'boolean',
        booleanLabels: {
          trueLabel: 'Ativo',
          falseLabel: 'Pendente',
          trueVariant: 'success',
          falseVariant: 'warning',
        },
      },
      {
        key: 'createdAt',
        label: 'Criado em',
        sortable: true,
        type: 'date',
      },
    ],
    extraRowActions: [
      {
        id: 'activate',
        label: 'Aprovar',
        variant: 'outline',
        permission: 'users:activate',
        visible: (row) => !row.ativo,
        handler: (row) => this.activateUser(row),
      },
      {
        id: 'reset-password',
        label: 'Redefinir Senha',
        variant: 'secondary',
        permission: 'users:update',
        handler: (row) => this.resetPassword(row),
      },
    ],
  };

  activateUser(user: UserDto): void {
    this.usersService.activate(user.id).subscribe({
      next: () => {
        this.toastService.success(
          'Usuário ativado com sucesso e agora tem acesso ao portal!',
        );
        this.crudPage()?.refreshTable();
      },
      error: (err: unknown) => {
        this.errorHandler.handleNonFormError(err);
      },
    });
  }

  resetPassword(user: UserDto): void {
    this.usersService.resetPassword(user.id).subscribe({
      next: (res) => {
        this.toastService.success(
          res.message || 'E-mail de recuperação de senha enviado com sucesso!',
        );
      },
      error: (err: unknown) => {
        this.errorHandler.handleNonFormError(err);
      },
    });
  }
}
