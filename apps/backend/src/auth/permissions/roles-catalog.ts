import { ROLE_FORMAT, SENSITIVE_DATA_ROLE } from '@repo/utils';

export class RolesCatalog {
  private static readonly roles = new Set<string>();

  public static isValid(role: string): boolean {
    return role === SENSITIVE_DATA_ROLE || ROLE_FORMAT.test(role);
  }

  public static register(role: string): void {
    if (!this.isValid(role)) {
      throw new Error(
        `Role inválida: "${role}". Deve seguir o formato recurso:acao ou ser DADOS_SENSIVEIS.`,
      );
    }
    this.roles.add(role);
  }

  public static all(): string[] {
    return Array.from(this.roles).sort();
  }

  public static clearForTests(): void {
    this.roles.clear();
  }
}
