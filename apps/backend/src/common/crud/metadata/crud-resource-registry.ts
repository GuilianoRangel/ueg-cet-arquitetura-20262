import { Type } from '../crud.types';

/**
 * Registro central em memória que associa recursos CRUD ('categorias', 'perfis', etc.)
 * às suas respectivas classes de entidade para resolução de metadados por reflexão.
 */
export class CrudResourceRegistry {
  private static readonly resourceToEntity = new Map<string, Type<unknown>>();

  private static normalizeResourceKey(resourceOrEndpoint: string): string {
    const withoutQuery = resourceOrEndpoint.split('?')[0] ?? '';
    return withoutQuery.replace(/^\/+|\/+$/g, '').toLowerCase();
  }

  static register(resource: string, entity: Type<unknown>): void {
    const key = this.normalizeResourceKey(resource);
    if (key) {
      this.resourceToEntity.set(key, entity);
    }
  }

  static getEntityByEndpoint(
    endpointOrResource: string,
  ): Type<unknown> | undefined {
    const key = this.normalizeResourceKey(endpointOrResource);
    return key ? this.resourceToEntity.get(key) : undefined;
  }

  static clearForTests(): void {
    this.resourceToEntity.clear();
  }
}
