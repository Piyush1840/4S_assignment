import { expect, test } from '@playwright/test';
import { addDays, futureStayRequest } from '../../src/utils/date';

test.describe('date utilities', () => {
  test('builds a future stay without hard-coded calendar dates', () => {
    const today = new Date(2026, 0, 31, 15, 30);
    const request = futureStayRequest(30, 1, 14, today);

    expect(request).toEqual({
      earliestCheckIn: new Date(2026, 2, 2),
      nights: 1,
      searchWindowDays: 14,
    });
  });

  test('adds days across a year boundary', () => {
    expect(addDays(new Date(2026, 11, 31), 1)).toEqual(new Date(2027, 0, 1));
  });
});
