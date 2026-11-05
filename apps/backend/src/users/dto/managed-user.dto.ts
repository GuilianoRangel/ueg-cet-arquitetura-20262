import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createUpdateDto } from '../../common/crud/create-update-dto';
import { FormFieldMeta } from '../../common/crud/decorators/form-field-meta.decorator';

export class BaseManagedUserDto {
  @FormFieldMeta({
    label: 'E-mail',
    inputType: 'email',
    placeholder: 'nome@ueg.br',
    order: 2,
  })
  @ApiProperty({
    example: 'gestor@ueg.br',
    description: 'E-mail do usuário gerenciado',
  })
  @IsEmail({}, { message: 'O e-mail deve ser válido' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @FormFieldMeta({
    label: 'Nome Completo',
    inputType: 'text',
    placeholder: 'Ex: Maria Oliveira',
    order: 1,
  })
  @ApiProperty({
    example: 'Maria Oliveira',
    description: 'Nome completo do usuário',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome!: string;

  @FormFieldMeta({
    label: 'Usuário Ativo',
    inputType: 'boolean',
    order: 5,
  })
  @ApiPropertyOptional({
    example: true,
    description: 'Indica se a conta está ativa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

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
  @ApiPropertyOptional({
    example: ['d84b2c8a-1c32-45c1-8409-51a43ffb90a1'],
    description: 'Lista de IDs dos perfis associados ao usuário',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true, message: 'Cada perfilId deve ser um UUID v4' })
  perfilIds?: string[];
}

export class CreateManagedUserDto extends BaseManagedUserDto {
  @FormFieldMeta({
    label: 'Senha Inicial',
    inputType: 'password',
    placeholder: 'Mínimo de 6 caracteres',
    order: 3,
  })
  @ApiProperty({
    example: 'senhaInicial123',
    description: 'Senha de acesso do usuário',
    minLength: 6,
  })
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  senha!: string;
}

export class UpdateManagedUserDto extends createUpdateDto(BaseManagedUserDto) {}
