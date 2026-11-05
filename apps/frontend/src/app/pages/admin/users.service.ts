import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GenericCrudService } from '../../core/crud/generic-crud.service';

export interface UserDto {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  perfis?: { id: string; nome: string }[];
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService extends GenericCrudService<UserDto> {
  constructor() {
    super('users');
  }

  activate(id: string): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.baseUrl}/${id}/activate`, {});
  }

  resetPassword(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/${id}/reset-password`,
      {},
    );
  }
}
