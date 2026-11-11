# CLAUDE.md: Quincaillerie system guide

Notes for Claude Code (and any developer).

## What this is

Management system for **one hardware shop** (quincaillerie) in Rubavu, Rwanda. Not multi-tenant. Two sides:
- `src/app/(store)/`: public online store. Customers have no accounts; the cart is in localStorage; orders are placed through the `place_order` database function and tracked with `track_order(code, phone)`.
- `src/app/admin/`: staff area (counter, products, stock, orders, sales, customers and credit, reports, staff, settings).

Roles: `owner`, `manager`, `cashier`, `storekeeper`. The very first auth user becomes owner (trigger). Staff accounts are created by the owner (`src/server/actions/staff.ts`, uses the service role key).

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, next-intl. `params`/`searchParams` are Promises. Middleware is `src/proxy.ts`.

## Code layout: frontend and backend are separate

One Next.js app, three layers. `npm run check:layers` enforces the import rules.

| Layer | Folder | What goes there |
|---|---|---|
| **Frontend** | `src/app/`, `src/components/` | Pages, layouts, UI. Gets data only by calling `src/server/services/*` (in server components) or `src/server/actions/*` (forms and buttons). Never imports `@/server/db` or `@supabase/*`. |
| **Backend** | `src/server/` | Everything that talks to Supabase. `server-only`, never sent to the browser. |
| **Shared** | `src/lib/`, `src/types/`, `src/i18n/` | Pure helpers and types used by both sides (formatting, phone numbers, units, `permissions.ts`, `dates.ts`). No database access. |

Inside `src/server/`:
- `db/`: Supabase clients (`server.ts` as the logged-in user, `admin.ts` service role, `session.ts` for `src/proxy.ts`).
- `auth.ts`: `getStaff`, `requireStaff`, `signIn`, `signOut`.
- `services/<area>.ts`: one file per area (`catalog`, `settings`, `products`, `stock`, `sales`, `orders`, `customers`, `staff`, `reports`). Plain async functions: reads return data, writes return `Result<T>` (`{ ok, data } | { ok: false, error }`). No `FormData`, no `revalidatePath`, no redirects.
- `actions/<area>.ts`: `"use server"` endpoints for the UI. They check the role (`requireStaff`), read and validate `FormData`, call a service, then `revalidatePath`/`redirect`.

New feature checklist: SQL migration (if the rules need the database) -> service function -> server action -> page/component.

Only exception in the browser: `src/lib/supabase-browser.ts`, used for Realtime subscriptions (new-order alert). Do not use it to read or write data.

**Mobile app (planned):** the business rules live in the database functions and RLS listed below, so a mobile app can call Supabase directly (same functions, same security) or a future HTTP API built on `src/server/services`. Keep rules in SQL functions, not in actions, so every client gets them.

## Core rules (do not break these)

- **Stock is stored in the product's base unit** (`products.stock`, numeric). Each `product_units` row is a way to sell it with a `factor` (base units per unit) and its own retail and wholesale price.
- **Stock, cost price, customer balances, and sale totals change only inside database functions**: `complete_sale`, `void_sale`, `stock_in`, `adjust_stock`, `receive_debt_payment`, `place_order`, `set_delivery_fee`, `set_cost_price`. They are `security definer`, check the role, lock rows, and recalculate prices on the server. A trigger (`protect_computed_fields`) blocks direct API edits of `stock`, `cost_price`, and `balance`. Never compute prices in the browser and send them to the database.
- **Delivery fee is set per order by staff** (it depends on the customer's location): `place_order` creates delivery orders with fee 0 and `delivery_fee_set = false`; staff call `set_delivery_fee`, which recalculates `orders.total`. The `orders_protect` trigger blocks direct edits of order amounts and blocks completing a delivery order before its fee is set. `settings.delivery_fee` is no longer used.
- **Every stock change writes a `stock_movements` row** with `stock_after`.
- **Cost price** (per base unit) is set two ways: the owner/manager type the buying price on the product form (`set_cost_price`; the form converts from the unit row it was typed in), and `stock_in` updates it as a weighted average. Each sale stores `cost_total` at the time of sale. Profit = `sales.total - sales.cost_total`.
- **Public store reads views only**: `catalog_products`, `catalog_units`, `public_settings` (no cost prices, no exact stock). The `products` table is staff-only.
- **Cashiers must not see cost or profit.** RLS can't hide columns, so the UI hides them (`canSeeProfit`) and `sales_report` returns `profit: null` for cashiers. Roadmap item: move `cost_price` to a manager-only table or column-privileged view.
- **All user-facing strings** go in `messages/fr.json`, `en.json`, `sw.json`, `rw.json` with identical keys. French is the default. Category names are stored in three languages in the database (`name_fr`, `name_en`, `name_sw`, `name_rw`); product names are entered once by the shop.
- Money is integer RWF (`formatRWF`). Quantities can be decimal (`formatQty`). Phones are `+2507XXXXXXXX` (`normalizeRwandaPhone`).
- Rwanda time is UTC+2 (`startOfTodayKigali` in `src/lib/dates.ts`).

## Status

Stage 1 done: store, cart, checkout (MoMo/Airtel merchant code with transaction ID, or pay on collect), order tracking, counter with multi-unit and wholesale pricing, discounts, credit, receipts (print + WhatsApp), products with units and barcodes, stock in/adjust/count/history, online order handling with live alerts, customers and debt payments, reports, staff, settings.

## Stage 2 roadmap

1. **Suppliers**: `suppliers` table, purchase orders, what the shop owes each supplier, supplier payments, price history. Replace the free-text `stock_movements.supplier`.
2. **Expenses**: rent, salaries, transport, electricity; include in a net profit report.
3. **Cash drawer sessions**: open/close shift per cashier with counted cash vs expected cash.
4. **Split payments** at the counter (part cash, part MoMo). `complete_sale` currently takes one payment; extend `p_payment` to an array.
5. **Price change history** and bulk price update by category.
6. **Reports**: by category, by cashier, slow-moving products, export to Excel/PDF.
7. **Hide cost prices from cashiers at the database level** (see rules above).
8. **Automatic MoMo payment prompts** (MTN MoMo Collection API / Airtel Money API) with the shop's own API keys: server-only service plus a webhook route that confirms the order payment. Never let the browser set `payment_status`.
9. **RRA EBM receipts**: integration with the certified EBM/VSDC system so receipts are fiscal receipts.
10. **Offline mode for the counter** (queue sales when the internet drops, sync later).
11. **Translation review**: have native speakers check `messages/sw.json` and `messages/rw.json`.
12. **Barcode label printing** for products without barcodes.

## Commands

```bash
npm run dev        # local dev
npm run build      # production build
npm run typecheck  # TypeScript check
npm run check:layers  # frontend/backend separation check
npm run seed       # demo data (needs SUPABASE_SERVICE_ROLE_KEY)
```
