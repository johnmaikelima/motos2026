import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function Page() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="18/06/2026">
      <p>
        Ao utilizar o site da RunMotos, você concorda com os termos abaixo. Recomendamos a
        leitura atenta antes de finalizar qualquer compra.
      </p>
      <h2>Produtos e preços</h2>
      <p>
        Imagens são ilustrativas. Preços e disponibilidade podem mudar sem aviso prévio, mas o
        valor válido é sempre o exibido no momento da finalização do pedido.
      </p>
      <h2>Pagamentos</h2>
      <p>
        Aceitamos cartões de crédito, Pix e boleto. As transações são processadas por
        intermediadores de pagamento seguros.
      </p>
      <h2>Entrega</h2>
      <p>
        O prazo de entrega é informado no checkout e pode variar conforme a região e a
        transportadora.
      </p>
      <h2>Contato</h2>
      <p>
        Dúvidas? Fale com a gente em <strong>contato@runmotos.com.br</strong>.
      </p>
    </LegalPage>
  );
}
