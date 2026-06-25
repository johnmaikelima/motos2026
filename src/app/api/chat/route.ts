import { NextResponse } from "next/server";
import { chatWithAssistant, productsFromReply, type ChatMessage } from "@/lib/assistant";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Rate limit por IP (evita abuso e custo da OpenAI): 15 msg/min.
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    if (!rateLimit(`chat:${ip}`, 15, 60_000)) {
      return NextResponse.json({ reply: "Você está enviando mensagens muito rápido 🙂 Aguarde um instante e tente de novo." });
    }

    const body = (await req.json()) as { messages?: ChatMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (messages.length === 0) {
      return NextResponse.json({ reply: "Como posso ajudar?" });
    }
    const reply = await chatWithAssistant(messages);
    const products = await productsFromReply(reply);
    return NextResponse.json({ reply, products });
  } catch {
    return NextResponse.json(
      { reply: "Desculpe, tive um probleminha aqui. Pode repetir?" },
      { status: 200 },
    );
  }
}
