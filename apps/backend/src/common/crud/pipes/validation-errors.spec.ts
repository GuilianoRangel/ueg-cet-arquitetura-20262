import { ValidationError } from 'class-validator';
import { toValidationException } from './validation-errors';

describe('toValidationException', () => {
  it('should convert flat validation errors to ValidationException details', () => {
    const errors: ValidationError[] = [
      {
        property: 'nome',
        constraints: {
          isNotEmpty: 'O nome é obrigatório',
          isString: 'O nome deve ser string',
        },
      },
    ];

    const exception = toValidationException(errors);
    expect(exception.getStatus()).toBe(400);
    expect(exception.details).toEqual([
      { field: 'nome', message: 'O nome é obrigatório' },
    ]);
  });

  it('should flatten nested errors with dotted path', () => {
    const errors: ValidationError[] = [
      {
        property: 'endereco',
        children: [
          {
            property: 'rua',
            constraints: {
              isNotEmpty: 'A rua é obrigatória',
            },
          },
          {
            property: 'cidade',
            children: [
              {
                property: 'nome',
                constraints: {
                  isNotEmpty: 'O nome da cidade é obrigatório',
                },
              },
            ],
          },
        ],
      },
    ];

    const exception = toValidationException(errors);
    expect(exception.details).toEqual([
      { field: 'endereco.rua', message: 'A rua é obrigatória' },
      {
        field: 'endereco.cidade.nome',
        message: 'O nome da cidade é obrigatório',
      },
    ]);
  });
});
