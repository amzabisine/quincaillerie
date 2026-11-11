# Quincaillerie management system

Online store and shop management for one hardware store, starting in BUKAVU.

- **Online store** (public): customers browse products, add to cart, and order for pickup or delivery. They pay by MTN MoMo or Airtel Money merchant code (entering the transaction ID), or at pickup or delivery. No account needed; they track the order with a code and their phone number.
- **Counter (POS)**: fast product search and barcode scanning, retail or wholesale price per customer, discount, payment by cash, MoMo, Airtel, bank, or credit, and printed or WhatsApp receipts.
- **Stock**: products sold in several units (for example nails by kg and by box of 25 kg), stock in with average cost, damage, returns, physical counts, low-stock alerts, and full history.
- **Credit (ideni)**: customer balances, credit limits, debt payments, WhatsApp reminders.
- **Reports**: sales, profit, payment methods, best sellers, stock value, debts.
- **Staff roles**: owner, manager, cashier, storekeeper.
- **Languages**: French (default), English, Swahili, Kinyarwanda.

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase (PostgreSQL, Auth, Storage, Realtime), next-intl.

## Setup

1. **Install Node.js** (LTS) and run `npm install` in this folder.
2. **Create a Supabase project** at supabase.com. In **SQL Editor**, paste all of `supabase/migrations/0001_init.sql` and click **Run**. Then run `0003_delivery_fee_by_staff.sql` `0004_fix_order_code.sql` and `0005_set_cost_price.sql` the same way. (If you ran 0001 before Kinyarwanda was added, also run `0002_kinyarwanda.sql`.)
3. **Environment**: copy `.env.example` to `.env.local` and fill in the URL, anon key and service_role key from Supabase > Project settings > API.
4. **Demo data** (optional): `npm run seed`. Accounts (password `Demo1234!`):

   | Email | Role |
   |---|---|
   | owner@quincaillerie.rw | Owner |
   | cashier@quincaillerie.rw | Cashier |
   | store@quincaillerie.rw | Storekeeper |

   Without the seed: the **first account** created in Supabase > Authentication > Users becomes the owner automatically.
5. **Run**: `npm run dev`, then open http://localhost:3001 (store) and http://localhost:3001/login (staff).

## First steps for the real shop

1. Log in as owner, open **Settings**, and enter the shop name, phone, WhatsApp, TIN, and MoMo / Airtel merchant codes.
2. Add staff accounts in **Staff**.
3. Add products in **Products** (with every selling unit and price), then enter the current quantities in **Stock** using "Physical count" or "Stock in".
4. Delete the demo accounts and data before going live if you used the seed.

## Printing receipts

The receipt page is formatted for 80 mm thermal printers (it also works on 58 mm and A4). Connect the printer to the computer or tablet and use the browser's print dialog.

## Deploying

Deploy to Vercel and add the same environment variables. Supabase stays as it is.
