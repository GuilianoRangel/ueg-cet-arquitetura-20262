import { Injectable } from '@angular/core';
import { GenericCrudService } from '../../core/crud/generic-crud.service';

export interface CategoriaDto {
  id: string;
  nome: string;
  valor: number | null;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CategoriasService extends GenericCrudService<CategoriaDto> {
  constructor() {
    super('categorias');
  }
}
