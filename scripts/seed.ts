/**
 * Demo data: staff accounts, shop settings, 10 hardware products with stock (prices in US dollars), and 3 customers.
 * Run once after the migration:  npm run seed
 * Every demo account uses the password: Demo1234!
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const PASSWORD = "Demo1234!";

async function staff(email: string, full_name: string, role: string) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name, role } });
  if (error && !error.message.includes("already")) throw error;
  if (data?.user) console.log(`  ${email}`);
}

type U = { unit: string; factor: number; retail: number; wholesale?: number; isDefault?: boolean };
const PRODUCTS: { name: string; cat: string; base: string; stock: number; cost: number; low: number; units: U[]; description?: string }[] = [
  { name: "Ciment 32.5 (sac de 50 kg)", cat: "Ciment et maçonnerie", base: "bag", stock: 140, cost: 7.7, low: 20, units: [{ unit: "bag", factor: 1, retail: 8.6, wholesale: 8.3 }] },
  { name: "Tôle ondulée G28", cat: "Fer et tôles", base: "sheet", stock: 60, cost: 5.95, low: 15, units: [{ unit: "sheet", factor: 1, retail: 6.75, wholesale: 6.4 }] },
  { name: "Clous 3 pouces", cat: "Quincaillerie générale", base: "kg", stock: 38, cost: 1.15, low: 10, units: [{ unit: "kg", factor: 1, retail: 1.5, wholesale: 1.4, isDefault: true }, { unit: "box", factor: 25, retail: 34.5, wholesale: 32.75 }] },
  { name: "Fer à béton 12 mm", cat: "Fer et tôles", base: "piece", stock: 210, cost: 5.4, low: 30, units: [{ unit: "piece", factor: 1, retail: 6.15, wholesale: 5.85, isDefault: true }, { unit: "bundle", factor: 10, retail: 59.3, wholesale: 56.55 }] },
  { name: "Tuyau PVC 1/2 pouce (6 m)", cat: "Plomberie", base: "piece", stock: 4, cost: 1.8, low: 10, units: [{ unit: "piece", factor: 1, retail: 2.4, wholesale: 2.2 }] },
  { name: "Peinture blanche 4 L", cat: "Peinture", base: "tin", stock: 25, cost: 10, low: 5, units: [{ unit: "tin", factor: 1, retail: 12.4, wholesale: 11.7 }] },
  { name: "Fil électrique 2,5 mm²", cat: "Électricité", base: "meter", stock: 300, cost: 0.31, low: 50, units: [{ unit: "meter", factor: 1, retail: 0.41, wholesale: 0.38, isDefault: true }, { unit: "roll", factor: 100, retail: 37.95, wholesale: 35.85 }] },
  { name: "Marteau de charpentier", cat: "Outils", base: "piece", stock: 12, cost: 3.3, low: 3, units: [{ unit: "piece", factor: 1, retail: 4.85 }] },
  { name: "Brouette", cat: "Outils", base: "piece", stock: 6, cost: 24.85, low: 2, units: [{ unit: "piece", factor: 1, retail: 31.05, wholesale: 29.65 }] },
  { name: "Robinet laiton 1/2 pouce", cat: "Plomberie", base: "piece", stock: 18, cost: 2.6, low: 5, units: [{ unit: "piece", factor: 1, retail: 3.8, wholesale: 3.45 }] },
];

async function main() {
  const { count } = await db.from("products").select("id", { count: "exact", head: true });
  if (count) { console.log("Products already exist, skipping seed."); return; }

  console.log("Staff accounts (password Demo1234!):");
  await staff("owner@quincaillerie.rw", "Propriétaire Démo", "owner"); // first account becomes owner
  await staff("cashier@quincaillerie.rw", "Diane (caissière)", "cashier");
  await staff("store@quincaillerie.rw", "Eric (magasinier)", "storekeeper");

  await db.from("settings").update({
    shop_name: "ETS PACIFIQUE", tagline: "Matériaux de construction à Bukavu",
    phone: "+243902673021", whatsapp: "+250782203526", address: "Bukavu",
    mpesa_code: "123456", momo_name: "ETS PACIFIQUE", delivery_note: "Livraison dans Bukavu",
  }).eq("id", 1);

  const { data: cats } = await db.from("categories").select("id, name_fr");
  for (const p of PRODUCTS) {
    const { data: prod, error } = await db.from("products").insert({
      name: p.name, description: p.description ?? "", base_unit: p.base, stock: p.stock, cost_price: p.cost,
      low_stock_level: p.low, category_id: cats?.find((c) => c.name_fr === p.cat)?.id ?? null,
    }).select("id").single();
    if (error) throw error;
    await db.from("product_units").insert(p.units.map((u, i) => ({
      product_id: prod.id, unit: u.unit, factor: u.factor, retail_price: u.retail,
      wholesale_price: u.wholesale ?? null, is_default: u.isDefault ?? i === 0,
    })));
    await db.from("stock_movements").insert({ product_id: prod.id, type: "purchase", quantity: p.stock, stock_after: p.stock, unit_cost: p.cost, note: "Stock initial (démo)" });
  }

  await db.from("customers").insert([
    { name: "Fundi Patrick", phone: "+243991234567", type: "wholesale", balance: 31, credit_limit: 200 },
    { name: "Mama Claudine", phone: "+243812345678", type: "retail" },
    { name: "Entreprise Umoja BTP", phone: "+250789600700", type: "wholesale", balance: 82.5, credit_limit: 700 },
  ]);

  console.log("Seeded 10 products and 3 customers.");
}

main().catch((e) => { console.error(e); process.exit(1); });
