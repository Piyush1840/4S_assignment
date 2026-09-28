import { errors, expect, type Locator, type Page } from '@playwright/test';
import { roomResultsUrl, type Property } from '../data/assessment';
import type { RoomSelection, StayDates } from '../models/booking';
import { formatUsNumericDate } from '../utils/date';
import { parseMoney, removeMoney } from '../utils/money';
import { normalizeWhitespace } from '../utils/text';
import { BasePage } from './BasePage';

const ADD_TO_CART = '[data-tracking-id="add-to-cart"]';
const SELECT_BED_OPTIONS = '[data-tracking-id="select-bed-options"]';
const RATE_CTA = `${ADD_TO_CART}, ${SELECT_BED_OPTIONS}`;
const RATE_FEES = '[data-cy="rate-card-fees-disclaimer"]';
const RATE_ROW_FROM_CTA = 'xpath=ancestor::div[.//button[normalize-space()="Rate Details"]][1]';
const HANDOFF_TIMEOUT_MS = 5_000;

async function text(locator: Locator): Promise<string> {
  return normalizeWhitespace((await locator.textContent()) ?? '');
}

export class RoomSelectionPage extends BasePage {
  private readonly results: Locator;
  private readonly roomCards: Locator;

  constructor(page: Page) {
    super(page);
    this.results = page.locator('section.RoomListing-room-results');
    this.roomCards = this.results.locator('.FilteredColumnsList-item');
  }

  async expectResults(property: Property, stay: StayDates): Promise<void> {
    await expect(this.page).toHaveURL(roomResultsUrl(property));
    await expect(this.roomCards.first(), 'Room results should render').toBeVisible({ timeout: 60_000 });

    const dateField = this.page
      .getByRole('form', { name: 'Check Rates and Availability' })
      .getByRole('button', { name: /selected dates/i });
    await expect(dateField).toContainText(formatUsNumericDate(stay.checkIn));
    await expect(dateField).toContainText(formatUsNumericDate(stay.checkOut));
  }

  async addFirstAvailableRoomToCart(property: Property): Promise<RoomSelection> {
    await this.prepareSite();

    const roomCard = this.roomCards.filter({ has: this.page.locator(RATE_CTA) }).first();
    await expect(roomCard, 'At least one room should be bookable').toBeVisible();

    const roomName = await text(roomCard.locator('a[target="_blank"]').first());
    expect(roomName, 'Room name should be displayed').not.toBe('');

    const rateRow = roomCard.locator(RATE_CTA).first().locator(RATE_ROW_FROM_CTA);
    const rateName = await text(
      rateRow
        .getByRole('button', { name: 'Rate Details', exact: true })
        .locator('xpath=preceding-sibling::*[1]'),
    );
    expect(rateName, 'Rate plan should be displayed').not.toBe('');

    const price = rateRow.locator(RATE_FEES).locator('xpath=preceding-sibling::*[1]');
    const addButton = rateRow.locator(ADD_TO_CART);
    const selectBedButton = rateRow.locator(SELECT_BED_OPTIONS);
    let bedType: string | undefined;

    if (await selectBedButton.isVisible().catch(() => false)) {
      await selectBedButton.click();
      await expect(addButton).toBeVisible();

      const selectedBed = rateRow
        .getByRole('radio', { checked: true })
        .locator('xpath=ancestor::label[1]/following-sibling::*[1]');
      bedType = removeMoney(await text(selectedBed));
      expect(bedType, 'Selected bed option should be displayed').not.toBe('');
      await expect(price).not.toContainText(/\bfrom\b/i);
    }

    const nightlyPrice = parseMoney(await price.innerText());
    await addButton.click();
    await this.waitForOptionalHandOff(property);

    return { roomName, rateName, bedType, nightlyPrice };
  }

  private async waitForOptionalHandOff(property: Property): Promise<void> {
    try {
      await this.page.waitForURL((url) => !roomResultsUrl(property).test(url.pathname), {
        timeout: HANDOFF_TIMEOUT_MS,
      });
      await this.assertNotBlocked();
    } catch (error) {
      if (!(error instanceof errors.TimeoutError)) throw error;
    }
  }
}
