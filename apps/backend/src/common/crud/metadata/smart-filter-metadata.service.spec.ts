import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { CrudConfig } from '../crud.types';
import { MaskedFieldMetadata } from '../masking/masked.decorator';
import {
  buildSearchFilterConfig,
  ISmartFilterConfigProvider,
  SmartFilterMetadataService,
} from './smart-filter-metadata.service';

describe('SmartFilterMetadataService & buildSearchFilterConfig', () => {
  class DummyEntity {}
  class DummyCreateDto {}
  class DummyUpdateDto {}

  const maskedFields: MaskedFieldMetadata[] = [
    { propertyKey: 'valor', role: SENSITIVE_DATA_ROLE },
  ];

  const sampleConfig: CrudConfig<DummyEntity, DummyCreateDto, DummyUpdateDto> =
    {
      resource: 'categorias',
      entity: DummyEntity,
      createDto: DummyCreateDto,
      updateDto: DummyUpdateDto,
      filters: {
        nome: {
          type: 'string',
          operators: ['eq', 'like'],
          quickFilter: true,
        },
        ativo: {
          type: 'boolean',
          operators: ['eq'],
          quickFilter: true,
        },
        valor: {
          type: 'number',
          operators: ['eq', 'gt', 'gte', 'lt', 'lte', 'between'],
          controlType: 'currency',
          label: 'Valor (R$)',
        },
        createdAt: {
          type: 'date',
          operators: ['gte', 'lte', 'between'],
          label: 'Criado em',
        },
        perfilId: {
          type: 'uuid',
          operators: ['eq', 'in'],
          label: 'Perfil',
          controlType: 'select',
          quickFilter: true,
          optionsEndpoint: '/perfis',
          optionsValueKey: 'id',
          optionsLabelKey: 'nome',
          relationField: 'perfis.id',
        },
        roleCascata: {
          type: 'string',
          operators: ['eq'],
          label: 'Role por Perfil',
          controlType: 'master-detail',
          quickFilter: true,
          masterDetail: {
            parentField: 'perfilId',
            parentLabel: 'Perfil',
            parentEndpoint: '/perfis',
            childEndpoint: '/roles',
            parentParamName: 'perfilId',
          },
        },
        restritoCustom: {
          type: 'string',
          operators: ['eq'],
          requiredRole: 'CUSTOM_ROLE',
        },
      },
    };

  it('should build SearchFilterConfigDto from CrudConfig filters with default labels and controlTypes', () => {
    const service = new SmartFilterMetadataService();
    const result = service.buildFromCrudConfig(
      sampleConfig,
      new Set([SENSITIVE_DATA_ROLE, 'CUSTOM_ROLE']),
      maskedFields,
    );

    expect(result.resource).toBe('categorias');
    const nomeField = result.fields.find((f) => f.field === 'nome');
    expect(nomeField).toBeDefined();
    expect(nomeField?.label).toBe('Nome');
    expect(nomeField?.controlType).toBe('text');
    expect(nomeField?.defaultOperator).toBe('like');
    expect(nomeField?.quickFilter).toBe(true);

    const ativoField = result.fields.find((f) => f.field === 'ativo');
    expect(ativoField?.controlType).toBe('boolean');
    expect(ativoField?.defaultOperator).toBe('eq');
    expect(ativoField?.options).toEqual([
      { label: 'Ativo', value: true },
      { label: 'Inativo', value: false },
    ]);

    const createdAtField = result.fields.find((f) => f.field === 'createdAt');
    expect(createdAtField?.controlType).toBe('date');
    expect(createdAtField?.quickFilter).toBe(false);
  });

  it('should omit fields protected by @Masked or requiredRole when user does not have the required role', () => {
    const result = buildSearchFilterConfig(
      sampleConfig,
      new Set(),
      maskedFields,
    );

    expect(result.fields.find((f) => f.field === 'valor')).toBeUndefined();
    expect(
      result.fields.find((f) => f.field === 'restritoCustom'),
    ).toBeUndefined();
    expect(result.fields.find((f) => f.field === 'nome')).toBeDefined();
  });

  it('should include fields protected by @Masked when user has DADOS_SENSIVEIS', () => {
    const result = buildSearchFilterConfig(
      sampleConfig,
      new Set([SENSITIVE_DATA_ROLE]),
      maskedFields,
    );

    const valorField = result.fields.find((f) => f.field === 'valor');
    expect(valorField).toBeDefined();
    expect(valorField?.controlType).toBe('currency');
    expect(valorField?.requiredRole).toBe(SENSITIVE_DATA_ROLE);
  });

  it('should preserve quickFilter, options, optionsEndpoint and masterDetail configurations', () => {
    const customProvider: ISmartFilterConfigProvider = {
      getSearchFilterConfig: (roles) =>
        buildSearchFilterConfig(sampleConfig, roles, maskedFields),
    };

    const result = customProvider.getSearchFilterConfig(new Set());
    const perfilField = result.fields.find((f) => f.field === 'perfilId');
    expect(perfilField?.optionsEndpoint).toBe('/perfis');
    expect(perfilField?.optionsValueKey).toBe('id');
    expect(perfilField?.optionsLabelKey).toBe('nome');
    expect(perfilField?.quickFilter).toBe(true);

    const cascadeField = result.fields.find((f) => f.field === 'roleCascata');
    expect(cascadeField?.controlType).toBe('master-detail');
    expect(cascadeField?.masterDetail?.parentEndpoint).toBe('/perfis');
    expect(cascadeField?.masterDetail?.childEndpoint).toBe('/roles');
  });
});
