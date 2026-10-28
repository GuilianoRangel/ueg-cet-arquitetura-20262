import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createUpdateDto } from '../../common/crud/create-update-dto';

export class CreateCategoriaDto {
  @ApiProperty({
    example: 'Material Escolar',
    description: 'Nome da categoria (único entre registros ativos)',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  nome!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se a categoria está ativa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({
    example: 15000,
    description:
      'Valor monetário em centavos (campo sensível protegido por DADOS_SENSIVEIS)',
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  valor?: number | null;
}

export class UpdateCategoriaDto extends createUpdateDto(CreateCategoriaDto) {}
