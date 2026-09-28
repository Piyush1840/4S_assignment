import { normalizeWhitespace } from './text';

export interface Money {
  readonly currency: string;
  readonly minorUnits: number;
  readonly precision: number;
}

const ISO_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));
const MONEY =
  /(?<![A-Z])(?:(?<code>[A-Z]{3})|(?<symbol>[$€£¥]))\s*(?<amount>\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![.,]?\d)/g;

function firstMoney(text: string): { money: Money; start: number; end: number } | undefined {
  for (const match of text.matchAll(MONEY)) {
    const amount = match.groups?.amount;
    const code = match.groups?.code;
    const currency = code ?? match.groups?.symbol;
    if (!amount || !currency || (code && !ISO_CURRENCIES.has(code))) continue;

    const [whole = '0', fraction = ''] = amount.replace(/,/g, '').split('.');
    const start = match.index ?? 0;
    return {
      money: {
        currency,
        minorUnits: Number(`${whole}${fraction}`),
        precision: fraction.length,
      },
      start,
      end: start + match[0].length,
    };
  }
  return undefined;
}

export function parseMoney(text: string): Money {
  const money = firstMoney(text)?.money;
  if (!money) throw new Error(`No price found in ${JSON.stringify(text)}`);
  return money;
}

export function removeMoney(text: string): string {
  const price = firstMoney(text);
  if (!price) return normalizeWhitespace(text);
  return normalizeWhitespace(`${text.slice(0, price.start)}${text.slice(price.end)}`);
}

function minorUnitsAt(money: Money, precision: number): number {
  if (precision < money.precision) {
    throw new RangeError(`Cannot reduce precision from ${money.precision} to ${precision}`);
  }
  return money.minorUnits * 10 ** (precision - money.precision);
}

export function pricesMatchWithinDisplayRounding(actual: Money, expected: Money): boolean {
  if (actual.currency !== expected.currency) return false;

  const precision = Math.max(actual.precision, expected.precision);
  const coarserPrecision = Math.min(actual.precision, expected.precision);
  const displayUnit = 10 ** (precision - coarserPrecision);
  const difference = Math.abs(minorUnitsAt(actual, precision) - minorUnitsAt(expected, precision));

  return difference < displayUnit;
}

export function formatMoney(money: Money): string {
  const value = money.minorUnits / 10 ** money.precision;
  return `${money.currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: money.precision,
    maximumFractionDigits: money.precision,
  })}`;
}
