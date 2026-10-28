import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RolesCatalog } from './roles-catalog';

export const PERMISSIONS_CACHE_TTL_MS = 300_000;

interface CacheEntry {
  roles: ReadonlySet<string>;
  expiresAt: number;
}

@Injectable()
export class PermissionsService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly dataSource: DataSource) {}

  public async getEffectiveRoles(userId: string): Promise<ReadonlySet<string>> {
    const now = Date.now();
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.roles;
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      relations: ['perfis'],
    });

    if (!user || !user.ativo || user.deletedAt) {
      const emptySet = new Set<string>();
      this.cache.set(userId, {
        roles: emptySet,
        expiresAt: now + PERMISSIONS_CACHE_TTL_MS,
      });
      return emptySet;
    }

    const catalogRoles = new Set(RolesCatalog.all());
    const effective = new Set<string>();

    if (user.perfis) {
      for (const perfil of user.perfis) {
        if (perfil.ativo && !perfil.deletedAt && Array.isArray(perfil.roles)) {
          for (const role of perfil.roles) {
            if (catalogRoles.has(role)) {
              effective.add(role);
            }
          }
        }
      }
    }

    this.cache.set(userId, {
      roles: effective,
      expiresAt: now + PERMISSIONS_CACHE_TTL_MS,
    });
    return effective;
  }

  public invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  public invalidateAll(): void {
    this.cache.clear();
  }
}
