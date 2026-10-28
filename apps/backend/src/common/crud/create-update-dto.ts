import { Type } from '@nestjs/common';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export function createUpdateDto<T extends object>(
  baseDto: Type<T>,
): Type<Partial<T> & { version: number }> {
  const PartialBase = PartialType(baseDto) as new (
    ...args: unknown[]
  ) => Record<string, unknown>;

  class BaseUpdateDto extends PartialBase {
    @ApiProperty({
      example: 1,
      description:
        'Versão atual do registro no banco para controle de concorrência otimista (optimistic locking)',
    })
    @IsInt({ message: 'A versão deve ser um número inteiro' })
    @Min(1, { message: 'A versão deve ser maior ou igual a 1' })
    version!: number;
  }

  Object.defineProperty(BaseUpdateDto, 'name', {
    value: `Update${baseDto.name}`,
  });

  return BaseUpdateDto as unknown as Type<Partial<T> & { version: number }>;
}
