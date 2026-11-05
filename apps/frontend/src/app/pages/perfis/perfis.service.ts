import { Injectable } from '@angular/core';
import { GenericCrudService } from '../../core/crud/generic-crud.service';

export interface PerfilDto {
  id: string;
  nome: string;
  roles: string[];
  sistema: boolean;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PerfisService extends GenericCrudService<PerfilDto> {
  constructor() {
    super('perfis');
  }
}

