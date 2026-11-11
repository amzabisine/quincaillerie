import type { Metadata } from "next";
import { Archivo, Public_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { getPublicSettings } from "@/lib/catalog";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"] });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getPublicSettings();
  return {
    title: { default: s.shop_name, template: `%s | ${s.shop_name}` },
    description: s.tagline || "Quincaillerie à Rubavu",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${archivo.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
