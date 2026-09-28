import { expect, type Locator, type Page } from '@playwright/test';
import { propertyHomeUrl, type Property } from '../data/assessment';
import type { StayDates, StayRequest } from '../models/booking';
import { addDays, formatLongDate, formatUsNumericDate } from '../utils/date';
import { escapeRegExp } from '../utils/text';
import { BasePage } from './BasePage';

const MAX_MONTHS_TO_PAGE = 13;
const MAX_EXTRA_NIGHTS = 7;

export class PropertyPage extends BasePage {
  private readonly bookingForm: Locator;
  private readonly dateField: Locator;
  private readonly nextMonthButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bookingForm = page.getByRole('form', { name: 'Check Rates and Availability' });
    this.dateField = this.bookingForm.getByRole('button', { name: /select(ed)? dates/i });
    this.nextMonthButton = this.bookingForm.getByRole('button', { name: 'Next month', exact: true });
  }

  async expectLoaded(property: Property): Promise<void> {
    await expect(this.page).toHaveURL(propertyHomeUrl(property));
    await expect(this.page).toHaveTitle(new RegExp(escapeRegExp(property.displayName), 'i'));
    await expect(this.bookingForm).toBeVisible();
  }

  async checkRates(request: StayRequest): Promise<StayDates> {
    await this.prepareSite();
    await this.dateField.click();

    // The live booking widget no longer exposes a stable
    // role="application" / "Calendar Stay Dates" container in every render.
    // Wait for a control that proves the date picker itself is open instead.
    await expect(
      this.nextMonthButton,
      'The stay-date picker should open after clicking the date field',
    ).toBeVisible();

    const checkIn = await this.findFirstSelectableDate(
      request.earliestCheckIn,
      request.searchWindowDays,
    );
    await this.dayButton(checkIn).click();

    const preferredCheckOut = addDays(checkIn, request.nights);
    const checkOut = await this.findFirstSelectableDate(preferredCheckOut, MAX_EXTRA_NIGHTS);
    await this.dayButton(checkOut).click();

    await this.bookingForm.getByRole('button', { name: 'Apply', exact: true }).click();

    const range = `${escapeRegExp(formatUsNumericDate(checkIn))}\\s*[-–]\\s*${escapeRegExp(
      formatUsNumericDate(checkOut),
    )}`;
    await expect(this.dateField).toContainText(new RegExp(range));

    await this.bookingForm.getByRole('button', { name: 'Check Rates', exact: true }).click();
    return { checkIn, checkOut };
  }

  private dayButton(date: Date): Locator {
    return this.bookingForm.getByRole('button', {
      name: new RegExp(`${escapeRegExp(formatLongDate(date))}$`, 'i'),
    });
  }

  private async findFirstSelectableDate(start: Date, searchDays: number): Promise<Date> {
    for (let offset = 0; offset <= searchDays; offset += 1) {
      const candidate = addDays(start, offset);
      await this.showMonth(candidate);
      const day = this.dayButton(candidate);

      if ((await day.count()) > 0 && (await day.isEnabled().catch(() => false))) {
        return candidate;
      }
    }

    throw new Error(
      `No selectable date found within ${searchDays} day(s) of ${formatUsNumericDate(start)}`,
    );
  }

  private async showMonth(date: Date): Promise<void> {
    for (let turn = 0; turn <= MAX_MONTHS_TO_PAGE; turn += 1) {
      if ((await this.dayButton(date).count()) > 0) return;

      const before = await this.bookingForm
        .locator('button[aria-label]')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')).join('|'));

      await this.nextMonthButton.click();

      await expect
        .poll(() =>
          this.bookingForm
            .locator('button[aria-label]')
            .evaluateAll((buttons) =>
              buttons.map((button) => button.getAttribute('aria-label')).join('|'),
            ),
        )
        .not.toBe(before);
    }

    throw new Error(`Could not page the availability calendar to ${formatLongDate(date)}`);
  }
}
