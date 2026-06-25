"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { formatBRL } from "@/lib/format";

type ChatProduct = { slug: string; name: string; price: number; image: string };
type Msg = { role: "user" | "assistant"; content: string; products?: ChatProduct[] };

const GREETING: Msg = {
  role: "assistant",
  content: "Olá! 👋 Sou do atendimento. Posso te ajudar com produtos, tamanhos, frete ou sua compra. Como posso ajudar?",
};

// Transforma links markdown [texto](url) e links crus (/produto/... e http...) em âncoras.
function renderText(text: string) {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/produto\/[a-z0-9-]+)\)|(https?:\/\/[^\s]+|\/produto\/[a-z0-9-]+)/gi;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) out.push(<span key={i++}>{text.slice(last, m.index)}</span>);
    const href = m[2] || m[3];
    const label = m[1] || "ver produto";
    out.push(
      <a
        key={i++}
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="font-semibold text-lime underline"
      >
        {label}
      </a>,
    );
    last = regex.lastIndex;
  }
  if (last < text.length) out.push(<span key={i++}>{text.slice(last)}</span>);
  return out;
}

export default function ChatWidget({
  storeName = "Atendimento",
  whatsapp = "",
}: {
  storeName?: string;
  whatsapp?: string;
}) {
  const pathname = usePathname();
  const digits = whatsapp.replace(/\D/g, "");
  const waNumber = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent("Olá! Vim pela loja.")}` : "";
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restaura a conversa da sessão.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("rm_chat");
      if (saved) setMsgs(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem("rm_chat", JSON.stringify(msgs.slice(-30)));
    } catch {
      /* ignore */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // Não mostra no painel administrativo.
  if (pathname?.startsWith("/admin")) return null;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    const started = Date.now();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      // Espera no mínimo ~3s (parece um atendente digitando).
      const wait = 3000 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setMsgs((m) => [...m, { role: "assistant", content: data.reply || "...", products: data.products || [] }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Tive um probleminha de conexão. Pode repetir?" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir atendimento"
          className="fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-lime text-black shadow-lg transition hover:scale-105"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </button>
      )}

      {/* Painel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[90] flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{storeName}</p>
                <p className="text-[11px] text-gray-400">Atendimento online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-gray-400 hover:text-white">✕</button>
          </div>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 border-b border-white/10 bg-[#25D366]/15 px-4 py-2 text-xs font-semibold text-[#25D366] transition hover:bg-[#25D366]/25"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.01c-.24.68-1.4 1.3-1.93 1.38-.49.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-2.99s.74-2.12 1.01-2.41c.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.65.49.24.57.82 1.97.89 2.11.07.14.12.31.02.51-.1.2-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.2.72-.84.91-1.13.19-.29.38-.24.65-.14.27.1 1.71.81 2 .95.29.14.49.22.56.34.07.12.07.68-.17 1.36z" />
              </svg>
              Falar pelo WhatsApp
            </a>
          )}

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user" ? "rounded-br-sm bg-lime text-black" : "rounded-bl-sm bg-ink-800 text-gray-100"
                    }`}
                  >
                    {m.role === "assistant" ? renderText(m.content) : m.content}
                  </div>
                </div>

                {m.products && m.products.length > 0 && (
                  <div className="space-y-2">
                    {m.products.map((p) => (
                      <a
                        key={p.slug}
                        href={`/produto/${p.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-800 p-2 transition hover:border-lime/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt={p.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-semibold text-white">{p.name}</p>
                          <p className="text-sm font-bold text-lime">{formatBRL(p.price)}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-lime">ver →</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-ink-800 px-3 py-2 text-sm text-gray-400">digitando…</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Escreva sua mensagem…"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-ink-800 px-4 py-2 text-sm text-white outline-none focus:border-lime/60"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-black disabled:opacity-40"
              aria-label="Enviar"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
