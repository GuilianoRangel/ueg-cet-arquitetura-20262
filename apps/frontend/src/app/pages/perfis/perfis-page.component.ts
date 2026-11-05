import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from '../../shared/components/crud/generic-crud-page.component';
import { PerfilDto, PerfisService } from './perfis.service';

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

  readonly pageConfig: CrudPageConfig<PerfilDto> = {
    title: 'Gerenciamento de Perfis de Acesso',
    subtitle: 'Gerencie os perfis e permissões atribuídas no sistema.',
    entityLabel: 'Perfil',
    resource: 'perfis',
    service: this.perfisService,
    canEditRow: (row) => !row.sistema,
    canDeleteRow: (row) => !row.sistema,
    disabledRowTooltip:
      'Perfis de sistema são protegidos e não podem ser alterados ou excluídos.',
    columns: [
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        type: 'text',
      },
      {
        key: 'roles',
        label: 'Permissões',
        sortable: false,
        type: 'badges',
        badgeExtractor: (row) =>
          (row.roles ?? []).map((r) => ({
            label: r,
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
}
