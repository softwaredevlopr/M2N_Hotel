# Architecture Decision Records (ADR)

> **Purpose:** Store important architectural and technical decisions for the
> **M2N Hotels** project — the *what*, the *why*, and the *trade-offs* — so future
> contributors (and AI assistants) understand how the project got here.
>
> **Related:** [`../../AGENTS.md`](../../AGENTS.md) · [`../02_ARCHITECTURE.md`](../02_ARCHITECTURE.md) · [`../../PROJECT_DOCS.md`](../../PROJECT_DOCS.md) · [`../13_ROADMAP.md`](../13_ROADMAP.md)

### Phase label map (docs refresh 2026-07-14)

Older ADRs may use an **admin-only** phase sequence. Prefer product roadmap labels:

| Older label | Product roadmap |
|-------------|-----------------|
| Public multi-hotel site | Phase 1 |
| Booking inquiry | Phase 2 |
| Admin auth “Phase 1” + admin UI “Phase 2” | **Phase 3** |
| Hotel CRUD “Phase 3” | **Phase 4** |
| Room types “Phase 4” | **Phase 5** |
| Rooms “Phase 5” | **Phase 6** |
| Media “Phase 7” | **Phase 7** |

---

## Table of Contents

- [How to Use This File](#how-to-use-this-file)
- [ADR Template](#adr-template)
- [Decision Log](#decision-log)
  - [ADR-0001 — Separate `frontend/` and `backend/` folders](#adr-0001--separate-frontend-and-backend-folders)
  - [ADR-0002 — Slug-based multi-hotel routing](#adr-0002--slug-based-multi-hotel-routing)
  - [ADR-0003 — Hotel-wise image folders with slug → folder mapping](#adr-0003--hotel-wise-image-folders-with-slug--folder-mapping)
  - [ADR-0004 — Reusable InquiryForm reusing the existing inquiries API](#adr-0004--reusable-inquiryform-reusing-the-existing-inquiries-api)
  - [ADR-0005 — Production launch hardening (SEO, security, a11y, performance)](#adr-0005--production-launch-hardening-seo-security-a11y-performance)
  - [ADR-0006 — Premium hotel detail redesign with "On Request" for unconfirmed rates](#adr-0006--premium-hotel-detail-redesign-with-on-request-for-unconfirmed-rates)

---

## How to Use This File

- Add a new ADR whenever a decision meaningfully affects architecture, structure,
  data, or long-term direction.
- Never rewrite history: once an ADR is **Accepted**, don't edit its intent. If it
  changes, add a **new** ADR and mark the old one **Superseded** (link both ways).
- Number ADRs sequentially (`ADR-0001`, `ADR-0002`, …).
- Status values: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.

## ADR Template

```
### ADR-XXXX — <short title>

- **Status:** Proposed | Accepted | Superseded | Deprecated
- **Date:** YYYY-MM-DD
- **Deciders:** <who>

**Context**
What problem/force led to this decision?

**Decision**
What was decided.

**Consequences**
Positive, negative, and trade-offs. Follow-ups if any.

**Alternatives considered**
Other options and why they were not chosen.
```

---

## Decision Log

> The entries below capture decisions already visible in the codebase/docs. Fill in
> unknown fields (dates, deciders) as they are confirmed — do not invent them.

### ADR-0001 — Separate `frontend/` and `backend/` folders

- **Status:** Accepted
- **Date:** _TODO_
- **Deciders:** _TODO_

**Context**
The project needs a web UI and an API/data layer that can evolve and deploy
independently.

**Decision**
Keep the app split into `frontend/` (Next.js) and `backend/` (Node.js + Express)
within a single repository.

**Consequences**
- Independent development, testing, and deployment of each tier.
- Requires a configured base URL between tiers (`NEXT_PUBLIC_API_URL`).

**Alternatives considered**
- Single full-stack app. Not chosen: TODO (document rationale).

### ADR-0002 — Slug-based multi-hotel routing

- **Status:** Accepted
- **Date:** _TODO_
- **Deciders:** _TODO_

**Context**
The product is moving from a single hotel to multiple hotels (and ultimately a
multi-tenant SaaS) served from one codebase.

**Decision**
Identify each hotel by a unique, stable **slug** and render hotel detail pages at
`/hotels/[slug]`.

**Consequences**
- Clean, shareable per-hotel URLs.
- Slugs become a stable contract used across routing, data, and image mapping —
  changing a slug is a breaking change (see [`../../AGENTS.md`](../../AGENTS.md)).

**Alternatives considered**
- Numeric IDs in URLs. Not chosen: TODO (document rationale).

### ADR-0003 — Hotel-wise image folders with slug → folder mapping

- **Status:** Accepted
- **Date:** _TODO_
- **Deciders:** _TODO_

**Context**
Each hotel must show only its own photos; hotels must never share imagery.

**Decision**
Store photos under `frontend/public/Photos/<Hotel>/<Category>/` and resolve images
strictly via a slug → folder mapping. Empty categories are skipped safely.

**Consequences**
- Strong isolation of hotel imagery; no cross-hotel leakage.
- Adding a hotel requires creating its photo folder and registering the mapping.

**Alternatives considered**
- Flat/global image list. Not chosen: caused cross-hotel mixing and stale
  references.

### ADR-0004 — Reusable InquiryForm reusing the existing inquiries API

- **Status:** Accepted
- **Date:** _TODO_
- **Deciders:** _TODO_

**Context**
The booking inquiry feature needed a UI. The backend already had a
`POST /api/inquiries` endpoint, validation middleware, and an `inquiries` table.

**Decision**
Build a single reusable client component `InquiryForm` that submits to the
existing endpoint. Render it on the hotel detail page via `ContactCTA` (only when
a hotel is present), and pass the hotel's `roomTypes` for the Room Type dropdown.
The component accepts `hotelSlug`, `hotelName`, `roomTypes`, and
`defaultRoomTypeSlug` so it can be reused on future room pages.

**Consequences**
- No backend or schema changes required; existing validation is the source of truth.
- One form implementation shared across hotel and (future) room pages.
- The homepage brand CTA remains form-free (no hotel slug context).

**Alternatives considered**
- Separate bespoke forms per page. Not chosen: duplication and drift.
- New standalone booking section/component. Not chosen: `ContactCTA` is already the
  "Reserve Your Stay" anchor (`#contact`) that existing buttons point to.

### ADR-0005 — Production launch hardening (SEO, security, a11y, performance)

- **Status:** Accepted
- **Date:** _TODO_
- **Deciders:** _TODO_

**Context**
The site reached ~95% completion and needed production-quality polish without
schema changes, API breakage, or design regressions.

**Decision**
- **SEO:** Use Next.js metadata APIs — root `metadata`/`viewport`, per-hotel
  `generateMetadata`, and file-based `robots.js`, `sitemap.js`, `manifest.js`.
  A configurable `SITE_URL` (`NEXT_PUBLIC_SITE_URL`) drives `metadataBase`,
  canonicals, and the sitemap.
- **Security:** Add `helmet`, tighten CORS, add body-size limits, and add rate
  limiting (general `/api` + stricter `POST /api/inquiries`); enable `trust proxy`
  in production. Reuse existing validation; keep hiding stack traces in prod.
- **Accessibility:** ARIA live regions, `aria-busy`, focus-visible rings, and
  richer alt text.
- **Performance:** Native `loading="lazy"`/`decoding="async"` on below-the-fold
  images and an `AbortController` timeout for server-side API calls.

**Consequences**
- No DB schema changes; `/`, `/health`, existing APIs, and localhost preserved.
- New backend dependencies: `helmet`, `express-rate-limit`.
- `<img>` → `next/image` migration intentionally deferred (tracked in `TODO.md`)
  to avoid layout regressions late in the cycle.

**Alternatives considered**
- Full `next/image` migration now. Deferred: higher regression risk for marginal
  additional gain given static public assets.
- Third-party SEO libraries. Not chosen: native Next.js metadata is sufficient.

---

### ADR-0006 — Premium hotel detail redesign with "On Request" for unconfirmed rates

- **Status:** Accepted
- **Date:** 2026-07-10
- **Deciders:** _TODO_

**Context**
Both hotel detail pages needed a premium/luxury presentation: larger room cards,
a professional meal-plan tariff (Single/Double occupancy), a Couple Package
(Zaarang ₹999), a facilities grid, a large gallery, a correct map, and a sticky
Book Now CTA. However, the official meal-plan matrix rates and the exact ₹999
package inclusions were not available in the repo, and project rules forbid
inventing/placeholder pricing.

**Decision**
- Rebuild the frontend UX/UI only (no backend/API/DB/schema changes) and keep the
  existing brand palette, logo, and header.
- Extend `lib/tariffs.js` with a hotel-level meal-plan matrix, per-room amenities,
  a couple package, and a numeric extra-bed rate — all API/DB-ready.
- Render any rate that is not officially confirmed as **"On Request"** rather than
  a placeholder number. Ship the full professional layout so real values can be
  dropped in later without UI changes.
- Add a client `GalleryGrid` (lightbox) and `StickyBookCTA` for interactivity;
  keep image resolution server-side via `lib/images.js`.

**Consequences**
- Honest pricing: no fabricated tariff numbers on a live site.
- The Zaarang meal-plan matrix currently shows "On Request" until the official
  tariff card values and couple-package inclusions are provided (tracked in
  `TODO.md`).
- No schema/API change; build passes; existing routes/behaviour preserved.

**Alternatives considered**
- Inventing/estimating meal-plan rates. Rejected: violates the "do not invent the
  rate" / "no placeholder pricing" rules.
- Leaving the old compact tariff. Rejected: does not meet the requested
  professional tariff layout with occupancy columns and a couple package.

**Update (2026-07-10)**
- The owner supplied Zaarang's official room starting prices and the full
  meal-plan matrix, plus the ₹999 Couple / Get Together Package (3 Hours + food
  inclusions) for BOTH hotels, and confirmed Extra Bed ₹400 / GST 5% Extra /
  Check-in 12 PM / Check-out 11 AM. These real values are now in `lib/tariffs.js`.
  Aurelia Grand still shows "Contact for Tariff" for room/meal rates (identical
  layout/structure) until its official rates are provided.
- Facilities are now a curated brand-wide frontend list (`lib/facilities.js`)
  rendered with icons, replacing the DB-driven amenities list on hotel pages (no
  backend/schema change). Smooth reveals added via a `Reveal` component.

**Update (2026-07-11) — Tariff section: no room-card prices, shared matrix, no couple card**
- Owner decision: the room-card prices (₹999 / ₹1,999 / ₹2,999) must not be
  repeated inside the Tariff & Meal Plans section, and the ₹999 Couple / Get
  Together Package card is removed from that section (it stays on the Standard
  room card). `couplePackage` data + `normalizeCouplePackage` and the couple block
  in `RoomTariff` were removed.
- Both hotels now share one official meal-plan matrix (`SHARED_MEAL_PLANS`) so the
  section is consistent; Aurelia no longer shows "Contact for Tariff" here.
- Meal-plan cells may carry a text note (`singleNote`/`doubleNote`) instead of a
  price. The Single/Breakfast rate coincides with a room-card price, so it is
  shown as **"Available with room plan"** rather than repeating the number (no
  invented price, no "Contact for Tariff"). A shared disclaimer is shown under the
  matrix; check-in/out stay in the policy strip only (not duplicated). No
  backend/API/DB/schema change.

**Update (2026-07-11) — Zaarang Inn mirrors Aurelia layout with own data**
- Hotel Zaarang Inn room cards and tariff section now use the same shared
  `FeaturedRooms` / `RoomTariff` presentation as Aurelia Grand. Standard is the
  ₹999 Couple / Get Together Package (Zaarang-specific Queen bed + food list);
  Deluxe ₹1,999 and Suite ₹2,999 keep previously approved Zaarang details (no
  invented rates). `ZAARANG_MEAL_PLANS` holds official Zaarang meal rates
  (including Breakfast Single ₹1,999 and All Meals Double "Available with room
  plan"). Couple Package is not repeated in the tariff section. Facility label
  variants for Zaarang via `getHotelFacilities`; Aurelia facility wording and
  Aurelia tariff/room data unchanged. No backend/API/DB/schema change.

**Update (2026-07-10) — Aurelia room-card presentation overrides**
- `lib/tariffs.js` gained per-room `bedType` and structured `foodPlan`
  (label + items + note) overrides so a card can present a corrected bed type or
  a benefit-style food plan without touching the database. Applied to Aurelia:
  Deluxe/Suite show **Duration: 1 Day**; the Suite's DB bed type "King + Sofa Bed"
  is displayed as **King** via `bedType` (DB row left unchanged — no schema/API
  change), and its official **Complimentary Meals — 3 Times** benefit is shown as
  a Food Plan with the note that the daily menu is chosen by hotel management (no
  dishes invented).
- `FeaturedRooms` now renders Duration in the info row and **omits the Room Size
  slot when no verified size exists** (so Aurelia no longer shows a dash-only
  field). Rooms without a duration (all Zaarang rooms) keep their existing Room
  Size slot, so Zaarang cards are unchanged.

---

### ADR-0007 — Phase 1 admin authentication with JWT + admin_users

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** _TODO_

**Context**
The project needs a secure admin login foundation before an admin dashboard.
Inquiry APIs and the public hotel site must remain unchanged. Schema changes
require a new migration (not editing `001_initial_schema.sql`).

**Decision**
- Add `admin_users` via migration `002_admin_users.sql` (bcrypt `password_hash`,
  roles `super_admin` / `hotel_admin`, unique email).
- Issue JWT access tokens on `POST /api/admin/auth/login`; protect future admin
  routes with `requireAdminAuth` Bearer middleware; expose `GET /api/admin/auth/me`.
- Seed the first super admin via `npm run seed:admin` using env vars only
  (`ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) — never hardcode secrets.
- Hotel-scoped `hotel_admin` assignments can be added in a later migration without
  changing the login contract.

**Consequences**
- Admin frontend still pending; backend auth is ready for protected routes.
- Operators must set `JWT_SECRET` (and admin seed vars) in `backend/.env`.

**Alternatives considered**
- Session cookies. Deferred — JWT Bearer is simpler for a future SPA admin app.
- Editing `001_initial_schema.sql`. Rejected — migrations are append-only.

**Update (2026-07-12) — Phase 3 admin hotel CRUD**
- Public `GET /api/hotels` and `GET /api/hotels/:slug` contracts left unchanged.
  Write operations required new JWT-protected routes under `/api/admin/hotels`
  (list/create/get/update/delete) because no hotel write APIs existed.
- Admin UI: `/admin/hotels`, `/new`, `/[id]`, `/[id]/edit` — form fields map only
  to columns on the existing `hotels` table.

### ADR-0008 — Phase 4 room type featured flag via metadata (no schema change)

**Date:** 2026-07-14

**Status:** Accepted

**Context**
Admin room-type management needs a Featured toggle, but `room_types` has no
`is_featured` column. Schema changes require explicit approval.

**Decision**
- Persist featured as `metadata.is_featured` on the existing JSONB `metadata`
  column. API responses expose a derived `is_featured` boolean for the admin UI.
- Add JWT CRUD under `/api/admin/room-types` without changing public
  `GET /api/rooms/types` contracts or the public website.

**Consequences**
- Featured works without a migration. Public/read APIs that ignore `metadata`
  remain unaffected.

**Alternatives considered**
- Adding `is_featured BOOLEAN` column. Rejected until schema change is approved.

### ADR-0009 — Phase 5 rooms activate/deactivate via inventory status

**Date:** 2026-07-14

**Status:** Accepted

**Context**
Admin rooms management needs Activate/Deactivate, but `rooms.status` only allows
`available`, `occupied`, `maintenance`, `blocked`, `out_of_service` — there is no
`active`/`inactive` column.

**Decision**
- Activate sets `status = available`; Deactivate sets `status = out_of_service`.
- Full status select remains available on create/edit forms.
- JWT CRUD under `/api/admin/rooms`; public room GETs unchanged.

**Consequences**
- No schema change. Operators can still set occupied/maintenance/blocked via the form.

**Alternatives considered**
- Adding an `is_active` boolean. Rejected — violates no-schema-change rule.

### ADR-0010 — Phase 7 media categories via URL path (no schema change)

**Date:** 2026-07-14

**Status:** Accepted

**Context**
Admin hotel media needs category filters (Hero, Gallery, Room, Restaurant,
Exterior, Lobby, Amenities), but `hotel_media` has no category column.

**Decision**
- Encode category in the upload URL path:
  `/uploads/hotels/{hotelId}/{Category}/{filename}`.
- Expose derived `category` on admin API responses; filter with URL `ILIKE`.
- Featured image uses existing `is_cover`.
- JWT CRUD + multipart upload under `/api/admin/media`; static files at `/uploads`.

**Consequences**
- No migration. Seed/legacy URLs without a category path segment show `category: null`
  until re-uploaded or edited with a category rewrite.

**Alternatives considered**
- Adding a `category` column. Rejected until schema change is approved.
- Storing category in caption/alt_text. Rejected — pollutes public display fields.

### ADR-0011 — Phase 8 API-first public data with filesystem media fallback

**Date:** 2026-08-02

**Status:** Accepted

**Context**
Phase 8 requires public hotel pages to use existing read APIs without backend contract
or schema changes. Seed `hotel_media` rows still reference deleted flat `/public`
paths, while real photography lives under `Photos/` and admin uploads under `/uploads`.

**Decision**
- Resolve hero, gallery, and card images from `GET /api/hotels/:slug` `media[]` first
  (prefix `/uploads/` with `NEXT_PUBLIC_API_URL`; infer category from upload path).
- Fall back to slug-mapped `public/Photos/` folders when API media is empty or URLs
  are not resolvable locally.
- Amenities from API `hotel.amenities`; slug-keyed static lists only when API returns none.
- Room cards use API room types; prices/packages prefer `base_price` / `metadata`, then
  `lib/tariffs.js` until Phase 9 adds rate APIs.
- Policies and maps directions read `hotel.metadata` when present; legacy slug maps kept
  as fallback only.

**Consequences**
- No backend changes. UI unchanged; data source is dynamic.
- Meal-plan matrix remains in `tariffs.js` (Phase 9 scope).

**Alternatives considered**
- Filesystem-only or API-only media. Rejected — breaks either admin uploads or current seed.

### ADR-0012 — Phase 9 `tariff_rates` table for meal-plan matrix

**Date:** 2026-08-02

**Status:** Accepted

**Context**
Phase 9 requires admin-managed rates with meal plans, occupancy, seasonal windows,
and active/inactive status. Room-card package presentation remains partially in
`lib/tariffs.js` until a later migration.

**Decision**
- Add `tariff_rates` table (migration `003`) linked to `hotels` and optional `room_type_id`.
- Public read: `GET /api/tariffs?hotel_slug=` builds the meal-plan matrix; cells without
  price use `display_note` or default **“Available with room plan”**.
- Hotel-level disclaimer/policies in `hotels.metadata.tariff_settings`.
- Admin JWT CRUD under `/api/admin/tariffs`.

**Consequences**
- Existing public hotel/room/inquiry APIs unchanged.
- Seed populates official matrix rows for Aurelia Grand and Zaarang Inn.

### ADR-0013 — Hotel media may never be stock imagery or borrowed from another property

**Date:** 2026-08-02

**Status:** Accepted (refines [ADR-0011](#adr-0011--phase-8-api-first-media-with-filesystem-fallback))

**Context**
ADR-0011 made media resolution API-first, and `isResolvableMediaUrl()` accepted any
absolute `http(s)` URL as valid. Hotel Zaarang Inn's seeded `hotel_media` still held
four `images.unsplash.com` placeholders from before it had a photo shoot, so those
stock images outranked its real `Photos/Zaarang-Inn/**` photography on the public
page. Separately, the hotel-level fallback chain ended at `firstAvailableBrandImage()`,
which scans *all* hotel folders — a latent path for one property to display another's
photos, violating the hard image rule in [`AGENTS.md`](../../AGENTS.md) §8.

**Decision**
- Remote stock/demo hosts (Unsplash, placehold.co, picsum, dummyimage, …) are never
  valid hotel media. `isResolvableMediaUrl()` rejects them, so such rows can never
  render even if they remain in the database.
- Seeded media must reference the hotel's own `/Photos/<Folder>/<Category>/` files.
  The category segment of the path — not caption keywords — drives placement.
- Once a hotel is known, the fallback chain stays inside that hotel's own folder.
  The brand-wide fallback is reserved for hotel-less contexts such as the homepage hero.
- `getActiveHotelMedia()` normalises to exactly one cover, so a single hero is selected
  and every other active image flows to the gallery by `sort_order`.

**Consequences**
- No schema change; corrections are data-only and non-destructive (stale rows are set
  to `inactive`, never deleted, and no image file is touched).
- A hotel with no photography of its own renders the neutral remote backup rather than
  a real photo of a different property.

**Alternatives considered**
- Deleting the placeholder rows. Rejected — destructive, and it would not stop new
  stock URLs from being introduced later.
- Filesystem-only resolution. Rejected — it would disable admin media uploads.

### ADR-0014 — Phase 10A booking availability is derived, not stored

**Date:** 2026-08-02

**Status:** Accepted

**Context**
Phase 10A adds direct reservations. The schema has `rooms` (physical inventory)
but no per-room, per-date allotment or calendar table. Availability has to be
answered from what exists without inventing columns, and two guests booking the
last room at the same moment must not both succeed.

**Decision**
- No availability/allotment table. Sellable inventory is the count of `rooms` for
  the room type whose status is `available` or `occupied`; `occupied` stays
  sellable because it describes today, not a future date range.
- Committed inventory is the **busiest single night** across the requested stay,
  computed with `generate_series` over the date range. Summing overlapping
  reservations was rejected: two bookings can each overlap the request without
  overlapping each other, which would refuse genuinely available rooms.
- Nights are half-open — `check_in <= night < check_out` — so the checkout date is
  immediately resellable.
- Only `pending`, `confirmed` and `checked_in` hold inventory. Cancelling or
  marking a no-show releases it automatically.
- Writes run in one transaction that first takes `pg_advisory_xact_lock` on
  `(hotel_id, room_type_id)` and locks the room rows `FOR SHARE`. The advisory
  lock is the real serialiser: row locks alone would protect nothing for a room
  type with zero rows, and two concurrent readers can both hold `FOR SHARE`.
- A specific room is **not** auto-allocated on create. With no per-room date
  blocking in the schema, allocation is an explicit admin action, and because the
  table carries a single `room_id` it is limited to single-room reservations.
- Public pricing is derived server-side from `room_types.base_price`; guest
  supplied amounts are ignored. A base price of `0` means "on request" and leaves
  totals at zero, consistent with the project's no-placeholder-pricing rule.

**Consequences**
- Correct for the common case with no schema growth, and inventory is always
  consistent with the reservations that exist.
- Concurrency is serialised per hotel + room type, so unrelated properties and
  room types never block each other.
- Verified by `npm run test:bookings`, which fires four simultaneous
  full-inventory requests and asserts exactly one is accepted.
- Per-room date-level allotment, stop-sells and overbooking allowances are
  deferred to Phase 10B.

**Alternatives considered**
- A per-date inventory table. Rejected for now — it is Phase 10B scope and would
  need approval for a second new table.
- `SERIALIZABLE` isolation. Rejected — it would surface retryable serialisation
  failures to callers across the whole request, for no gain over a targeted lock.

### ADR-0015 — Phase 10B guest booking UI: one price source, server-resolved images, tab-scoped lookup

**Date:** 2026-08-03

**Status:** Accepted

**Context**
Phase 10B adds the public reservation journey over the Phase 10A APIs, with no
schema change, no new endpoint and no admin change. Three questions had to be
settled: what price the guest is shown, how the flow gets hotel imagery into
interactive components, and how the confirmation page satisfies the lookup
endpoint's contact check.

**Decision**
- **One pricing source.** The stay summary computes `base_price × nights ×
  rooms` with no tax component — byte-for-byte the server's
  `buildIndicativeAmounts`. The booking page and the confirmation page therefore
  never disagree. Where `base_price` is `0` the summary says "Price on request"
  and quotes the lowest published Phase 9 tariff rate as *guidance only*, clearly
  separated from the total.
- **Images resolve on the server.** `lib/images.js` reads the photo folders via
  `node:fs`, so importing it from a client component breaks the build. `/book`
  resolves every hotel and room-type image and passes plain URLs down. Hotel
  scoping is unchanged: each property still draws only from its own folder.
- **Tab-scoped lookup contact.** After a booking is created, the guest's email and
  phone go into `sessionStorage` so `/booking/[bookingNumber]` can call the
  contact-verified lookup immediately. On a fresh tab the page asks for the
  contact instead, which doubles as a "find my booking" screen.
- **Availability is validated twice.** A client guard rejects room counts above
  the property's sellable inventory before submitting; the API's `409` remains
  the authority and returns the guest to the stay step with the server's message.
- **Occupancy is advisory.** Exceeding `max_occupancy` shows a notice rather than
  blocking, because the backend accepts it and the property can add bedding.

**Consequences**
- Quotes are honest and self-consistent, but they stay at "on request" until an
  admin sets `room_types.base_price` — every seeded room type is currently `0`.
  This is a data task in the existing Admin → Room Types screen, not a code
  change.
- Client validation duplicates backend limits, so the two must be changed
  together; `lib/bookingPricing.js` names the backend files it mirrors.
- Putting the contact in the URL was rejected: it would leak the guest's email
  through browser history, referrer headers and server logs.
- Phase 10B was narrowed to the guest journey, so the per-date allotment,
  stop-sell and overbooking work that [ADR-0014](#adr-0014--phase-10a-booking-availability-is-derived-not-stored)
  defers to "Phase 10B" is now **Phase 10C**, together with the admin bookings
  console. ADR-0014's availability model itself is unchanged.

**Alternatives considered**
- Pricing the stay from the Phase 9 tariff matrix. Rejected — the booking record
  would still be written from `base_price`, so the guest would see one number on
  the booking page and a different one on the confirmation.
- Passing the created booking through client state instead of re-fetching.
  Rejected — it breaks on refresh and on a shared link, and it would let the page
  render data the lookup endpoint had not verified.
- Extending the backend to price from `tariff_rates`. Deferred — it changes
  Phase 10A behaviour and its test expectations, and needs a meal-plan choice in
  the booking model.

### ADR-0016 — Homepage brand hero is brand media, never hotel photography

**Date:** 2026-08-04

**Status:** Accepted

**Context**
Phase 8 wired the homepage `BrandHero` through `resolveBrandHeroImage(hotels)`,
which preferred the featured hotel's hero (then Lobby/Reception/Exterior across
properties). That made the M2N brand landing page look like a single property
and violated the separation between brand surfaces and hotel detail media.

**Decision**
- Homepage `/` uses only `/brand-hero.jpg` (`BRAND_HERO_IMAGE` in `lib/brand.js`).
- `resolveBrandHeroImage` ignores hotel lists and returns that brand asset
  (remote backup only if the file is missing).
- Hotel photography continues to resolve via `resolveHeroImage` /
  `resolveCardImage` / gallery helpers on `/hotels/[slug]` and on homepage
  hotel cards — never as the brand hero background.
- Hotel detail pages and Zaarang Inn media helpers were not changed for this fix.

**Consequences**
- Brand and property imagery stay visually and architecturally separate.
- Replaces the Phase 8 “homepage from featured hotel” behaviour recorded in the
  roadmap; that line is corrected to brand-hero-only.

**Alternatives considered**
- Keep featured-hotel hero for “editorial” feel. Rejected — product requirement
  is an M2N brand hero; hotel photos belong on hotel pages.

### ADR-0017 — Brand hero asset must not be hotel or stock resort photography

**Date:** 2026-08-04

**Status:** Accepted

**Context**
After ADR-0016 stopped the homepage from selecting featured-hotel media, the
rendered CSS still used `url(/brand-hero.jpg)`. Tracing the live HTML confirmed
that path. Inspecting the file showed it was a PNG (misnamed `.jpg`) of a
coastal resort with an infinity pool — not byte-identical to Zaarang’s real
`/Photos/Zaarang-Inn/Exterior/*` street photos, but visually hotel/stock exterior
media. Guests (and the product owner) correctly rejected it as a brand hero.

**Decision**
- Delete `frontend/public/brand-hero.jpg`.
- Homepage `BrandHero` uses brand atmosphere (ink/gold gradients) plus the
  existing `/m2n-logo-tagline.png` mark — no photographic background.
- Homepage `ContactCTA` with `hotel=null` uses the same brand atmosphere rule.
- Hotel detail pages continue to use `resolveHeroImage(hotel)` and their own
  `/Photos/<Hotel>/…` assets unchanged.
- `resolveBrandHeroImage` returns the brand mark path only; it must never return
  `/Photos/…` or Unsplash.

**Consequences**
- Homepage hero can no longer regress to hotel photography via a misnamed asset.
- Brand and property surfaces stay separated at both the code and file layers.

**Alternatives considered**
- Keep a photographic brand hero and swap in a new photo. Rejected for now —
  no approved brand photograph exists in-repo, and inventing/downloading stock
  is forbidden. The logo mark is the canonical brand asset.

---

*Keep this log append-only. When a decision changes, add a new ADR and link it.*

