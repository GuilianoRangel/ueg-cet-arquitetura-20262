import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FILME_GENEROS, FilmeGenero } from '@repo/utils';
import { createUpdateDto } from '../../common/crud/create-update-dto';
import { FormFieldMeta } from '../../common/crud/decorators/form-field-meta.decorator';

export class CreateFilmeDto {
  @FormFieldMeta({
    label: 'Título',
    inputType: 'text',
    placeholder: 'Ex: Interestelar',
    order: 1,
  })
  @ApiProperty({
    example: 'Interestelar',
    description: 'Título do filme (único por ano entre registros ativos)',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  titulo!: string;

  @FormFieldMeta({
    label: 'Categorias',
    inputType: 'multiselect',
    optionsEndpoint: '/categorias',
    optionsValueKey: 'id',
    optionsLabelKey: 'nome',
    entityRelationProperty: 'categorias',
    entityRelationValueKey: 'id',
    order: 2,
  })
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Lista de identificadores UUID das categorias vinculadas',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe pelo menos uma categoria' })
  @IsUUID('4', {
    each: true,
    message: 'Cada categoriaId deve ser um UUID válido',
  })
  categoriaIds!: string[];

  @FormFieldMeta({
    label: 'Gêneros',
    inputType: 'multiselect',
    optionsStatic: FILME_GENEROS.map((g) => ({ label: g, value: g })),
    order: 3,
  })
  @ApiProperty({
    example: ['Ficção Científica', 'Drama'],
    description: 'Lista de gêneros cinematográficos atribuídos ao filme',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe pelo menos um gênero cinematográfico' })
  @IsIn(FILME_GENEROS, {
    each: true,
    message: 'Gênero inválido. Selecione opções válidas da lista.',
  })
  generos!: FilmeGenero[];

  @FormFieldMeta({
    label: 'Ano de Lançamento',
    inputType: 'number',
    placeholder: 'Ex: 2014',
    order: 4,
  })
  @ApiProperty({
    example: 2014,
    description: 'Ano de lançamento da obra cinematográfica',
  })
  @IsInt()
  @Min(1888, { message: 'O ano deve ser igual ou superior a 1888' })
  @Max(2100, { message: 'O ano deve ser igual ou inferior a 2100' })
  ano!: number;

  @FormFieldMeta({
    label: 'Duração (minutos)',
    inputType: 'number',
    placeholder: 'Ex: 169',
    order: 5,
  })
  @ApiProperty({
    example: 169,
    description: 'Duração total do filme em minutos',
  })
  @IsInt()
  @Min(1, { message: 'A duração deve ser de pelo menos 1 minuto' })
  @Max(1440, { message: 'A duração não pode exceder 1440 minutos (24 horas)' })
  duracao!: number;

  @FormFieldMeta({
    label: 'Diretor',
    inputType: 'text',
    placeholder: 'Ex: Christopher Nolan',
    order: 6,
  })
  @ApiProperty({
    example: 'Christopher Nolan',
    description: 'Nome do diretor responsável pela obra',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  diretor!: string;

  @FormFieldMeta({
    label: 'Sinopse',
    inputType: 'richtext',
    placeholder: 'Digite a sinopse detalhada do filme...',
    order: 7,
  })
  @ApiProperty({
    example:
      '<p>Uma equipe de exploradores viaja através de um buraco de minhoca no espaço.</p>',
    description: 'Sinopse do filme em texto rico (HTML)',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  sinopse!: string;

  @FormFieldMeta({
    label: 'Filme Ativo',
    inputType: 'boolean',
    order: 8,
  })
  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o filme está ativo no catálogo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateFilmeDto extends createUpdateDto(CreateFilmeDto) {}
