import {
  PAGE_DEFAULT_LIMIT,
  PAGE_MAX_LIMIT,
  SENSITIVE_DATA_ROLE,
  MASK_DEFAULT_NUMERIC,
  ROLE_FORMAT,
  ERROR_CODES,
} from "../index";

describe("Contracts", () => {
  it("should export PAGE_DEFAULT_LIMIT as 10 and PAGE_MAX_LIMIT as 5000", () => {
    expect(PAGE_DEFAULT_LIMIT).toBe(10);
    expect(PAGE_MAX_LIMIT).toBe(5000);
  });

  it("should export SENSITIVE_DATA_ROLE as DADOS_SENSIVEIS", () => {
    expect(SENSITIVE_DATA_ROLE).toBe("DADOS_SENSIVEIS");
  });

  it("should export MASK_DEFAULT_NUMERIC as 99999", () => {
    expect(MASK_DEFAULT_NUMERIC).toBe(99999);
  });

  it('ROLE_FORMAT should accept "categorias:create" and "users:reset-password"', () => {
    expect(ROLE_FORMAT.test("categorias:create")).toBe(true);
    expect(ROLE_FORMAT.test("users:reset-password")).toBe(true);
  });

  it('ROLE_FORMAT should reject "Categorias:create", "categorias", "categorias:", ":read"', () => {
    expect(ROLE_FORMAT.test("Categorias:create")).toBe(false);
    expect(ROLE_FORMAT.test("categorias")).toBe(false);
    expect(ROLE_FORMAT.test("categorias:")).toBe(false);
    expect(ROLE_FORMAT.test(":read")).toBe(false);
  });

  it("ERROR_CODES should contain every code listed in spec section 6.4", () => {
    const expectedCodes = [
      "VALIDATION_ERROR",
      "QUERY_PARAM_INVALID",
      "QUERY_FIELD_NOT_ALLOWED",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "FORBIDDEN_SENSITIVE_FIELD",
      "RESOURCE_NOT_FOUND",
      "OPTIMISTIC_LOCK_CONFLICT",
      "RESOURCE_CONFLICT",
      "RESOURCE_IN_USE",
      "INTERNAL_ERROR",
      "CATEGORIA_NOME_EXISTS",
      "PERFIL_NOME_EXISTS",
      "PERFIL_ROLE_INVALID",
      "PERFIL_SISTEMA_PROTEGIDO",
      "PERFIL_IN_USE",
      "USER_EMAIL_EXISTS",
      "USER_PERFIL_INVALID",
      "USER_LAST_ADMIN",
      "USER_NOT_FOUND",
    ];

    for (const code of expectedCodes) {
      expect(ERROR_CODES).toHaveProperty(code, code);
    }
  });
});
