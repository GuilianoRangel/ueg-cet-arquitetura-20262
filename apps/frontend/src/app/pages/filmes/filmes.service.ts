import { Injectable } from '@angular/core';
import { FilmeDto } from '@repo/utils';
import { GenericCrudService } from '../../core/crud/generic-crud.service';

@Injectable({
  providedIn: 'root',
})
export class FilmesService extends GenericCrudService<FilmeDto> {
  constructor() {
    super('filmes');
  }
}

