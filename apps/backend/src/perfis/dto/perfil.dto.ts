import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayUnique,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createUpdateDto } from '../../common/crud/create-update-dto';
import { FormFieldMeta } from '../../common/crud/decorators/form-field-meta.decorator';

export class CreatePerfilDto {
  @FormFieldMeta({
    label: 'Nome do Perfil',
    inputType: 'text',
    placeholder: 'Ex: Operador de Conteúdo',
    order: 1,
  })
  @ApiProperty({
    example: 'Operador de Conteúdo',
    description: 'Nome único do perfil de acesso',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome!: string;

  @FormFieldMeta({
    label: 'Perfil Ativo',
    inputType: 'boolean',
    order: 3,
  })
  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o perfil está ativo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @FormFieldMeta({
    label: 'Ações de Funcionalidades',
    inputType: 'multiselect',
    optionsEndpoint: '/roles',
    order: 2,
  })
  @ApiProperty({
    example: ['1752ee92-332b-4beb-b88a-14242a14a308'],
    description: 'Lista de IDs de FuncionalidadeAcao atribuídas ao perfil',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  acaoIds!: string[];
}

export class UpdatePerfilDto extends createUpdateDto(CreatePerfilDto) {}
