import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayUnique,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createUpdateDto } from '../../common/crud/create-update-dto';

export class CreatePerfilDto {
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

  @ApiPropertyOptional({
    example: true,
    description: 'Indica se o perfil está ativo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiProperty({
    example: ['categorias:read', 'categorias:create'],
    description: 'Lista de permissões (roles) atribuídas ao perfil',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  roles!: string[];
}

export class UpdatePerfilDto extends createUpdateDto(CreatePerfilDto) {}
