import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/checkout", "/carrinho", "/conta", "/admin", "/admin-login", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
