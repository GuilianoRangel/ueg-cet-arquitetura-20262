import { IsString, IsNotEmpty } from 'class-validator';
import { DtoValidationPipe } from './dto-validation.pipe';
import { createUpdateDto } from '../create-update-dto';
import { ValidationException } from '../../exceptions/validation.exception';

class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;
}

const UpdateItemDto = createUpdateDto(CreateItemDto);

describe('DtoValidationPipe', () => {
  it('DtoValidationPipe should return a typed instance for a valid body', async () => {
    const pipe = new DtoValidationPipe(CreateItemDto);
    const result = (await pipe.transform({ nome: 'Item A' })) as CreateItemDto;

    expect(result).toBeInstanceOf(CreateItemDto);
    expect(result.nome).toBe('Item A');
  });

  it('DtoValidationPipe should throw ValidationException with details for invalid body', async () => {
    const pipe = new DtoValidationPipe(CreateItemDto);

    await expect(pipe.transform({ nome: '' })).rejects.toThrow(
      ValidationException,
    );

    try {
      await pipe.transform({ nome: '' });
      fail('Should throw');
    } catch (err) {
      const valErr = err as ValidationException;
      expect(valErr.getStatus()).toBe(400);
      expect(valErr.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'nome' })]),
      );
    }
  });

  it('DtoValidationPipe should reject unknown properties (whitelist/forbidNonWhitelisted)', async () => {
    const pipe = new DtoValidationPipe(CreateItemDto);

    await expect(
      pipe.transform({ nome: 'Valid', unknownProp: 123 }),
    ).rejects.toThrow(ValidationException);
  });

  it('DtoValidationPipe should reject missing version on update DTO', async () => {
    const pipe = new DtoValidationPipe(UpdateItemDto);

    await expect(pipe.transform({ nome: 'Updated' })).rejects.toThrow(
      ValidationException,
    );
  });
});
