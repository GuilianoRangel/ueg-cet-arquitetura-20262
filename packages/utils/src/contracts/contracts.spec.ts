import {
  PAGE_DEFAULT_LIMIT,
  PAGE_MAX_LIMIT,
  SENSITIVE_DATA_ROLE,
  MASK_DEFAULT_NUMERIC,
  ROLE_FORMAT,
  ERROR_CODES,
  FILTER_OPERATORS,
  FilterOperator,
  SearchFilterConfigDto,
  SmartFilterFieldMeta,
  MasterDetailFilterConfig,
  CrudFormSchemaDto,
  CrudFormFieldSchema,
  CrudResourceMetaDto,
  FuncionalidadeAcaoDto,
  FuncionalidadeGroupDto,
  RolesSyncResultDto,
  FILME_GENEROS,
  FilmeDto,
} from "../index";

describe("Contracts", () => {
  it("should export PAGE_DEFAULT_LIMIT as 10 and PAGE_MAX_LIMIT as 5000", () => {
    expect(PAGE_DEFAULT_LIMIT).toBe(10);
    expect(PAGE_MAX_LIMIT).toBe(5000);
  });

  it("should export SENSITIVE_DATA_ROLE as global:dados-sensiveis and match ROLE_FORMAT", () => {
    expect(SENSITIVE_DATA_ROLE).toBe("global:dados-sensiveis");
    expect(ROLE_FORMAT.test(SENSITIVE_DATA_ROLE)).toBe(true);
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

  it("should export FILTER_OPERATORS containing eq, ne, like, gt, gte, lt, lte, in, between", () => {
    const expectedOperators: FilterOperator[] = [
      "eq",
      "ne",
      "like",
      "gt",
      "gte",
      "lt",
      "lte",
      "in",
      "between",
    ];
    expect(FILTER_OPERATORS).toEqual(expectedOperators);
  });

  it("should validate structure of SearchFilterConfigDto, SmartFilterFieldMeta and MasterDetailFilterConfig", () => {
    const masterDetail: MasterDetailFilterConfig = {
      parentField: "perfilId",
      parentLabel: "Perfil",
      parentEndpoint: "/perfis",
      parentValueKey: "id",
      parentLabelKey: "nome",
      childEndpoint: "/roles",
      parentParamName: "perfilId",
      childValueKey: "code",
      childLabelKey: "label",
    };

    const fieldMeta: SmartFilterFieldMeta = {
      field: "nome",
      label: "Nome",
      type: "string",
      controlType: "text",
      operators: ["eq", "like"],
      defaultOperator: "like",
      quickFilter: true,
      placeholder: "Buscar por nome...",
      options: [{ label: "Ativo", value: true }],
      optionsEndpoint: "/perfis",
      optionsValueKey: "id",
      optionsLabelKey: "nome",
      masterDetail,
      requiredRole: "DADOS_SENSIVEIS",
    };

    const config: SearchFilterConfigDto = {
      resource: "users",
      fields: [fieldMeta],
    };

    expect(config.resource).toBe("users");
    expect(config.fields).toHaveLength(1);
    expect(config.fields[0].masterDetail?.parentField).toBe("perfilId");
  });

  it("should validate structure of CrudFormSchemaDto, CrudFormFieldSchema and CrudResourceMetaDto", () => {
    const formField: CrudFormFieldSchema = {
      name: "nome",
      label: "Nome Completo",
      inputType: "text",
      required: true,
      defaultValue: "",
      placeholder: "Digite o nome",
      description: "Nome do usuário",
      order: 1,
      hidden: false,
      readOnly: false,
      masked: false,
      omitOnSubmit: false,
      requiredRole: "DADOS_SENSIVEIS",
      validations: [
        { type: "required", message: "Nome é obrigatório" },
        { type: "maxLength", value: 100, message: "Máximo 100 caracteres" },
      ],
      options: [{ label: "Opção 1", value: "1" }],
      optionsEndpoint: "/perfis",
      optionsValueKey: "id",
      optionsLabelKey: "nome",
      entityRelationProperty: "perfis",
      entityRelationValueKey: "id",
    };

    const createForm: CrudFormSchemaDto = {
      mode: "create",
      fields: [formField],
    };

    const updateForm: CrudFormSchemaDto = {
      mode: "update",
      fields: [
        formField,
        {
          name: "version",
          label: "Version",
          inputType: "hidden",
          required: true,
          order: 99,
          hidden: true,
          readOnly: false,
          validations: [{ type: "required" }, { type: "int" }],
        },
      ],
    };

    const meta: CrudResourceMetaDto = {
      resource: "users",
      filters: {
        resource: "users",
        fields: [],
      },
      createForm,
      updateForm,
    };

    expect(meta.resource).toBe("users");
    expect(meta.createForm.mode).toBe("create");
    expect(meta.updateForm.mode).toBe("update");
    expect(meta.updateForm.fields).toHaveLength(2);
  });

  it("should validate structure of FuncionalidadeAcaoDto, FuncionalidadeGroupDto and RolesSyncResultDto", () => {
    const acao: FuncionalidadeAcaoDto = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      acao: "create",
      role: "categorias:create",
    };

    const group: FuncionalidadeGroupDto = {
      id: "123e4567-e89b-12d3-a456-426614174001",
      nome: "categorias",
      acoes: [acao],
    };

    const syncResult: RolesSyncResultDto = {
      addedActions: 2,
      removedActions: 1,
      totalActiveActions: 15,
    };

    expect(group.nome).toBe("categorias");
    expect(group.acoes[0].role).toBe("categorias:create");
    expect(syncResult.totalActiveActions).toBe(15);
  });

  it("should export FILME_GENEROS with predefined movie genres and validate FilmeDto shape", () => {
    expect(FILME_GENEROS).toContain("Ação");
    expect(FILME_GENEROS).toContain("Drama");
    expect(FILME_GENEROS).toContain("Ficção Científica");
    expect(FILME_GENEROS.length).toBe(13);

    const filme: FilmeDto = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      titulo: "Interestelar",
      ano: 2014,
      diretor: "Christopher Nolan",
      duracao: 169,
      sinopse:
        "<p>Uma equipe de exploradores viaja através de um buraco de minhoca no espaço.</p>",
      generos: ["Ficção Científica", "Drama"],
      ativo: true,
      categorias: [
        {
          id: "123e4567-e89b-12d3-a456-426614174001",
          nome: "Sci-Fi",
          ativo: true,
          valor: null,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ultimoUsuarioId: null,
        },
      ],
      categoriaIds: ["123e4567-e89b-12d3-a456-426614174001"],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ultimoUsuarioId: null,
    };

    expect(filme.titulo).toBe("Interestelar");
    expect(filme.categoriaIds).toEqual([
      "123e4567-e89b-12d3-a456-426614174001",
    ]);
    expect(filme.generos).toEqual(["Ficção Científica", "Drama"]);
  });

  it("should include CATEGORIA_IN_USE, FILME_TITULO_ANO_EXISTS and FILME_CATEGORIA_INVALID in ERROR_CODES", () => {
    expect(ERROR_CODES.CATEGORIA_IN_USE).toBe("CATEGORIA_IN_USE");
    expect(ERROR_CODES.FILME_TITULO_ANO_EXISTS).toBe("FILME_TITULO_ANO_EXISTS");
    expect(ERROR_CODES.FILME_CATEGORIA_INVALID).toBe("FILME_CATEGORIA_INVALID");
  });

  it("should support richtext as a valid FormInputType in CrudFormFieldSchema", () => {
    const field: CrudFormFieldSchema = {
      name: "sinopse",
      label: "Sinopse",
      inputType: "richtext",
      required: true,
      order: 7,
      hidden: false,
      readOnly: false,
      validations: [{ type: "required" }],
    };

    expect(field.inputType).toBe("richtext");
  });
});
