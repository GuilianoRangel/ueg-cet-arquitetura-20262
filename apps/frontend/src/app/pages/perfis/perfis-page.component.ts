import {
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from '../../shared/components/crud/generic-crud-page.component';
import { ToastService } from '../../shared/components/ui/toast.service';
import { PerfilDto, PerfisService } from './perfis.service';
import { PerfilFormModalComponent } from './perfil-form-modal.component';

@Component({
  selector: 'app-perfis-page',
  standalone: true,
  imports: [GenericCrudPageComponent],
  templateUrl: './perfis-page.component.html',
  styleUrl: './perfis-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfisPageComponent {
  private readonly perfisService = inject(PerfisService);
  private readonly toastService = inject(ToastService);

  readonly crudPage = viewChild(GenericCrudPageComponent<PerfilDto>);

  readonly pageConfig: CrudPageConfig<PerfilDto> = {
    title: 'Gerenciamento de Perfis de Acesso',
    subtitle: 'Gerencie os perfis e permissões atribuídas no sistema.',
    entityLabel: 'Perfil',
    resource: 'perfis',
    service: this.perfisService,
    customModalComponent: PerfilFormModalComponent,
    isRowReadOnly: (row) => row.sistema,
    canDeleteRow: (row) => !row.sistema,
    disabledRowTooltip:
      'Perfis de sistema são protegidos e não podem ser excluídos.',
    headerActions: [
      {
        id: 'sync-roles',
        label: 'Sincronizar Permissões',
        variant: 'outline',
        permission: 'perfis:sync',
        handler: () => this.sincronizarPermissoes(),
      },
    ],
    columns: [
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        type: 'text',
      },
      {
        key: 'funcionalidades',
        label: 'Funcionalidades',
        sortable: false,
        type: 'badges',
        badgeExtractor: (row) =>
          (row.funcionalidades ?? []).slice(0, 10).map((f) => ({
            label: f,
            variant: 'info' as const,
          })),
      },
      {
        key: 'sistema',
        label: 'Tipo',
        sortable: true,
        type: 'boolean',
        booleanLabels: {
          trueLabel: 'Sistema',
          falseLabel: 'Customizado',
          trueVariant: 'info',
          falseVariant: 'secondary',
        },
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        type: 'boolean',
        booleanLabels: {
          trueLabel: 'Ativo',
          falseLabel: 'Inativo',
          trueVariant: 'success',
          falseVariant: 'secondary',
        },
      },
    ],
  };

  private sincronizarPermissoes(): void {
    this.perfisService.syncRoles().subscribe({
      next: (res) => {
        this.toastService.success(
          `Permissões sincronizadas! Adicionadas: ${res.addedActions}, Removidas: ${res.removedActions}, Total ativas: ${res.totalActiveActions}`,
        );
        this.crudPage()?.refreshTable();
      },
      error: () => {
        this.toastService.error('Erro ao sincronizar permissões.');
      },
    });
  }
}
