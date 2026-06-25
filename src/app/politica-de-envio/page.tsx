import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de Envio" };

export default function Page() {
  return (
    <LegalPage title="Política de Envio" updatedAt="25/06/2026">
      <p>
        Entregamos para <strong>todo o Brasil</strong>. Abaixo explicamos como funciona o
        cálculo do frete, os prazos e o acompanhamento do seu pedido.
      </p>

      <h2>Cálculo do frete</h2>
      <p>
        O valor do frete é calculado automaticamente pelo seu <strong>CEP</strong>, tanto na
        página do produto quanto no checkout. Trabalhamos com diversas transportadoras e os
        Correios — você escolhe a opção de melhor preço ou prazo no momento da compra.
      </p>

      <h2>Prazo de postagem</h2>
      <p>
        Os pedidos são separados e postados em até <strong>2 dias úteis</strong> após a
        <strong> confirmação do pagamento</strong> (pagamentos via PIX costumam confirmar na
        hora; cartão pode levar algumas horas).
      </p>

      <h2>Prazo de entrega</h2>
      <p>
        O prazo de entrega é o informado pela transportadora escolhida no checkout e varia
        conforme a região de destino. O prazo começa a contar a partir da postagem, não da
        data da compra.
      </p>

      <h2>Acompanhamento</h2>
      <p>
        Assim que o pedido for enviado, você poderá acompanhar o status na sua conta, em
        <strong> Minha Conta → Pedidos</strong>. Quando houver código de rastreio, ele será
        informado por e-mail.
      </p>

      <h2>Endereço de entrega</h2>
      <p>
        Confira com atenção o endereço e o CEP no momento da compra. Pedidos devolvidos por
        endereço incorreto ou ausência do destinatário podem ter um novo custo de reenvio.
      </p>

      <h2>Dúvidas</h2>
      <p>
        Fale com a gente em <strong>sac@runmotos.com.br</strong> informando o número do pedido —
        teremos prazer em ajudar.
      </p>
    </LegalPage>
  );
}
