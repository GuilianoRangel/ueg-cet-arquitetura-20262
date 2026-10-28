import { IsString, IsNotEmpty, validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { createUpdateDto } from './create-update-dto';

class SampleCreateDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsString()
  descricao!: string;
}

describe('createUpdateDto', () => {
  const SampleUpdateDto = createUpdateDto(SampleCreateDto);

  it('createUpdateDto should make every field optional and add a required integer version >= 1', async () => {
    // Valid update with only version
    const valid = plainToInstance(SampleUpdateDto, { version: 1 });
    const errors = await validate(valid);
    expect(errors.length).toBe(0);

    // Invalid update: missing version
    const invalidNoVersion = plainToInstance(SampleUpdateDto, {
      nome: 'Novo Nome',
    });
    const errorsNoVersion = await validate(invalidNoVersion);
    expect(errorsNoVersion.some((e) => e.property === 'version')).toBe(true);

    // Invalid update: version < 1
    const invalidZeroVersion = plainToInstance(SampleUpdateDto, { version: 0 });
    const errorsZero = await validate(invalidZeroVersion);
    expect(errorsZero.some((e) => e.property === 'version')).toBe(true);

    // Invalid update: version non-integer
    const invalidFloatVersion = plainToInstance(SampleUpdateDto, {
      version: 1.5,
    });
    const errorsFloat = await validate(invalidFloatVersion);
    expect(errorsFloat.some((e) => e.property === 'version')).toBe(true);
  });

  it('createUpdateDto should preserve the validators of the base DTO', async () => {
    // Empty string violates IsNotEmpty
    const invalidBaseField = plainToInstance(SampleUpdateDto, {
      nome: '',
      version: 1,
    });
    const errors = await validate(invalidBaseField);
    expect(errors.some((e) => e.property === 'nome')).toBe(true);
  });
});
