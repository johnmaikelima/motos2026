"use client";

import { useEffect, useRef, useState } from "react";
import { createPlusPaymentAction, executePlusPaymentAction } from "@/server/paypal-plus-actions";

declare global {
  interface Window {
    PAYPAL?: any;
  }
}

const MODE = (process.env.NEXT_PUBLIC_PAYPAL_ENV ?? "sandbox").toLowerCase();

export type PlusPayerData = {
  email: string;
  firstName: string;
  lastName: string;
  taxId: string; // CPF
  phone: string;
};

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PAYPAL?.apps?.PPP) return resolve();
    const id = "ppplus-sdk";
    const existing = document.getElementById(id);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar o PayPal Plus.")));
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://www.paypalobjects.com/webstatic/ppplusdcc/ppplusdcc.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar o SDK do PayPal Plus."));
    document.body.appendChild(s);
  });
}

export default function PaypalPlus({
  localOrderId,
  payer,
  onPaid,
}: {
  localOrderId: string;
  payer: PlusPayerData;
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "paying" | "error">("loading");
  const [msg, setMsg] = useState("");
  const pppRef = useRef<any>(null);
  const paymentIdRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await createPlusPaymentAction(localOrderId);
      if (cancelled) return;
      if (!r.ok || !r.approvalUrl || !r.paymentId) {
        setStatus("error");
        setMsg(r.error ?? "Erro ao iniciar o pagamento.");
        return;
      }
      paymentIdRef.current = r.paymentId;
      await loadScript();
      if (cancelled || !window.PAYPAL?.apps?.PPP) {
        setStatus("error");
        setMsg("SDK do PayPal Plus indisponível.");
        return;
      }

      pppRef.current = window.PAYPAL.apps.PPP({
        approvalUrl: r.approvalUrl,
        placeholder: "ppplus",
        mode: MODE, // "sandbox" | "live"
        country: "BR",
        language: "pt_BR",
        collectBillingAddress: false,
        // dados do comprador exigidos pelo PayPal Plus BR:
        payerFirstName: payer.firstName,
        payerLastName: payer.lastName,
        payerEmail: payer.email,
        payerTaxId: payer.taxId,
        payerPhone: payer.phone,
        onLoad: () => setStatus((s) => (s === "loading" ? "ready" : s)),
        onContinue: (_rememberedCards: any, payerId: string, _token: any, term?: number) => {
          setStatus("paying");
          executePlusPaymentAction(paymentIdRef.current, payerId, term ?? null).then((res) => {
            if (res.ok) onPaid();
            else {
              setStatus("ready");
              setMsg(res.error ?? "Pagamento não confirmado.");
            }
          });
        },
        onError: (err: any) => {
          setStatus("ready");
          setMsg(String(err?.message ?? err ?? "Erro no pagamento."));
        },
      });
      setTimeout(() => !cancelled && setStatus((s) => (s === "loading" ? "ready" : s)), 2500);
    })().catch((e) => {
      setStatus("error");
      setMsg(e?.message ?? "Falha ao carregar o pagamento.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localOrderId]);

  function pay() {
    setMsg("");
    try {
      pppRef.current?.doContinue();
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível continuar o pagamento.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "loading" && <p className="text-sm text-gray-400">Carregando pagamento seguro...</p>}

      {/* iframe do PayPal (cartão + parcelas) — em painel branco para legibilidade */}
      <div className="rounded-lg bg-white p-3">
        <div id="ppplus" />
      </div>

      {(status === "ready" || status === "paying") && (
        <button onClick={pay} disabled={status === "paying"} className="btn-primary mt-1 disabled:opacity-50">
          {status === "paying" ? "Processando pagamento..." : "Pagar"}
        </button>
      )}

      <p className="text-center text-[11px] text-gray-500">
        🔒 Cartão (à vista ou parcelado) processado pelo PayPal. Sua loja não armazena os dados do cartão.
      </p>
      {msg && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{msg}</p>}
    </div>
  );
}
