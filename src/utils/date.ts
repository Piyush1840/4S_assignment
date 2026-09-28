import type { StayRequest } from '../models/booking';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function futureStayRequest(
  daysInFuture: number,
  nights: number,
  searchWindowDays: number,
  today = new Date(),
): StayRequest {
  return {
    earliestCheckIn: addDays(today, daysInFuture),
    nights,
    searchWindowDays,
  };
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatUsNumericDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}
