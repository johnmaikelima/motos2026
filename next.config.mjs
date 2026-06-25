/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // A planilha da Laquila pode passar de 10MB; o padrão de Server Action é 1MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
  images: {
    // Libere aqui os domínios de onde virão as imagens dos produtos (ex.: CDN da Laquila).
    remotePatterns: [
      { protocol: "https", hostname: "**.laquila.com.br" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Permite o placeholder.svg local (imagem de fallback de produtos sem foto).
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Cabeçalhos de segurança em todas as rotas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
