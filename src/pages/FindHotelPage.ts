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
    await expect(
      this.page.getByRole('heading', { name: /all hotels (&|and) resorts/i }),
    ).toBeVisible();
  }

  async selectProperty(property: Property): Promise<void> {
    await this.prepareSite();

    const regionName = new RegExp(`^${escapeRegExp(property.region)}\\b`, 'i');
    const regionToggle = this.page
      .getByRole('button', { name: regionName })
      .filter({ visible: true })
      .first();

    await expect(
      regionToggle,
      `The visible ${property.region} property group should be available`,
    ).toBeVisible();

    const controlledRegionId = await regionToggle.getAttribute('aria-controls');
    if (!controlledRegionId) {
      throw new Error(
        `The visible ${property.region} property-group button does not expose aria-controls`,
      );
    }

    const escapedRegionId = controlledRegionId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const regionPanel = this.page.locator(`[id="${escapedRegionId}"]`);

    const propertyLink = regionPanel
      .locator(`a[href="/${property.slug}/"]`)
      .filter({
        hasText: new RegExp(`^\\s*${escapeRegExp(property.listingName)}\\s*$`, 'i'),
      })
      .first();

    if (!(await propertyLink.isVisible())) {
      const expanded = await regionToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await regionToggle.click();
      }
    }

    await expect(
      regionPanel,
      `The ${property.region} property group should be expanded`,
    ).toBeVisible();

    await expect(
      propertyLink,
      `${property.listingName} should be visible inside the ${property.region} property group`,
    ).toBeVisible();

    await propertyLink.click();

    await expect(this.page).toHaveURL(propertyHomeUrl(property));
    await this.assertNotBlocked();
  }
}
