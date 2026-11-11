import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FuncionalidadeGroupDto, RolesSyncResultDto } from '@repo/utils';
import { environment } from '../../../environments/environment';
import { GenericCrudService } from '../../core/crud/generic-crud.service';

export interface PerfilDto {
  id: string;
  nome: string;
  acaoIds?: string[];
  acoes?: Array<{ id: string; acao: string; funcionalidadeId?: string }>;
  funcionalidades?: string[];
  roles?: string[];
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

  getRolesCatalog(): Observable<{ funcionalidades: FuncionalidadeGroupDto[] }> {
    return this.http.get<{ funcionalidades: FuncionalidadeGroupDto[] }>(
      `${environment.apiUrl}/roles`,
    );
  }

  syncRoles(): Observable<RolesSyncResultDto> {
    return this.http.post<RolesSyncResultDto>(
      `${environment.apiUrl}/roles/sync`,
      {},
    );
  }
}
