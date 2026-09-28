import { expect, type Page } from '@playwright/test';
import { ASSESSMENT, propertyHomeUrl, type Property } from '../data/assessment';
import { escapeRegExp } from '../utils/text';
import { BasePage } from './BasePage';

export class FindHotelPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.goto(ASSESSMENT.directoryPath, { waitUntil: 'domcontentloaded' });
    await this.prepareSite();
    await this.assertNotBlocked();
    await expect(this.page.getByRole('heading', { name: /all hotels (&|and) resorts/i })).toBeVisible();
  }

  async selectProperty(property: Property): Promise<void> {
    await this.prepareSite();

    // The directory renders the same property in several category sections. Resolve only a currently
    // visible copy, then invoke that exact anchor in the same DOM turn so a category re-render cannot
    // switch Playwright to a hidden duplicate between actionability checks and the click.
    const visiblePropertyLink = this.page
      .locator(`a[href="/${property.slug}/"]`)
      .filter({
        hasText: new RegExp(`^\\s*${escapeRegExp(property.listingName)}\\s*$`, 'i'),
        visible: true,
      })
      .first();

    await expect(
      visiblePropertyLink,
      `${property.listingName} should be visible in the ${property.region} property list`,
    ).toBeVisible();
    await visiblePropertyLink.evaluate((link: HTMLAnchorElement) => link.click());

    await expect(this.page).toHaveURL(propertyHomeUrl(property));
    await this.assertNotBlocked();
  }
}
