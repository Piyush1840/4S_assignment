import { expect, test } from '@playwright/test';
import { ASSESSMENT } from '../src/data/assessment';
import { CartPage } from '../src/pages/CartPage';
import { FindHotelPage } from '../src/pages/FindHotelPage';
import { PropertyPage } from '../src/pages/PropertyPage';
import { RoomSelectionPage } from '../src/pages/RoomSelectionPage';
import { futureStayRequest } from '../src/utils/date';

const property = ASSESSMENT.property;

test.describe('Four Seasons technical assessment', () => {
  test('books a future Cabo Del Sol room and verifies the selected room and pricing in the cart', async ({
    page,
  }) => {
    const findHotelPage = new FindHotelPage(page);
    const propertyPage = new PropertyPage(page);
    const roomSelectionPage = new RoomSelectionPage(page);
    const cartPage = new CartPage(page);
    const stayRequest = futureStayRequest(
      ASSESSMENT.stay.daysInFuture,
      ASSESSMENT.stay.nights,
      ASSESSMENT.stay.availabilitySearchDays,
    );

    await test.step('a) Navigate to Find a Hotel or Resort', async () => {
      await findHotelPage.open();
    });

    await test.step(`b) Select ${property.listingName}`, async () => {
      await findHotelPage.selectProperty(property);
      await propertyPage.expectLoaded(property);
    });

    const stay = await test.step('c) Use availability and check rates for a future date', async () => {
      const selectedStay = await propertyPage.checkRates(stayRequest);
      await roomSelectionPage.expectResults(property, selectedStay);
      return selectedStay;
    });

    expect(stay.checkIn.getTime(), 'Check-in should be in the future').toBeGreaterThan(Date.now());

    const selection = await test.step('d) Add an available room to the cart', async () => {
      return roomSelectionPage.addFirstAvailableRoomToCart(property);
    });

    await test.step('e) Click the cart icon', async () => {
      await cartPage.open();
    });

    await test.step('f) Verify the selected room is displayed with correct pricing', async () => {
      await cartPage.verifySelection(property, selection);
    });
  });
});
