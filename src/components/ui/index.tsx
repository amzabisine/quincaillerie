import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

type Variant = "primary" | "signal" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-steel-800 text-white hover:bg-steel-950",
  signal: "bg-signal text-steel-950 hover:brightness-95",
  secondary: "bg-white text-steel-950 ring-1 ring-steel-950/15 hover:bg-steel-50",
  ghost: "text-steel-950 hover:bg-steel-950/5",
  danger: "bg-white text-danger ring-1 ring-danger/30 hover:bg-danger-50",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
    variants[variant],
    className
  );
}

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const field = "w-full rounded-md bg-white ring-1 ring-steel-950/15 px-3 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-steel-600 disabled:bg-steel-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(field, className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(field, "pr-8", className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "h-auto py-2 min-h-20", className)} {...props} />;
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block mb-1.5">
      <span className="text-sm font-medium">{children}</span>
      {hint && <span className="block text-xs text-steel-600 mt-0.5">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, htmlFor, children, className }: { label: string; hint?: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return <div className={className}><Label htmlFor={htmlFor} hint={hint}>{label}</Label>{children}</div>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg bg-white ring-1 ring-steel-950/8 p-5", className)}>{children}</div>;
}

const tones: Record<string, string> = {
  ok: "bg-ok-50 text-ok", warn: "bg-signal-50 text-[#7a5600]", danger: "bg-danger-50 text-danger",
  muted: "bg-steel-950/5 text-steel-600", info: "bg-steel-100 text-steel-800",
};
export function Badge({ tone = "muted", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  const t = { info: "bg-steel-100 text-steel-800", success: "bg-ok-50 text-ok", error: "bg-danger-50 text-danger" };
  return <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-md px-3 py-2 text-sm", t[tone])}>{children}</p>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl sm:text-3xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "danger" | "ok" }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-steel-950/8">
      <p className="text-sm text-steel-600">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-bold [font-stretch:85%]", tone === "danger" && "text-danger", tone === "ok" && "text-ok")}>{value}</p>
    </div>
  );
}
