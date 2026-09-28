import { errors, expect, type Page } from '@playwright/test';

export class BotProtectionError extends Error {
  override name = 'BotProtectionError';
}

/** Shared site concerns only: transient overlays and bot-block detection. */
export abstract class BasePage {
  private static readonly surveyHandlersInstalled = new WeakSet<Page>();
  private static readonly cookieConsentResolvedPages = new WeakSet<Page>();

  constructor(protected readonly page: Page) {}

  /**
   * Prepare the live site for interaction.
   *
   * The survey is genuinely intermittent, so a locator handler is appropriate.
   * The OneTrust cookie banner is predictable and can change page state when dismissed,
   * so handle it explicitly before opening transient UI such as the stay-date picker.
   */
  protected async prepareSite(): Promise<void> {
    if (!BasePage.surveyHandlersInstalled.has(this.page)) {
      const survey = this.page.locator('.QSIPopOver').first();
      await this.page.addLocatorHandler(survey, async (popover) => {
        await popover.evaluate((element) => element.remove());
      });

      BasePage.surveyHandlersInstalled.add(this.page);
    }

    await this.dismissCookieConsent();
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

  private async dismissCookieConsent(): Promise<void> {
    if (BasePage.cookieConsentResolvedPages.has(this.page)) return;

    const banner = this.page.locator('#onetrust-banner-sdk');

    try {
      await banner.waitFor({ state: 'visible', timeout: 3_000 });
    } catch (error) {
      if (error instanceof errors.TimeoutError) return;
      throw error;
    }

    const acceptCookies = banner.locator('#onetrust-accept-btn-handler');
    await expect(acceptCookies, 'The OneTrust cookie banner should offer an accept action').toBeVisible();
    await acceptCookies.click();
    await expect(banner).toBeHidden();

    BasePage.cookieConsentResolvedPages.add(this.page);
  }
}
