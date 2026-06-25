# RunMotos — Loja virtual (Next.js)

Loja de jaquetas e equipamentos para motociclistas, integrada à API de dropshipping
da **Laquila**, com arquitetura **segura** (segredos só no servidor) e pronta para o
**Google Merchant Center**.

## Stack

- **Next.js 15** (App Router) + **React 19** — React moderno com renderização no servidor
- **TypeScript** + **Tailwind CSS**
- Sem banco de dados próprio: o catálogo vem da Laquila

## Por que é seguro (a dúvida do "React é seguro?")

O React em si é seguro. O risco está em **onde os segredos ficam**. Aqui:

- O cliente da Laquila ([src/lib/laquila.ts](src/lib/laquila.ts)) começa com `import "server-only"`.
  Se alguém tentar importá-lo em código de navegador, **o build quebra**.
- O **token** e o **CNPJ** ficam em variáveis de ambiente **sem** `NEXT_PUBLIC_`,
  ou seja, nunca são enviados ao navegador.
- A criação de pedido roda numa **Server Action** ([src/server/order-actions.ts](src/server/order-actions.ts)),
  que **revalida preço e estoque no servidor** antes de enviar à Laquila — nunca confia
  no preço que veio do front (o usuário pode adulterar).

Regra de ouro: **toda** comunicação com a Laquila acontece no servidor.

## Como rodar

```bash
npm install
cp .env.example .env.local   # e preencha os valores
npm run dev                  # http://localhost:3000
```

A loja abre mesmo **sem** o token da Laquila: nesse caso usa produtos de exemplo
([src/lib/products.ts](src/lib/products.ts), `MOCK_PRODUCTS`).

## Configuração da Laquila

No `.env.local`:

```
LAQUILA_BASE_URL=https://api-dropshipping.laquila.com.br
LAQUILA_TOKEN=seu_token_aqui      # peça ao "setor de dropshipping" da Laquila
LAQUILA_CNPJ=seu_cnpj
```

Métodos já mapeados em [src/lib/laquila.ts](src/lib/laquila.ts):

| Método | Função | Para quê |
|--------|--------|----------|
| 00006  | `getStockAndPrice` | estoque + preço |
| 00007  | `getItemDetails`   | NCM, EAN, peso, dimensões |
| 00015  | `listCarriers`     | transportadoras |
| 00008  | `getOrder`         | consultar pedidos |
| 00002  | `createOrder`      | criar pedido |

> **Falta fazer com o token em mãos:** preencher `mapLaquilaToProduct()` e `fetchFromLaquila()`
> em [src/lib/products.ts](src/lib/products.ts) com os nomes reais dos campos do JSON da API.
> Hoje eles retornam vazio (e a loja cai no fallback de exemplo) de propósito.

## Google Merchant Center — o que já está pronto

- **SSR**: o Google consegue ler os produtos (renderizados no servidor).
- **Dados estruturados** `schema.org/Product` (JSON-LD) em cada página de produto.
- **Feed de produtos** em `/api/merchant-feed` (formato Google Shopping RSS 2.0).
  Cadastre `https://SEU-DOMINIO/api/merchant-feed` no Merchant Center.
- **Páginas de política** obrigatórias: trocas/devoluções, privacidade (LGPD), termos, contato.
- **sitemap.xml** e **robots.txt** automáticos.

### Checklist antes de divulgar

- [ ] Hospedar com **HTTPS** (Vercel já entrega isso de graça).
- [ ] Apontar `NEXT_PUBLIC_SITE_URL` para o domínio real.
- [ ] Preencher dados reais nas páginas de política (CNPJ, endereço, contato).
- [ ] Garantir que **preço e disponibilidade do feed batem com o site** (regra do Merchant Center).
- [ ] Integrar um **gateway de pagamento** (ver abaixo) — o checkout atual cria o pedido,
      mas ainda não cobra.

## Próximos passos sugeridos

1. **Pagamento**: integrar Mercado Pago / Pagar.me / Stripe (também via Server Action).
2. **Frete**: usar `listCarriers` (00015) + tabela/cálculo de frete.
3. **Mapeamento real** dos produtos da Laquila.
4. **Imagens**: liberar o domínio do CDN da Laquila em [next.config.mjs](next.config.mjs).

## Estrutura

```
src/
  app/                 # páginas (App Router)
    api/merchant-feed/ # feed do Google Shopping
    produto/[slug]/    # página de produto + JSON-LD
    categoria/[slug]/  # listagem por categoria
    checkout/          # checkout (Server Action)
    ...                # carrinho, políticas, sobre, contato
  components/          # UI (Header, Footer, ProductCard, ...)
  lib/
    laquila.ts         # cliente da API (server-only) 🔒
    products.ts        # camada de dados + fallback
    cart-context.tsx   # carrinho (client, sem segredos)
  server/
    order-actions.ts   # criação de pedido (server-only) 🔒
```
