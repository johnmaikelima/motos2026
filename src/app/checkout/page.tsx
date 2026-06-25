"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatBRL } from "@/lib/format";
import { pixPrice, pixDiscountValue } from "@/lib/pricing";
import { usePixDiscountPct } from "@/lib/pix-context";
import { submitOrder } from "@/server/order-actions";
import { getShippingOptions } from "@/server/shipping-actions";
import { executePlusPaymentAction } from "@/server/paypal-plus-actions";
import { getMyData, type MyData } from "@/server/auth-actions";
import PaypalPlus, { type PlusPayerData } from "@/components/PaypalPlus";
import PixPayment from "@/components/PixPayment";
import CheckoutLogin from "@/components/CheckoutLogin";

const FIELDS: { name: string; label: string; type?: string; half?: boolean }[] = [
  { name: "nome", label: "Nome completo" },
  { name: "cpf", label: "CPF", half: true },
  { name: "telefone", label: "Telefone", half: true },
  { name: "email", label: "E-mail", type: "email" },
  { name: "cep", label: "CEP", half: true },
  { name: "cidade", label: "Cidade", half: true },
  { name: "endereco", label: "Endereço" },
  { name: "numero", label: "Número", half: true },
  { name: "uf", label: "UF", half: true },
];

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const pixPct = usePixDiscountPct();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "pay" | "processing" | "done">("form");
  const [order, setOrder] = useState<{ id: string; numero: string } | null>(null);
  const [payer, setPayer] = useState<PlusPayerData | null>(null);
  const [method, setMethod] = useState<"" | "card" | "pix">("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [loggedEmail, setLoggedEmail] = useState("");

  type Frete = { id: number; name: string; company: string; price: number; deliveryTime: number };
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [freteLoading, setFreteLoading] = useState(false);
  const [freteErro, setFreteErro] = useState("");
  const [freteSel, setFreteSel] = useState<Frete | null>(null);

  async function calcFrete(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8 || items.length === 0) return;
    setFreteLoading(true);
    setFreteErro("");
    setFretes([]);
    setFreteSel(null);
    const r = await getShippingOptions(cep, items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })));
    setFreteLoading(false);
    if (r.ok) {
      setFretes(r.options);
      if (r.options[0]) setFreteSel(r.options[0]);
    } else {
      setFreteErro(r.error);
    }
  }

  function applyCustomer(d: MyData) {
    setValues((prev) => ({
      ...prev,
      nome: d.name || prev.nome || "",
      cpf: d.cpf || prev.cpf || "",
      telefone: d.phone || prev.telefone || "",
      email: d.email || prev.email || "",
      cep: d.cep || prev.cep || "",
      cidade: d.city || prev.cidade || "",
      endereco: d.address || prev.endereco || "",
      numero: d.addressNumber || prev.numero || "",
      uf: d.uf || prev.uf || "",
    }));
    setLoggedEmail(d.email);
  }

  // Se já estiver logado, carrega os dados.
  useEffect(() => {
    getMyData().then((d) => d && applyCustomer(d));
  }, []);

  function setVal(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  async function lookupCep(cepRaw: string) {
    const cep = cepRaw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setValues((prev) => ({
          ...prev,
          endereco: d.logradouro || prev.endereco || "",
          cidade: d.localidade || prev.cidade || "",
          uf: d.uf || prev.uf || "",
        }));
      }
    } catch {
      /* silencioso: usuário preenche manualmente */
    } finally {
      setCepLoading(false);
    }
  }

  // Volta do PayPal: /checkout?paymentId=...&PayerID=... -> executa e confirma.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const paymentId = q.get("paymentId");
    const payerId = q.get("PayerID");
    if (paymentId && payerId) {
      setStep("processing");
      executePlusPaymentAction(paymentId, payerId).then((res) => {
        if (res.ok) {
          clear();
          setStep("done");
        } else {
          setError(res.error ?? "Pagamento não confirmado.");
          setStep("form");
        }
        // limpa os parâmetros da URL
        window.history.replaceState({}, "", "/checkout");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") ?? "").trim();
    const email = String(fd.get("email") ?? "");
    const cpf = String(fd.get("cpf") ?? "");
    const telefone = String(fd.get("telefone") ?? "");
    const res = await submitOrder({
      nome,
      cpf,
      email,
      telefone: String(fd.get("telefone") ?? ""),
      cep: String(fd.get("cep") ?? ""),
      endereco: String(fd.get("endereco") ?? ""),
      numero: String(fd.get("numero") ?? ""),
      cidade: String(fd.get("cidade") ?? ""),
      uf: String(fd.get("uf") ?? ""),
      cdTransportador: "1",
      itens: items.map((i) => ({ slug: i.slug, qty: i.qty, size: i.size })),
      shipping: freteSel ? { price: freteSel.price, method: `${freteSel.company} ${freteSel.name}` } : undefined,
    });
    setLoading(false);
    if (res.ok) {
      const sp = nome.indexOf(" ");
      setPayer({
        email,
        firstName: sp > 0 ? nome.slice(0, sp) : nome,
        lastName: sp > 0 ? nome.slice(sp + 1) : ".",
        taxId: cpf,
        phone: telefone,
      });
      setOrder({ id: res.orderId, numero: res.idPedido });
      setStep("pay");
    } else {
      setError(res.error);
    }
  }

  if (step === "processing") {
    return (
      <div className="container-rm flex min-h-[50vh] flex-col items-center justify-center gap-3 py-16 text-center">
        <h1 className="heading-display text-2xl text-white">Confirmando pagamento...</h1>
        <p className="text-sm text-gray-400">Só um instante.</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="container-rm flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="heading-display text-3xl text-lime">Pagamento aprovado! 🎉</h1>
        <p className="text-sm text-gray-300">
          {order ? <>Pedido <strong>#{order.numero}</strong> confirmado. </> : null}Obrigado pela compra!
        </p>
        <Link href="/" className="btn-primary mt-2">Voltar à loja</Link>
      </div>
    );
  }

  if (items.length === 0 && step === "form") {
    return (
      <div className="container-rm flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-gray-300">Não há itens para finalizar.</p>
        <Link href="/produtos" className="btn-primary">Ver coleção</Link>
      </div>
    );
  }

  return (
    <div className="container-rm py-10">
      <h1 className="heading-display mb-8 text-3xl text-white">{step === "pay" ? "Pagamento" : "Checkout"}</h1>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        {step === "form" ? (
          <div className="flex flex-col gap-4">
            {loggedEmail ? (
              <p className="rounded-md border border-lime/30 bg-lime/10 px-4 py-2.5 text-sm text-lime">
                ✓ Logado como <strong>{loggedEmail}</strong> — seus dados foram carregados.
              </p>
            ) : (
              <CheckoutLogin onLogin={applyCustomer} />
            )}
          <form onSubmit={handleSubmit} className="card grid grid-cols-2 gap-4 p-6">
            {FIELDS.map((f) => (
              <div key={f.name} className={f.half ? "col-span-1" : "col-span-2"}>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-400">
                  {f.label}
                  {f.name === "cep" && cepLoading && <span className="ml-2 text-lime">buscando...</span>}
                </label>
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  required
                  value={values[f.name] ?? ""}
                  onChange={(e) => {
                    setVal(f.name, e.target.value);
                    if (f.name === "cep" && e.target.value.replace(/\D/g, "").length === 8) {
                      lookupCep(e.target.value);
                      calcFrete(e.target.value);
                    }
                  }}
                  onBlur={f.name === "cep" ? (e) => { lookupCep(e.target.value); calcFrete(e.target.value); } : undefined}
                  className="w-full rounded-md border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white outline-none focus:border-lime/60"
                />
              </div>
            ))}

            {/* Frete */}
            <div className="col-span-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Frete</p>
              {freteLoading && <p className="text-sm text-gray-400">Calculando frete...</p>}
              {!freteLoading && fretes.length === 0 && !freteErro && (
                <p className="text-sm text-gray-500">Digite o CEP para calcular o frete.</p>
              )}
              {freteErro && <p className="text-xs text-amber-300">{freteErro}</p>}
              <div className="flex flex-col gap-2">
                {fretes.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition ${
                      freteSel?.id === o.id ? "border-lime/60 bg-lime/10" : "border-white/10 bg-ink-800 hover:border-white/20"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input type="radio" name="frete" checked={freteSel?.id === o.id} onChange={() => setFreteSel(o)} className="h-4 w-4 accent-lime" />
                      <span className="text-white">{o.company} {o.name}</span>
                      <span className="text-xs text-gray-400">~{o.deliveryTime} dia(s)</span>
                    </span>
                    <span className="font-semibold text-lime">{formatBRL(o.price)}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="col-span-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || (fretes.length > 0 && !freteSel)}
              className="btn-primary col-span-2 mt-2 disabled:opacity-50"
            >
              {loading ? "Salvando pedido..." : "Ir para o pagamento"}
            </button>
          </form>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="heading-display mb-4 text-xl text-white">Pagamento</h2>

            {method === "" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-400">Escolha como pagar:</p>
                <button onClick={() => setMethod("pix")} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800 px-4 py-4 text-left transition hover:border-lime/50">
                  <span>
                    <span className="block font-bold text-white">PIX</span>
                    <span className="block text-xs text-gray-400">Aprovação na hora · Mercado Pago</span>
                  </span>
                  <span className="text-2xl">⚡</span>
                </button>
                <button onClick={() => setMethod("card")} className="flex items-center justify-between rounded-lg border border-white/10 bg-ink-800 px-4 py-4 text-left transition hover:border-lime/50">
                  <span>
                    <span className="block font-bold text-white">Cartão de crédito</span>
                    <span className="block text-xs text-gray-400">À vista ou parcelado · PayPal</span>
                  </span>
                  <span className="text-2xl">💳</span>
                </button>
              </div>
            )}

            {method === "card" && order && payer && (
              <PaypalPlus localOrderId={order.id} payer={payer} onPaid={() => { clear(); setStep("done"); }} />
            )}

            {method === "pix" && order && (
              <PixPayment localOrderId={order.id} onPaid={() => { clear(); setStep("done"); }} />
            )}

            <div className="mt-4 flex items-center gap-4 text-xs">
              {method !== "" && (
                <button onClick={() => setMethod("")} className="text-gray-400 hover:text-white">
                  ← Trocar forma de pagamento
                </button>
              )}
              <button onClick={() => { setMethod(""); setStep("form"); }} className="text-gray-400 hover:text-white">
                Voltar aos dados
              </button>
            </div>
          </div>
        )}

        <aside className="card h-max p-6">
          <h2 className="heading-display text-xl text-white">Resumo</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((i) => (
              <li key={`${i.productId}-${i.size ?? ""}`} className="flex justify-between text-sm text-gray-300">
                <span className="pr-2">{i.qty}× {i.name}{i.size ? ` (${i.size})` : ""}</span>
                <span>{formatBRL(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Frete</span>
              <span>{freteSel ? formatBRL(freteSel.price) : "—"}</span>
            </div>
            <div className="flex justify-between pt-2 text-lg font-bold text-white">
              <span>Total {method === "card" ? "(cartão)" : ""}</span>
              <span className="text-lime">{formatBRL(subtotal + (freteSel?.price ?? 0))}</span>
            </div>

            {/* Opção PIX com desconto (sobre os produtos) */}
            {pixPct > 0 && (
              <div className={`mt-2 rounded-md border px-3 py-2 ${method === "pix" ? "border-lime/40 bg-lime/10" : "border-white/10"}`}>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Desconto PIX ({pixPct}%)</span>
                  <span className="text-lime">- {formatBRL(pixDiscountValue(subtotal, pixPct))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-lime">
                  <span>À vista no PIX</span>
                  <span>{formatBRL(pixPrice(subtotal, pixPct) + (freteSel?.price ?? 0))}</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
