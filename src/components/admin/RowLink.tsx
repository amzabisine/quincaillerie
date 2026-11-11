"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A table row that opens `href` when clicked anywhere. Keep a real <Link> inside for keyboard users. */
export function RowLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button")) return; // let inner links work normally
        if (e.ctrlKey || e.metaKey) window.open(href, "_blank");
        else router.push(href);
      }}
      className={cn("cursor-pointer hover:bg-steel-50", className)}
    >
      {children}
    </tr>
  );
}
