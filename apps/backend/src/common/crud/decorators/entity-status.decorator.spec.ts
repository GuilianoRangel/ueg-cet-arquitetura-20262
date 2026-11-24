import 'reflect-metadata';
import { EntityStatus, getEntityStatusMeta } from './entity-status.decorator';

enum SituacaoEnum {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  BLOQUEADO = 'BLOQUEADO',
}

describe('@EntityStatus decorator', () => {
  it('should register boolean status field with default inactiveValues [false] and inactiveLabel "Inativo"', () => {
    class BooleanEntity {
      @EntityStatus()
      ativo!: boolean;
    }

    const meta = getEntityStatusMeta(BooleanEntity);
    expect(meta).toEqual({
      field: 'ativo',
      type: 'boolean',
      inactiveValues: [false],
      inactiveLabel: 'Inativo',
    });
  });

  it('should register enum status field with single inactive value and custom inactiveLabel', () => {
    class SingleEnumEntity {
      @EntityStatus({
        type: 'enum',
        inactiveValues: SituacaoEnum.INATIVO,
        inactiveLabel: 'Desativado',
      })
      situacao!: SituacaoEnum;
    }

    const meta = getEntityStatusMeta(SingleEnumEntity);
    expect(meta).toEqual({
      field: 'situacao',
      type: 'enum',
      inactiveValues: [SituacaoEnum.INATIVO],
      inactiveLabel: 'Desativado',
    });
  });

  it('should register enum status field with multiple inactive values', () => {
    class MultiEnumEntity {
      @EntityStatus({
        type: 'enum',
        inactiveValues: [SituacaoEnum.INATIVO, SituacaoEnum.BLOQUEADO],
      })
      situacao!: SituacaoEnum;
    }

    const meta = getEntityStatusMeta(MultiEnumEntity);
    expect(meta).toEqual({
      field: 'situacao',
      type: 'enum',
      inactiveValues: [SituacaoEnum.INATIVO, SituacaoEnum.BLOQUEADO],
      inactiveLabel: 'Inativo',
    });
  });

  it('should infer enum type when non-boolean inactiveValues are provided without explicit type', () => {
    class InferredEnumEntity {
      @EntityStatus({
        inactiveValues: ['INATIVO', 'CANCELADO'],
      })
      status!: string;
    }

    const meta = getEntityStatusMeta(InferredEnumEntity);
    expect(meta).toEqual({
      field: 'status',
      type: 'enum',
      inactiveValues: ['INATIVO', 'CANCELADO'],
      inactiveLabel: 'Inativo',
    });
  });

  it('should inherit @EntityStatus metadata from base entity class', () => {
    class BaseStatusEntity {
      @EntityStatus()
      ativo!: boolean;
    }

    class ChildEntity extends BaseStatusEntity {
      nome!: string;
    }

    expect(getEntityStatusMeta(ChildEntity)).toEqual({
      field: 'ativo',
      type: 'boolean',
      inactiveValues: [false],
      inactiveLabel: 'Inativo',
    });
  });

  it('should throw fail-fast error when enum type is declared without inactiveValues', () => {
    expect(() => {
      class InvalidEnumEntity {
        @EntityStatus({ type: 'enum' })
        situacao!: SituacaoEnum;
      }
      return InvalidEnumEntity;
    }).toThrow(/inactiveValues/i);
  });

  it('should throw fail-fast error when multiple properties on the same entity use @EntityStatus', () => {
    expect(() => {
      class DuplicateStatusEntity {
        @EntityStatus()
        ativo!: boolean;

        @EntityStatus({ type: 'enum', inactiveValues: 'INATIVO' })
        situacao!: string;
      }
      return DuplicateStatusEntity;
    }).toThrow(/@EntityStatus/i);
  });
});
