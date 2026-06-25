import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Trocas e Devoluções" };

export default function Page() {
  return (
    <LegalPage title="Trocas e Devoluções" updatedAt="18/06/2026">
      <p>
        Na RunMotos, sua satisfação é prioridade. Seguimos integralmente o Código de Defesa
        do Consumidor (Lei nº 8.078/1990).
      </p>
      <h2>Direito de arrependimento (7 dias)</h2>
      <p>
        Você pode desistir da compra em até <strong>7 dias corridos</strong> após o
        recebimento do produto, sem necessidade de justificativa. O valor pago será
        integralmente restituído, incluindo o frete.
      </p>
      <h2>Troca por defeito</h2>
      <p>
        Em caso de defeito de fabricação, você tem até <strong>30 dias</strong> (produtos não
        duráveis) ou <strong>90 dias</strong> (produtos duráveis) para solicitar a troca.
      </p>
      <h2>Como solicitar</h2>
      <p>
        Envie um e-mail para <strong>sac@runmotos.com.br</strong> com o número do pedido. O
        produto deve estar sem sinais de uso, com etiquetas e embalagem originais.
      </p>
      <h2>Prazo de reembolso</h2>
      <p>
        Após recebermos e conferirmos o produto, o reembolso é processado em até 10 dias úteis,
        pelo mesmo meio de pagamento utilizado na compra.
      </p>
    </LegalPage>
  );
}
