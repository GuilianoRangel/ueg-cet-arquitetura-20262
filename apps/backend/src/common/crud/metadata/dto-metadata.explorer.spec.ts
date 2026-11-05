import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';
import { createUpdateDto } from '../create-update-dto';
import { FormFieldMeta } from '../decorators/form-field-meta.decorator';
import { Masked } from '../masking/masked.decorator';
import { DtoMetadataExplorer } from './dto-metadata.explorer';

class TestEntity {
  id!: string;
  nome!: string;

  @Masked({ role: SENSITIVE_DATA_ROLE, maskValue: 99999 })
  valor!: number | null;
}

class BaseTestUserDto {
  @FormFieldMeta({ label: 'Nome Completo', order: 1 })
  @ApiProperty({ description: 'Nome completo', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(100, { message: 'Máximo de 100 caracteres' })
  nome!: string;

  @FormFieldMeta({ label: 'E-mail', inputType: 'email', order: 2 })
  @ApiProperty({ description: 'E-mail do usuário' })
  @IsEmail({}, { message: 'O e-mail deve ser válido' })
  @IsNotEmpty()
  email!: string;

  @FormFieldMeta({
    label: 'Perfis de Acesso',
    inputType: 'multiselect',
    optionsEndpoint: '/perfis',
    optionsValueKey: 'id',
    optionsLabelKey: 'nome',
    entityRelationProperty: 'perfis',
    entityRelationValueKey: 'id',
    order: 4,
  })
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  perfilIds?: string[];

  @FormFieldMeta({
    label: 'Valor Sensível (R$)',
    inputType: 'currency',
    order: 5,
  })
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Mínimo 0' })
  @Max(1000000, { message: 'Máximo 1000000' })
  valor?: number;

  @FormFieldMeta({ label: 'Ativo', inputType: 'boolean', order: 6 })
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

class CreateTestUserDto extends BaseTestUserDto {
  @FormFieldMeta({ label: 'Senha Inicial', inputType: 'password', order: 3 })
  @ApiProperty({ minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  senha!: string;
}

class UpdateTestUserDto extends createUpdateDto(BaseTestUserDto) {}

describe('DtoMetadataExplorer', () => {
  const explorer = new DtoMetadataExplorer();

  it('should extract fields, types and required flags from class-validator and @ApiProperty decorators', () => {
    const schema = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    expect(schema.mode).toBe('create');
    const nome = schema.fields.find((f) => f.name === 'nome');
    expect(nome).toBeDefined();
    expect(nome?.required).toBe(true);
    expect(nome?.inputType).toBe('text');

    const ativo = schema.fields.find((f) => f.name === 'ativo');
    expect(ativo?.required).toBe(false);
    expect(ativo?.inputType).toBe('boolean');
    expect(ativo?.defaultValue).toBe(true);
  });

  it('should extract minLength, maxLength, min, max, isEmail and custom validation messages', () => {
    const schema = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    const nome = schema.fields.find((f) => f.name === 'nome');
    expect(nome?.validations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'required',
          message: 'O nome é obrigatório',
        }),
        expect.objectContaining({
          type: 'maxLength',
          value: 100,
          message: 'Máximo de 100 caracteres',
        }),
      ]),
    );

    const email = schema.fields.find((f) => f.name === 'email');
    expect(email?.validations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'email',
          message: 'O e-mail deve ser válido',
        }),
      ]),
    );

    const senha = schema.fields.find((f) => f.name === 'senha');
    expect(senha?.validations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'minLength',
          value: 6,
          message: 'A senha deve ter pelo menos 6 caracteres',
        }),
      ]),
    );

    const valor = schema.fields.find((f) => f.name === 'valor');
    expect(valor?.validations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'min',
          value: 0,
          message: 'Mínimo 0',
        }),
        expect.objectContaining({
          type: 'max',
          value: 1000000,
          message: 'Máximo 1000000',
        }),
        expect.objectContaining({
          type: 'int',
        }),
      ]),
    );
  });

  it('should inherit fields from base DTO classes (e.g. BaseManagedUserDto -> CreateManagedUserDto and UpdateManagedUserDto)', () => {
    const createSchema = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );
    const updateSchema = explorer.exploreFormSchema(
      UpdateTestUserDto,
      'update',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    expect(createSchema.fields.map((f) => f.name)).toEqual([
      'nome',
      'email',
      'senha',
      'perfilIds',
      'valor',
      'ativo',
    ]);
    expect(updateSchema.fields.map((f) => f.name)).toContain('nome');
    expect(updateSchema.fields.map((f) => f.name)).toContain('email');
    expect(updateSchema.fields.map((f) => f.name)).toContain('perfilIds');
  });

  it('should include senha in createForm of CreateManagedUserDto and omit senha in updateForm of UpdateManagedUserDto', () => {
    const createSchema = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );
    const updateSchema = explorer.exploreFormSchema(
      UpdateTestUserDto,
      'update',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    expect(createSchema.fields.find((f) => f.name === 'senha')).toBeDefined();
    expect(updateSchema.fields.find((f) => f.name === 'senha')).toBeUndefined();
  });

  it('should mark version field as hidden in updateForm', () => {
    const updateSchema = explorer.exploreFormSchema(
      UpdateTestUserDto,
      'update',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    const version = updateSchema.fields.find((f) => f.name === 'version');
    expect(version).toBeDefined();
    expect(version?.inputType).toBe('hidden');
    expect(version?.hidden).toBe(true);
  });

  it('should merge @FormFieldMeta options (label, inputType, optionsEndpoint, entityRelationProperty, order)', () => {
    const updateSchema = explorer.exploreFormSchema(
      UpdateTestUserDto,
      'update',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    const perfilIds = updateSchema.fields.find((f) => f.name === 'perfilIds');
    expect(perfilIds?.label).toBe('Perfis de Acesso');
    expect(perfilIds?.inputType).toBe('multiselect');
    expect(perfilIds?.optionsEndpoint).toBe('/perfis');
    expect(perfilIds?.optionsValueKey).toBe('id');
    expect(perfilIds?.optionsLabelKey).toBe('nome');
    expect(perfilIds?.entityRelationProperty).toBe('perfis');
    expect(perfilIds?.entityRelationValueKey).toBe('id');
    expect(perfilIds?.order).toBe(4);
  });

  it('should mark @Masked fields as readOnly, masked and omitOnSubmit when user lacks DADOS_SENSIVEIS', () => {
    const schemaWithoutRole = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set(),
    );

    const valor = schemaWithoutRole.fields.find((f) => f.name === 'valor');
    expect(valor).toBeDefined();
    expect(valor?.requiredRole).toBe(SENSITIVE_DATA_ROLE);
    expect(valor?.readOnly).toBe(true);
    expect(valor?.masked).toBe(true);
    expect(valor?.omitOnSubmit).toBe(true);
  });

  it('should allow editing @Masked fields when user has DADOS_SENSIVEIS', () => {
    const schemaWithRole = explorer.exploreFormSchema(
      CreateTestUserDto,
      'create',
      TestEntity,
      new Set([SENSITIVE_DATA_ROLE]),
    );

    const valor = schemaWithRole.fields.find((f) => f.name === 'valor');
    expect(valor).toBeDefined();
    expect(valor?.requiredRole).toBe(SENSITIVE_DATA_ROLE);
    expect(valor?.readOnly).toBe(false);
    expect(valor?.masked).toBe(false);
    expect(valor?.omitOnSubmit).toBe(false);
  });
});
