import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const SITE_URL = await getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/carrinho", "/conta", "/admin", "/admin-login", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
