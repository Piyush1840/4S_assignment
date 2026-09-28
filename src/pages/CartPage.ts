import { expect, type Locator, type Page } from '@playwright/test';
import type { Property } from '../data/assessment';
import { cartItemTitle, type RoomSelection } from '../models/booking';
import { formatMoney, parseMoney, pricesMatchWithinDisplayRounding } from '../utils/money';
import { escapeRegExp } from '../utils/text';
import { BasePage } from './BasePage';

const CART_ITEM_FEES = '[data-cy="shopping-cart-item__taxes-and-fees"]';

export class CartPage extends BasePage {
  private readonly panel: Locator;
  private readonly items: Locator;

  constructor(page: Page) {
    super(page);
    this.panel = page.getByRole('dialog', { name: 'User Panel' });
    this.items = this.panel
      .locator(CART_ITEM_FEES)
      .locator('xpath=ancestor::div[.//button[normalize-space()="Remove"]][1]');
  }

  async open(): Promise<void> {
    await this.prepareSite();

    // Four Seasons renders several responsive header copies with the same cart id. Pick the copy that is
    // visible now and invoke that exact element so duplicate hidden headers cannot trigger strict mode.
    const cartButton = this.page
      .locator('button#shopping_cart_icon')
      .filter({ visible: true })
      .first();

    await expect(cartButton, 'A visible cart icon should be available').toBeVisible();
    await cartButton.evaluate((button: HTMLButtonElement) => button.click());

    await expect(this.panel).toBeVisible();
    await expect(this.panel.getByRole('tab', { name: /^cart\b/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  }

  async verifySelection(property: Property, selection: RoomSelection): Promise<void> {
    await expect(this.items, 'Exactly one room should be in the cart').toHaveCount(1);

    await expect(
      this.panel.getByRole('heading', {
        name: new RegExp(`^${escapeRegExp(property.displayName)}$`, 'i'),
      }),
    ).toBeVisible();

    const item = this.items.first();
    await expect(item, 'The selected room and bed should be displayed').toContainText(
      new RegExp(escapeRegExp(cartItemTitle(selection)), 'i'),
    );
    await expect(item, 'The selected rate plan should be displayed').toContainText(
      new RegExp(escapeRegExp(selection.rateName), 'i'),
    );

    const cartPrice = parseMoney(
      await item.locator(CART_ITEM_FEES).locator('xpath=preceding-sibling::*[1]').innerText(),
    );

    expect(
      pricesMatchWithinDisplayRounding(cartPrice, selection.nightlyPrice),
      `Cart nightly price ${formatMoney(cartPrice)} should match the selected rate-card price ${formatMoney(selection.nightlyPrice)} within display rounding`,
    ).toBe(true);
  }
}
