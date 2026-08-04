# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

<!-- Web app built on Next.js, served both as a normal website and inside the
LINE in-app browser via LIFF. Mobile web remains `web`. -->

## Users

Two primary audiences, weighted equally (confirmed with the owner):

- **Cafe customers** — people who open the site to order delivery and/or to
  browse the cafe. Two entry situations both matter: (a) arriving from the
  shop's LINE Official Account (rich menu / LINE chat) into the in-app browser
  to place a delivery order within the delivery radius, and (b) general web
  visitors who look at the menu, events, and gallery and decide from there.
- **Shop admin / staff** — run the business from the `/admin` backoffice:
  orders, menu, settings, events, promotions.

## Product Purpose

The official web presence of **Love Pier Beach Cafe**, doing two equally
important jobs (confirmed with the owner):

1. **Take delivery orders end to end** through a guided, LINE-integrated order
   wizard, from login to a verified payment.
2. **Promote the cafe** — menu, events, gallery, reservations, about — to
   visitors.

A staff-facing admin backoffice exists to operate both.

## Positioning

The delivery journey is a single guided full-screen wizard that lives inside
LINE: LINE (LIFF) login → GPS distance / radius check → menu → order summary →
PromptPay QR → automatic slip verification → LINE Flex confirmation. The parts a
neighboring cafe site could not trivially copy are the payment-clearing details:
an exact SCB "แม่มณี" (Mae Manee) **Bill Payment** QR built to the shop's
registered fixed values (biller id, Ref.1, Ref.2, terminal label) and **SlipOK**
auto-verification with a masked-biller fallback, all wired to LINE OA push
messages. Payment provably clears to the real shop account, not a generic
PromptPay transfer.

## Operating Context

- Customers typically arrive from the LINE OA **rich menu** into LINE's in-app
  browser. During the order steps the site's own nav/footer are hidden for an
  app-like full-screen flow.
- The flow does a **GPS distance / delivery-radius** check up front; customers
  outside the radius must explicitly acknowledge before continuing.
- Payment is by **PromptPay QR + uploaded slip**; the customer also gets a public
  order-status page and LINE Flex cards (order received, payment confirmed).
- **Admin** runs orders (with a pending badge), menu, settings (distance method,
  shop coords, radius, delivery fee, SlipOK keys), events, and promotions from
  `/admin`.
- Menu is maintained two ways: manual single-item add, and **bulk import from an
  Excel file** with photos matched to items by filename.

## Capabilities and Constraints

Confirmed capabilities (from the codebase):

- Guided delivery order wizard (`components/delivery/OrderFlow.js`).
- Server-authoritative delivery fee and distance — recomputed server-side and
  never trusted from the client.
- PromptPay **Bill Payment** QR to biller `010554511741402` with fixed
  Ref.1=`REF001`, Ref.2=`0`, terminal label — matched to the shop's physical QR.
- **SlipOK** automatic slip verification (with a Ref.1 / masked-biller fallback).
- LINE **LIFF** login + Flex order/payment cards + OA push messaging.
- Events (upcoming/past split, detail page, gallery), reservation, gallery,
  about, promotions.
- Admin backoffice: orders, menu (manual + Excel bulk import with photo
  matching), settings, events, promotions.
- **Tri-lingual data model** (Thai / English / Chinese) on menu items.
- Menu **bulk import**: an Excel `menu` sheet (19 columns) → preview diff →
  transactional upsert by `import_code` → photos matched by filename and resized
  with sharp. Incomplete rows are parked (planned / unavailable), not rejected.

Technical constraints future work must respect:

- `NEXT_PUBLIC_*` env vars are inlined at **build time** — setting them in Vercel
  requires a rebuild to take effect.
- DB migrations are **hand-written idempotent SQL** under
  `love-pier-main/lib/db/migrations/manual/` because the drizzle snapshot has
  drifted (several tables were created via `db:push`), so `drizzle-kit generate`
  is unusable.
- The runnable app lives in `love-pier-main/`; Vercel builds it via a custom
  command from the repo root.

## Brand Commitments

*(Derived from the current implementation — the owner did not re-confirm these
as binding during init. Treat as evidence of the incumbent identity, to be
confirmed or changed later, not as fixed law.)*

- Name **Love Pier Beach Cafe**; LINE OA **@lovepier.cafe**.
- **Thai-first**, with English and Chinese as secondary languages.
- Warm palette in use: espresso `#3a2818`, gold `#c9a96e` (used only on dark
  backgrounds — fails contrast on white), deep brown `#4a3520`, cream `#f5f3ef`
  background.
- Recent direction has **removed decorative emoji** from customer-facing LINE
  cards and the order-status page.

## Evidence on Hand

- **Real menu:** 233 items across 10 categories already imported into the
  production DB (currently hidden from customers). Source template lives at
  `lovep/` (gitignored, not in the repo).
- **Real verified payments:** genuine production payments have been confirmed end
  to end (PromptPay QR + SlipOK + LINE push), per the project state log.
- Real identifiers: LINE OA `@lovepier.cafe`, PromptPay biller
  `010554511741402`.
- **Absences future work must not fabricate:** no testimonials, press, pricing
  claims, or benchmarks beyond the actual menu; Chinese menu names are currently
  blank (seeded equal to English) and must not be invented.

## Product Principles

1. **Delivery and storefront carry equal weight.** Neither the ordering flow nor
   the menu/events presence is subordinate to the other.
2. **The server owns money.** Delivery fee and payment verification are computed
   and verified server-side; a client-sent amount is never trusted.
3. **Meet the customer inside LINE.** The ordering journey assumes a LINE-native,
   in-app-browser, app-like full-screen experience.
4. **Payment must actually clear to the real shop account.** Exact biller / ref
   matching beats generic PromptPay convenience.
5. **The menu is managed at scale.** Bulk import with idempotent upserts;
   incomplete rows are parked and reported, never silently dropped or rejected.

## Accessibility & Inclusion

Thai is the primary interface language, with English and Chinese available. No
further product-specific accessibility standard has been established with the
owner yet.
