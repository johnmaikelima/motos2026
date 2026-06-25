export type Category = {
  slug: string;
  name: string;
  tagline: string;
  code?: string; // cd_grupo da Laquila (vazio só no fallback)
  productCount?: number;
};

export type Product = {
  id: string; // cd_item na Laquila
  slug: string;
  name: string;
  description: string;
  price: number; // preço de venda (R$)
  listPrice?: number; // preço "de" (riscado), opcional
  image: string;
  gallery?: string[];
  categorySlug: string;
  categoria?: string;
  subcategoria?: string;
  brand: string;
  rating: number;
  reviews: number;
  stock: number;
  installments?: { count: number; value: number };
  ean?: string;
  ncm?: string;
  sizes?: string[];
  bestSeller?: boolean;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  qty: number;
};
