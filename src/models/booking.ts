import type { Money } from '../utils/money';

export interface StayDates {
  readonly checkIn: Date;
  readonly checkOut: Date;
}

export interface StayRequest {
  readonly earliestCheckIn: Date;
  readonly nights: number;
  readonly searchWindowDays: number;
}

export interface RoomSelection {
  readonly roomName: string;
  readonly rateName: string;
  readonly bedType?: string;
  readonly nightlyPrice: Money;
}

export function cartItemTitle(selection: RoomSelection): string {
  return selection.bedType ? `${selection.roomName} - ${selection.bedType}` : selection.roomName;
}
