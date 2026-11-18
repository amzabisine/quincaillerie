export type Role = "owner" | "manager" | "cashier" | "storekeeper";
/** momo = MTN MoMo (Rwanda), mpesa = Vodacom M-Pesa, orange = Orange Money */
export type PaymentMethod = "cash" | "mpesa" | "orange" | "airtel" | "momo" | "bank";
/** How an online customer said they would pay */
export type OnlinePaymentMethod = "mpesa_code" | "orange_code" | "airtel_code" | "momo_code" | "on_collect";
export type OrderStatus = "new" | "confirmed" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export interface StaffProfile {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  is_active: boolean;
}

/** A staff member as the owner sees them on the Staff page (login details come from Supabase Auth). */
export interface StaffMember extends StaffProfile {
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface Settings {
  shop_name: string;
  tagline: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string;
  tin?: string | null;
  momo_code: string | null;
  momo_name: string | null;
  airtel_code: string | null;
  mpesa_code: string | null;
  orange_code: string | null;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee: number;
  delivery_note: string;
  receipt_footer?: string;
}

export interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  name_sw: string;
  name_rw: string;
  icon: string;
  sort: number;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit: string;
  factor: number;
  retail_price: number;
  wholesale_price: number | null;
  barcode: string | null;
  is_default: boolean;
  show_online: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  sku: string | null;
  base_unit: string;
  stock: number;
  cost_price: number;
  low_stock_level: number;
  image_url: string | null;
  is_active: boolean;
  show_online: boolean;
  product_units?: ProductUnit[];
}

/** What the online store sees (no cost price, no exact stock) */
export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  category_id: string | null;
  base_unit: string;
  image_url: string | null;
  stock_status: "in" | "low" | "out";
  units: { id: string; unit: string; factor: number; retail_price: number; is_default: boolean }[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  type: "retail" | "wholesale";
  balance: number;
  credit_limit: number;
  notes: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export type ExpenseCategory = "rent" | "salaries" | "transport" | "utilities" | "taxes" | "communication" | "repairs" | "other";

/** A running cost of the shop (owner and managers only). */
export interface Expense {
  id: string;
  spent_on: string;          // "YYYY-MM-DD", Bukavu date
  category: ExpenseCategory;
  amount: number;
  method: PaymentMethod;
  note: string;
  created_by: string | null;
  created_at: string;
  by?: { full_name: string } | null;
}
