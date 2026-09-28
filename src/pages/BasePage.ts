import type { Page } from '@playwright/test';

export class BotProtectionError extends Error {
  override name = 'BotProtectionError';
}

/** Shared site concerns only: transient overlays and bot-block detection. */
export abstract class BasePage {
  private static readonly preparedPages = new WeakSet<Page>();

  constructor(protected readonly page: Page) {}

  /** Register one set of overlay handlers for this browser page. */
  protected async prepareSite(): Promise<void> {
    if (BasePage.preparedPages.has(this.page)) return;

    const survey = this.page.locator('.QSIPopOver').first();
    await this.page.addLocatorHandler(survey, async (popover) => {
      await popover.evaluate((element) => element.remove());
    });

    const cookieBanner = this.page.locator('#onetrust-banner-sdk');
    await this.page.addLocatorHandler(cookieBanner, async (banner) => {
      await banner.locator('#onetrust-accept-btn-handler').click();
    });

    BasePage.preparedPages.add(this.page);
  }

  protected async assertNotBlocked(): Promise<void> {
    const title = await this.page.title().catch(() => '');
    const denialMessage = this.page.getByText(/you don.t have permission to access/i);

    if (/^\s*access denied\s*$/i.test(title) || (await denialMessage.count()) > 0) {
      throw new BotProtectionError(
        `Four Seasons bot protection blocked the browser at ${this.page.url()}. Run the test headed locally and retry.`,
      );
    }
  }
}
