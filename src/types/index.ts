export type Role = "owner" | "manager" | "cashier" | "storekeeper";
export type PaymentMethod = "cash" | "momo" | "airtel" | "bank";
export type OrderStatus = "new" | "confirmed" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export interface StaffProfile {
  id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  is_active: boolean;
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
