# Four Seasons Web QA Technical Assessment

Playwright + TypeScript automation for the required **Los Cabos (Cabo Del Sol)** booking flow.

## Assessment coverage

| Assessment requirement | Implementation |
| --- | --- |
| 1. Create a web test framework | Playwright Test + TypeScript with focused page objects, typed booking data, reusable date/money utilities, reporting, linting and unit tests |
| 2a. Navigate to `https://www.fourseasons.com/find_a_hotel_or_resort/` | `FindHotelPage.open()` |
| 2b. Select **Los Cabos (Cabo Del Sol)** | `FindHotelPage.selectProperty()` selects the exact `/cabodelsol/` property link |
| 2c. Use availability and check rates for a future day | `PropertyPage.checkRates()` calculates a future date at runtime, handles month paging and can try later dates when the preferred day is unavailable |
| 2d. Add any room to the cart | `RoomSelectionPage.addFirstAvailableRoomToCart()` chooses the first bookable room/rate and handles bed selection when required |
| 2e. Click the cart icon | `CartPage.open()` opens the visible header cart icon |
| 2f. Verify the selected room with correct pricing | The room/rate/bed and rate-card price are captured before adding; the cart must display the same selection and a matching nightly price/currency |
| 3. Include a recording | `npm run record` publishes a successful live WebM and JSON metadata into `recordings/` |
| 4a. Good documentation | This README documents setup, architecture, execution, assumptions and limitations |
| 4b. Example scheduled CI/CD | `.github/workflows/ci.yml` contains a weekday schedule plus manual dispatch |

## Why the price verification is real

The test does **not** merely assert that a price is visible in the cart.

Before clicking **Add to Cart**, the framework captures:

- room name;
- selected bed configuration, when applicable;
- rate plan;
- displayed nightly rate and currency.

After opening the cart, it verifies the same room/rate and parses the cart nightly price. The comparison tolerates only display rounding. For example, a rate card showing `CAD 1,449` may legitimately correspond to a cart value of `CAD 1,448.81`; a whole-unit price change or currency change fails.

## Project structure

```text
.github/workflows/ci.yml   quality gate + scheduled/manual live example
recordings/                successful assessment recording
scripts/record.mjs         promotes video only after a passing live run
src/data/assessment.ts     assessment-specific property and stay data
src/models/booking.ts      booking domain types
src/pages/                 focused page objects for steps a–f
src/utils/                 date, money and text helpers
tests/booking.spec.ts      the assessment scenario, labelled a–f
tests/unit/                fast deterministic utility tests
```

## Setup

Requires Node.js 22+.

```bash
npm install
npx playwright install chromium
```

Dependencies are pinned to exact top-level versions in `package.json`. Running `npm install` will also create a lockfile; committing that generated lockfile is recommended before the final public submission.

## Run

```bash
npm run verify       # typecheck + ESLint + Prettier + unit tests
npm run test:e2e     # live Four Seasons flow
npm run test:headed  # same live flow with the browser visible
npm run test:debug   # Playwright Inspector
npm run record       # passing headed run -> recordings/*.webm + metadata
npm run report       # open the HTML report
```

`BASE_URL` can override `https://www.fourseasons.com` when needed.

## Design decisions

### Dynamic dates

The scenario requests check-in **30 days in the future** and never hard-codes a calendar date. If that preferred date is unavailable, it can scan the next 14 days. Checkout is selected after the requested one-night stay and can move later when the property enforces a minimum stay.

### Duplicate directory and header markup

The live site renders duplicate property links across category sections and multiple responsive header copies. The page objects therefore resolve the currently visible Cabo Del Sol property link and visible header cart control rather than relying on DOM order or assuming duplicated IDs are unique.

### Stable booking locators

Where the booking UI exposes its own hooks, the framework uses them:

- `data-tracking-id="select-bed-options"`
- `data-tracking-id="add-to-cart"`
- `data-cy="rate-card-fees-disclaimer"`
- `data-cy="shopping-cart-item__taxes-and-fees"`

The rest of the flow favors roles and accessible names.

### Production-site resilience

Cookie/survey overlays are handled centrally. An explicit `BotProtectionError` is raised when Four Seasons returns an Access Denied page so a bot block is not misreported as a locator timeout.

## Recording

Run:

```bash
npm run record
```

The script executes the same `tests/booking.spec.ts` assessment scenario in headed recording mode. Only after the test passes does it copy the WebM into:

```text
recordings/cabo-del-sol-booking-flow.webm
```

Commit that successful recording with the final public-repository submission.

## CI/CD example

`.github/workflows/ci.yml` contains:

- a PR / `main` quality gate using `npm install` and `npm run verify`;
- a weekday scheduled live job;
- manual workflow dispatch;
- Playwright artifact upload for reports and failure evidence.

The scheduled live job is opt-in with repository variable `RUN_LIVE_E2E=true`, because a public CI runner may be rejected by production bot protection. The assessment only asks for an example scheduled script, so this keeps the example realistic without pretending external production access is guaranteed.

## Scope

The submission intentionally automates the required Chromium booking/cart scenario. It does not claim unrelated coverage such as multi-room bookings, children, promo codes, cancellation, currency switching or accessibility scanning.

## Final submission checklist

Before sharing the public repository:

1. `npm run verify` passes.
2. `npm run test:headed` passes against the live site.
3. `npm run record` passes and the successful WebM is committed under `recordings/`.
4. If `npm install` generated `package-lock.json`, commit it for reproducible installs.
5. The public repository contains `.github/workflows/ci.yml` and this README.
