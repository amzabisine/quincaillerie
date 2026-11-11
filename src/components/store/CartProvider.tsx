"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  unitId: string;
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  image: string | null;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: CartItem) => void;
  setQuantity: (unitId: string, quantity: number) => void;
  remove: (unitId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "quincaillerie-cart";

/** The cart lives in the browser, so customers don't need an account. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  function save(next: CartItem[]) {
    setItems(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }

  const value: CartContextValue = {
    items,
    count: items.length,
    subtotal: items.reduce((s, i) => s + Math.round(i.price * i.quantity), 0),
    add: (item) => {
      const existing = items.find((i) => i.unitId === item.unitId);
      save(existing ? items.map((i) => (i.unitId === item.unitId ? { ...i, quantity: i.quantity + item.quantity } : i)) : [...items, item]);
    },
    setQuantity: (unitId, quantity) => save(items.map((i) => (i.unitId === unitId ? { ...i, quantity: Math.max(0.001, quantity) } : i))),
    remove: (unitId) => save(items.filter((i) => i.unitId !== unitId)),
    clear: () => save([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
