import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { PixDiscountProvider } from "@/lib/pix-context";
import { getStoreSettings } from "@/lib/store-settings";
import { getCurrentCustomer } from "@/lib/session";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Microsoft Clarity (heatmaps/gravações). ID configurável; vazio = desativado.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "u69d9ztsat";

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${storeName} — Equipamentos para motociclistas`,
      template: `%s | ${storeName}`,
    },
    description:
      "Produtos de alta qualidade com design moderno e proteção que te acompanha em qualquer estrada.",
    keywords: ["jaqueta de moto", "equipamento motociclista", "roupa de motoboy", storeName],
    openGraph: { type: "website", locale: "pt_BR", siteName: storeName },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, customer] = await Promise.all([getStoreSettings(), getCurrentCustomer()]);
  const firstName = customer?.name?.trim().split(/\s+/)[0] || null;
  return (
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-screen bg-ink font-sans antialiased">
        {CLARITY_ID && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
        <CartProvider>
          <PixDiscountProvider pct={settings.pixDiscountPct}>
            <Header storeName={settings.storeName} logoUrl={settings.logoUrl} firstName={firstName} />
            <main>{children}</main>
            <Footer settings={settings} />
            <ChatWidget storeName={settings.storeName} whatsapp={settings.whatsapp} />
          </PixDiscountProvider>
        </CartProvider>
      </body>
    </html>
  );
}
