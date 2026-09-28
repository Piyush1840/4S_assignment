import { expect, type Locator, type Page } from '@playwright/test';
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

    const regionToggle = this.visibleRegionToggle(property.region);
    await expect(
      regionToggle,
      `The visible ${property.region} property group should be available`,
    ).toBeVisible();

    const regionPanel = await this.controlledRegionPanel(regionToggle, property.region);
    const propertyLink = regionPanel
      .locator(`a[href="/${property.slug}/"]`)
      .filter({
        hasText: new RegExp(`^\\s*${escapeRegExp(property.listingName)}\\s*$`, 'i'),
      })
      .first();

    if ((await regionToggle.getAttribute('aria-expanded')) !== 'true') {
      await regionToggle.click();
      await expect(
        regionToggle,
        `The ${property.region} property group should report itself as expanded`,
      ).toHaveAttribute('aria-expanded', 'true');
    }

    await expect(
      regionPanel,
      `The ${property.region} property group should be expanded`,
    ).toBeVisible();

    await expect(
      propertyLink,
      `${property.listingName} should be visible inside the ${property.region} property group`,
    ).toBeVisible();

    // The live directory animates this accordion link and can hide it again while Playwright waits
    // for a stable pointer target. At this point the exact controlled-panel link has already been
    // verified as visible, so invoke that anchor directly and wait for the expected navigation.
    await Promise.all([
      this.page.waitForURL(propertyHomeUrl(property)),
      propertyLink.evaluate((link: HTMLAnchorElement) => link.click()),
    ]);

    await this.assertNotBlocked();
  }

  private visibleRegionToggle(region: string): Locator {
    return this.page
      .getByRole('button', {
        name: new RegExp(`^${escapeRegExp(region)}\\b`, 'i'),
      })
      .filter({ visible: true })
      .first();
  }

  private async controlledRegionPanel(regionToggle: Locator, region: string): Promise<Locator> {
    const controlledRegionId = await regionToggle.getAttribute('aria-controls');
    if (!controlledRegionId) {
      throw new Error(
        `The visible ${region} property-group button does not expose aria-controls`,
      );
    }

    const escapedRegionId = controlledRegionId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return this.page.locator(`[id="${escapedRegionId}"]`);
  }
}
