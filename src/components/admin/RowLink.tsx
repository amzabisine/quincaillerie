"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A table row (or list item, with as="li") that opens `href` when clicked anywhere.
 * Keep a real <Link> inside for keyboard users. Inner links and buttons keep working normally.
 */
export function RowLink({ href, className, children, as: Tag = "tr" }: { href: string; className?: string; children: ReactNode; as?: "tr" | "li" }) {
  const router = useRouter();
  return (
    <Tag
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return; // let inner links and controls work normally
        if (e.ctrlKey || e.metaKey) window.open(href, "_blank");
        else router.push(href);
      }}
      className={cn("cursor-pointer hover:bg-steel-50", className)}
    >
      {children}
    </Tag>
  );
}
