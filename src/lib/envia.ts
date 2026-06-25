import "server-only";

/**
 * Envia.com — cotação de frete (endpoint /ship/rate/).
 * Token fica só no servidor. Use o token de sandbox (api-test) para testes.
 * Docs: https://docs.envia.com
 */

const ENV = (process.env.ENVIA_ENV ?? "sandbox").toLowerCase();
const BASE = ENV === "production" ? "https://api.envia.com" : "https://api-test.envia.com";
const TOKEN = process.env.ENVIA_TOKEN ?? "";

export function isEnviaConfigured(): boolean {
  return TOKEN.length > 0;
}

export type EnviaAddress = {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string; // "BR"
  postalCode: string;
};

export type EnviaPackage = {
  type: string; // "box"
  content: string;
  amount: number;
  declaredValue: number;
  lengthUnit: "CM";
  weightUnit: "KG";
  weight: number;
  dimensions: { length: number; width: number; height: number };
};

export type ShippingOption = {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryTime: number; // dias
};

export async function calculateRates(
  origin: EnviaAddress,
  destination: EnviaAddress,
  packages: EnviaPackage[],
  carrier?: string
): Promise<ShippingOption[]> {
  if (!isEnviaConfigured()) throw new Error("Envia.com não configurado (ENVIA_TOKEN).");
  const shipment: Record<string, unknown> = { type: 1 };
  if (carrier) shipment.carrier = carrier;
  const res = await fetch(`${BASE}/ship/rate/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ origin, destination, packages, shipment }),
    cache: "no-store",
  });

  // A API pode responder texto (ex.: "Authentication failed") em vez de JSON.
  const raw = await res.text();
  let data: { data?: unknown };
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Envia ${res.status}: ${raw.slice(0, 200) || "resposta inválida"}`);
  }
  if (!res.ok) throw new Error(`Envia ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);

  const list: Array<Record<string, unknown>> = Array.isArray(data?.data) ? data.data : [];
  return list
    .filter((x) => x.totalPrice != null)
    .map((x, i) => ({
      id: i,
      name: String(x.serviceDescription || x.service || "Frete"),
      company: String(x.carrier || ""),
      price: Number(x.totalPrice),
      deliveryTime: Number((x.deliveryDate as { dateDifference?: number })?.dateDifference ?? 0),
    }))
    .filter((o) => Number.isFinite(o.price) && o.price > 0)
    .sort((a, b) => a.price - b.price);
}

// Transportadoras consultadas (o Envia cota uma por vez).
const BR_CARRIERS = ["correios", "jadlog", "loggi", "totalexpress", "latamcargo", "mandae", "azulcargo"];

/** Consulta todas as transportadoras em paralelo e junta as opções. */
export async function calculateAllRates(
  origin: EnviaAddress,
  destination: EnviaAddress,
  packages: EnviaPackage[]
): Promise<ShippingOption[]> {
  const results = await Promise.allSettled(
    BR_CARRIERS.map((c) => calculateRates(origin, destination, packages, c))
  );
  const all: ShippingOption[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);
  // reordena por preço e reatribui ids únicos (evita colisão entre transportadoras)
  return all.sort((a, b) => a.price - b.price).map((o, i) => ({ ...o, id: i }));
}
