import { MaskService } from './mask.service';
import { Masked, getMaskedFields } from './masked.decorator';
import { SENSITIVE_DATA_ROLE } from '@repo/utils';

class TestProduct {
  name!: string;

  @Masked({ maskValue: 12345 })
  priceWithCustomMask!: number;

  @Masked()
  defaultNumeric!: number;

  @Masked({
    maskValue: 999,
    maskFn: (val: unknown) => Number(val) * 2,
  })
  fieldWithMaskFn!: number;

  @Masked()
  secretNote!: string;

  @Masked()
  otherField!: boolean;

  @Masked({ role: 'finance:view' })
  financeCode!: string;

  constructor(partial: Partial<TestProduct> = {}) {
    Object.assign(this, partial);
  }
}

describe('MaskService', () => {
  let maskService: MaskService;

  beforeEach(() => {
    maskService = new MaskService();
  });

  it('should return the entity unchanged when the user has the role', () => {
    const product = new TestProduct({
      name: 'Item',
      priceWithCustomMask: 500,
      defaultNumeric: 300,
      secretNote: 'Top secret',
    });

    const result = maskService.apply(
      product,
      new Set([SENSITIVE_DATA_ROLE, 'finance:view']),
    );

    expect(result.priceWithCustomMask).toBe(500);
    expect(result.defaultNumeric).toBe(300);
    expect(result.secretNote).toBe('Top secret');
  });

  it('should replace a numeric field with maskValue when the user lacks the role', () => {
    const product = new TestProduct({
      priceWithCustomMask: 500,
    });

    const result = maskService.apply(product, new Set());
    expect(result.priceWithCustomMask).toBe(12345);
  });

  it('should use 99999 as default for numeric fields without maskValue', () => {
    const product = new TestProduct({
      defaultNumeric: 450,
    });

    const result = maskService.apply(product, new Set());
    expect(result.defaultNumeric).toBe(99999);
  });

  it('should use maskFn result when provided (precedence over maskValue)', () => {
    const product = new TestProduct({
      fieldWithMaskFn: 50,
    });

    const result = maskService.apply(product, new Set());
    expect(result.fieldWithMaskFn).toBe(100);
  });

  it('should use ******** for string fields without maskValue and null for other types', () => {
    const product = new TestProduct({
      secretNote: 'my-secret',
      otherField: true,
    });

    const result = maskService.apply(product, new Set());
    expect(result.secretNote).toBe('********');
    expect(result.otherField).toBeNull();
  });

  it('should keep null and undefined values untouched', () => {
    const product = new TestProduct({
      priceWithCustomMask: null as unknown as number,
      defaultNumeric: undefined,
    });

    const result = maskService.apply(product, new Set());
    expect(result.priceWithCustomMask).toBeNull();
    expect(result.defaultNumeric).toBeUndefined();
  });

  it('should not mutate the original entity', () => {
    const product = new TestProduct({
      priceWithCustomMask: 500,
    });

    const result = maskService.apply(product, new Set());
    expect(result.priceWithCustomMask).toBe(12345);
    expect(product.priceWithCustomMask).toBe(500);
  });

  it('should honor a custom role in @Masked options', () => {
    const product = new TestProduct({
      financeCode: 'FIN-001',
    });

    const withoutRole = maskService.apply(
      product,
      new Set([SENSITIVE_DATA_ROLE]),
    );
    expect(withoutRole.financeCode).toBe('********');

    const withRole = maskService.apply(product, new Set(['finance:view']));
    expect(withRole.financeCode).toBe('FIN-001');
  });

  it('maskedFields(entityClass) should list masked property names and their roles', () => {
    const fields = getMaskedFields(TestProduct);
    expect(fields.length).toBe(6);

    const financeField = fields.find((f) => f.propertyKey === 'financeCode');
    expect(financeField?.role).toBe('finance:view');

    const defaultField = fields.find((f) => f.propertyKey === 'defaultNumeric');
    expect(defaultField?.role).toBe(SENSITIVE_DATA_ROLE);
  });
});
