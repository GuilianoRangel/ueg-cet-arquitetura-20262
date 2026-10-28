import { SelectQueryBuilder } from 'typeorm';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { parseCrudQuery, applyToQueryBuilder } from './crud-query';
import { CrudConfig } from './crud.types';
import { MaskedFieldMetadata } from './masking/masked.decorator';
import { BusinessException } from '../exceptions/business.exception';

function expectBusinessError(
  fn: () => unknown,
  expectedCode: string,
  expectedMessage?: string,
) {
  try {
    fn();
    fail(`Expected to throw BusinessException with code ${expectedCode}`);
  } catch (err: unknown) {
    expect(err).toBeInstanceOf(BusinessException);
    const be = err as BusinessException;
    expect(be.code).toBe(expectedCode);
    if (expectedMessage) {
      expect(be.message).toBe(expectedMessage);
    }
  }
}

describe('crud-query', () => {
  class DummyEntity {
    id!: string;
    createdAt!: Date;
    updatedAt!: Date;
  }
  class DummyCreateDto {}
  class DummyUpdateDto {}

  const dummyConfig: CrudConfig<DummyEntity, DummyCreateDto, DummyUpdateDto> = {
    resource: 'categorias',
    entity: DummyEntity,
    createDto: DummyCreateDto,
    updateDto: DummyUpdateDto,
    sortable: ['nome', 'valor', 'createdAt', 'id'],
    filters: {
      nome: { type: 'string', operators: ['eq', 'like'] },
      valor: {
        type: 'number',
        operators: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'between'],
      },
      ativo: { type: 'boolean', operators: ['eq'] },
      createdAt: { type: 'date', operators: ['gte', 'lte', 'between'] },
      userId: { type: 'uuid', operators: ['eq', 'in'] },
    },
  };

  const maskedFields: MaskedFieldMetadata[] = [
    {
      propertyKey: 'valor',
      role: SENSITIVE_DATA_ROLE,
    },
  ];

  it('should default to page 1, limit 10, sort createdAt,id', () => {
    const parsed = parseCrudQuery({}, dummyConfig, new Set(), maskedFields);
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.sort).toEqual([
      { field: 'createdAt', order: 'ASC' },
      { field: 'id', order: 'ASC' },
    ]);
  });

  it('should reject limit above 5000 and below 1 with QUERY_PARAM_INVALID', () => {
    expectBusinessError(
      () =>
        parseCrudQuery({ limit: '5001' }, dummyConfig, new Set(), maskedFields),
      'QUERY_PARAM_INVALID',
    );

    expectBusinessError(
      () =>
        parseCrudQuery({ limit: '0' }, dummyConfig, new Set(), maskedFields),
      'QUERY_PARAM_INVALID',
    );
  });

  it('should reject non-integer page/limit with QUERY_PARAM_INVALID', () => {
    expectBusinessError(
      () =>
        parseCrudQuery({ page: '1.5' }, dummyConfig, new Set(), maskedFields),
      'QUERY_PARAM_INVALID',
    );

    expectBusinessError(
      () =>
        parseCrudQuery({ limit: 'abc' }, dummyConfig, new Set(), maskedFields),
      'QUERY_PARAM_INVALID',
    );
  });

  it('should accept limit 5000', () => {
    const parsed = parseCrudQuery(
      { limit: '5000' },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(parsed.limit).toBe(5000);
  });

  it('should parse sort "nome,-valor" into asc/desc pairs', () => {
    const parsed = parseCrudQuery(
      { sort: 'nome,-valor' },
      dummyConfig,
      new Set([SENSITIVE_DATA_ROLE]),
      maskedFields,
    );
    expect(parsed.sort).toEqual([
      { field: 'nome', order: 'ASC' },
      { field: 'valor', order: 'DESC' },
    ]);
  });

  it('should parse sort with colon syntax "createdAt:DESC,nome:asc"', () => {
    const parsed = parseCrudQuery(
      { sort: 'createdAt:DESC,nome:asc' },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(parsed.sort).toEqual([
      { field: 'createdAt', order: 'DESC' },
      { field: 'nome', order: 'ASC' },
    ]);
  });

  it('should reject sort field not in sortable with QUERY_FIELD_NOT_ALLOWED', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { sort: 'notAllowedField' },
          dummyConfig,
          new Set(),
          maskedFields,
        ),
      'QUERY_FIELD_NOT_ALLOWED',
    );
  });

  it('should parse plain "<campo>" as eq', () => {
    const parsed = parseCrudQuery(
      { nome: 'Livros' },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(parsed.filters).toEqual([
      { field: 'nome', operator: 'eq', value: 'Livros' },
    ]);
  });

  it('should parse every operator: ne, like, gt, gte, lt, lte, in, between', () => {
    const parsed = parseCrudQuery(
      {
        valor__ne: '100',
        nome__like: 'Livro',
        valor__gt: '50',
        valor__gte: '60',
        valor__lt: '200',
        valor__lte: '190',
        valor__in: '10,20,30',
        valor__between: '100,500',
      },
      dummyConfig,
      new Set([SENSITIVE_DATA_ROLE]),
      maskedFields,
    );

    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'ne',
      value: 100,
    });
    expect(parsed.filters).toContainEqual({
      field: 'nome',
      operator: 'like',
      value: 'Livro',
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'gt',
      value: 50,
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'gte',
      value: 60,
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'lt',
      value: 200,
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'lte',
      value: 190,
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'in',
      value: [10, 20, 30],
    });
    expect(parsed.filters).toContainEqual({
      field: 'valor',
      operator: 'between',
      value: [100, 500],
    });
  });

  it('should reject operator not allowed for the field with QUERY_FIELD_NOT_ALLOWED', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { nome__gt: 'Livros' },
          dummyConfig,
          new Set(),
          maskedFields,
        ),
      'QUERY_FIELD_NOT_ALLOWED',
    );
  });

  it('should reject unknown field with QUERY_FIELD_NOT_ALLOWED', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { unknownField: 'val' },
          dummyConfig,
          new Set(),
          maskedFields,
        ),
      'QUERY_FIELD_NOT_ALLOWED',
    );
  });

  it('should coerce number, boolean, date and uuid types and reject invalid values with QUERY_PARAM_INVALID', () => {
    // Number coercion
    expectBusinessError(
      () =>
        parseCrudQuery(
          { valor: 'not-a-number' },
          dummyConfig,
          new Set([SENSITIVE_DATA_ROLE]),
          maskedFields,
        ),
      'QUERY_PARAM_INVALID',
    );

    // Boolean coercion
    const boolParsed = parseCrudQuery(
      { ativo: 'true' },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(boolParsed.filters[0].value).toBe(true);

    expectBusinessError(
      () =>
        parseCrudQuery({ ativo: 'yes' }, dummyConfig, new Set(), maskedFields),
      'QUERY_PARAM_INVALID',
    );

    // Date coercion
    const dateParsed = parseCrudQuery(
      { createdAt__gte: '2026-01-01T00:00:00.000Z' },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(dateParsed.filters[0].value).toBeInstanceOf(Date);

    expectBusinessError(
      () =>
        parseCrudQuery(
          { createdAt__gte: 'invalid-date' },
          dummyConfig,
          new Set(),
          maskedFields,
        ),
      'QUERY_PARAM_INVALID',
    );

    // UUID coercion
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const uuidParsed = parseCrudQuery(
      { userId: validUuid },
      dummyConfig,
      new Set(),
      maskedFields,
    );
    expect(uuidParsed.filters[0].value).toBe(validUuid);

    expectBusinessError(
      () =>
        parseCrudQuery(
          { userId: 'not-a-uuid' },
          dummyConfig,
          new Set(),
          maskedFields,
        ),
      'QUERY_PARAM_INVALID',
    );
  });

  it('between should require exactly two values', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { valor__between: '100' },
          dummyConfig,
          new Set([SENSITIVE_DATA_ROLE]),
          maskedFields,
        ),
      'QUERY_PARAM_INVALID',
    );

    expectBusinessError(
      () =>
        parseCrudQuery(
          { valor__between: '100,200,300' },
          dummyConfig,
          new Set([SENSITIVE_DATA_ROLE]),
          maskedFields,
        ),
      'QUERY_PARAM_INVALID',
    );
  });

  it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when filtering a masked field without the role', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { valor: '100' },
          dummyConfig,
          new Set(), // missing DADOS_SENSIVEIS
          maskedFields,
        ),
      'FORBIDDEN_SENSITIVE_FIELD',
      'O campo "valor" exige a role DADOS_SENSIVEIS',
    );
  });

  it('should throw 403 FORBIDDEN_SENSITIVE_FIELD when sorting by a masked field without the role', () => {
    expectBusinessError(
      () =>
        parseCrudQuery(
          { sort: 'valor' },
          dummyConfig,
          new Set(), // missing DADOS_SENSIVEIS
          maskedFields,
        ),
      'FORBIDDEN_SENSITIVE_FIELD',
      'O campo "valor" exige a role DADOS_SENSIVEIS',
    );
  });

  it('should allow filtering/sorting masked fields with the role', () => {
    const parsed = parseCrudQuery(
      { sort: '-valor', valor: '500' },
      dummyConfig,
      new Set([SENSITIVE_DATA_ROLE]),
      maskedFields,
    );

    expect(parsed.sort[0]).toEqual({ field: 'valor', order: 'DESC' });
    expect(parsed.filters[0]).toEqual({
      field: 'valor',
      operator: 'eq',
      value: 500,
    });
  });

  it('applyToQueryBuilder should generate parameterized where, orderBy, skip and take (no string concatenation of values)', () => {
    const skipMock = jest.fn().mockReturnThis();
    const takeMock = jest.fn().mockReturnThis();
    const addOrderByMock = jest.fn().mockReturnThis();
    const andWhereMock = jest.fn().mockReturnThis();

    const mockQb = {
      skip: skipMock,
      take: takeMock,
      addOrderBy: addOrderByMock,
      andWhere: andWhereMock,
    } as unknown as SelectQueryBuilder<DummyEntity>;

    const parsed = parseCrudQuery(
      {
        page: '2',
        limit: '25',
        sort: 'nome,-valor',
        nome: 'Tech',
        valor__gt: '100',
      },
      dummyConfig,
      new Set([SENSITIVE_DATA_ROLE]),
      maskedFields,
    );

    applyToQueryBuilder(mockQb, parsed, 'cat');

    expect(skipMock).toHaveBeenCalledWith(25);
    expect(takeMock).toHaveBeenCalledWith(25);
    expect(addOrderByMock).toHaveBeenCalledWith('cat.nome', 'ASC');
    expect(addOrderByMock).toHaveBeenCalledWith('cat.valor', 'DESC');
    expect(andWhereMock).toHaveBeenCalledWith('cat.deletedAt IS NULL');
    expect(andWhereMock).toHaveBeenCalledWith('cat.nome = :p_0', {
      p_0: 'Tech',
    });
    expect(andWhereMock).toHaveBeenCalledWith('cat.valor > :p_1', {
      p_1: 100,
    });
  });
});
