"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { buttonClass } from "@/components/ui";

export function PrintButton({ label, auto = false }: { label: string; auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => {
      // Remove ?print=1 so a refresh or going back does not print the receipt again.
      const url = new URL(window.location.href);
      if (url.searchParams.has("print")) {
        url.searchParams.delete("print");
        window.history.replaceState(window.history.state, "", url);
      }
      window.print();
    }, 300);
    // React may run this effect twice (Strict Mode in development): cancel the first timer so it prints once.
    return () => clearTimeout(timer);
  }, [auto]);
  return <button onClick={() => window.print()} className={buttonClass("primary")}><Printer size={16} aria-hidden /> {label}</button>;
}
