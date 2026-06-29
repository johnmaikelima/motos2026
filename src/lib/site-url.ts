import "server-only";
import { headers } from "next/headers";

/**
 * Base URL do site (sem barra no fim).
 * Prioriza o HOST da requisição — assim o feed/sitemap/links se adaptam
 * automaticamente ao domínio que está servindo a página (útil quando o
 * domínio muda). Cai para NEXT_PUBLIC_SITE_URL e por fim localhost.
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    /* headers() indisponível (ex.: build) — usa o fallback abaixo */
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
