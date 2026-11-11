"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";

export function CartButton() {
  const { count } = useCart();
  const t = useTranslations("nav");
  return (
    <Link href="/cart" className="relative inline-flex h-10 items-center gap-2 rounded-md bg-signal px-3 text-sm font-semibold text-steel-950">
      <ShoppingCart size={18} aria-hidden />
      <span className="hidden sm:inline">{t("cart")}</span>
      {count > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-steel-950 px-1 text-xs text-white" aria-label={`${count}`}>{count}</span>
      )}
    </Link>
  );
}
