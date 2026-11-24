import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CrudPageConfig,
  GenericCrudPageComponent,
} from '../../shared/components/crud/generic-crud-page.component';
import { FilmesService } from './filmes.service';
import { FilmeDto } from '@repo/utils';

@Component({
  selector: 'app-filmes-page',
  standalone: true,
  imports: [GenericCrudPageComponent],
  templateUrl: './filmes-page.component.html',
  styleUrl: './filmes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilmesPageComponent {
  private readonly filmesService = inject(FilmesService);

  readonly pageConfig: CrudPageConfig<FilmeDto> = {
    title: 'Gerenciamento de Filmes',
    subtitle: 'Cadastre, pesquise e gerencie o catálogo de obras cinematográficas.',
    entityLabel: 'Filme',
    resource: 'filmes',
    service: this.filmesService,
    columns: [
      {
        key: 'titulo',
        label: 'Título',
        sortable: true,
        type: 'text',
      },
      {
        key: 'categorias',
        label: 'Categorias',
        sortable: false,
        type: 'badges',
        badgeExtractor: (row) =>
          (row.categorias ?? []).map((c) => ({
            label: c.nome,
            variant: 'secondary' as const,
          })),
      },
      {
        key: 'generos',
        label: 'Gêneros',
        sortable: false,
        type: 'badges',
        badgeExtractor: (row) =>
          (row.generos ?? []).map((g) => ({
            label: g,
            variant: 'outline' as const,
          })),
      },
      {
        key: 'ano',
        label: 'Ano',
        sortable: true,
        type: 'text',
      },
      {
        key: 'diretor',
        label: 'Diretor',
        sortable: true,
        type: 'text',
      },
      {
        key: 'duracao',
        label: 'Duração',
        sortable: true,
        type: 'text',
        formatter: (row) => `${row.duracao} min`,
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