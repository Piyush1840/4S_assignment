import { expect, test } from '@playwright/test';
import { parseMoney, pricesMatchWithinDisplayRounding, removeMoney } from '../../src/utils/money';

test.describe('money utilities', () => {
  test('parses currency codes and symbols without assuming dollars', () => {
    expect(parseMoney('From CAD 1,449')).toEqual({ currency: 'CAD', minorUnits: 1449, precision: 0 });
    expect(parseMoney('USD 1,448.81')).toEqual({
      currency: 'USD',
      minorUnits: 144881,
      precision: 2,
    });
    expect(parseMoney('$1,449.50')).toEqual({ currency: '$', minorUnits: 144950, precision: 2 });
  });

  test('accepts display rounding but rejects a real price or currency change', () => {
    expect(pricesMatchWithinDisplayRounding(parseMoney('CAD 1,448.81'), parseMoney('CAD 1,449'))).toBe(
      true,
    );
    expect(pricesMatchWithinDisplayRounding(parseMoney('CAD 1,447.99'), parseMoney('CAD 1,449'))).toBe(
      false,
    );
    expect(pricesMatchWithinDisplayRounding(parseMoney('USD 1,449'), parseMoney('CAD 1,449'))).toBe(
      false,
    );
  });

  test('rejects malformed price text', () => {
    expect(() => parseMoney('CAD 1,21,000')).toThrow('No price found');
    expect(() => parseMoney('3 guests')).toThrow('No price found');
  });

  test('removes a displayed price from a bed-option label', () => {
    expect(removeMoney('One king bed CAD 1,449')).toBe('One king bed');
  });
});
