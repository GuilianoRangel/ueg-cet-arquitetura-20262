import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from '../../shared/components/crud/generic-crud-page.component';
import { CategoriaDto, CategoriasService } from './categorias.service';

@Component({
  selector: 'app-categorias-page',
  standalone: true,
  imports: [GenericCrudPageComponent],
  templateUrl: './categorias-page.component.html',
  styleUrl: './categorias-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriasPageComponent {
  private readonly categoriasService = inject(CategoriasService);

  readonly pageConfig: CrudPageConfig<CategoriaDto> = {
    title: 'Gerenciamento de Categorias',
    subtitle: 'Cadastre, pesquise e gerencie as categorias do sistema.',
    entityLabel: 'Categoria',
    resource: 'categorias',
    service: this.categoriasService,
    columns: [
      {
        key: 'nome',
        label: 'Nome',
        sortable: true,
        type: 'text',
      },
      {
        key: 'valor',
        label: 'Valor',
        sortable: true,
        type: 'currency-cents',
        requiredRole: 'DADOS_SENSIVEIS',
        maskedSentinel: 99999,
      },
      {
        key: 'ativo',
        label: 'Status',
        sortable: true,
        type: 'boolean',
        booleanLabels: {
          trueLabel: 'Ativa',
          falseLabel: 'Inativa',
          trueVariant: 'success',
          falseVariant: 'secondary',
        },
      },
      {
        key: 'createdAt',
        label: 'Criado em',
        sortable: true,
        type: 'date',
      },
    ],
  };
}
