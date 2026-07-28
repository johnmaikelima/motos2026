import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { getStoreSettings } from "@/lib/store-settings";

export const metadata: Metadata = { title: "Política de Envio e Frete" };
export const dynamic = "force-dynamic";

function formatCep(cep: string): string {
  const d = (cep || "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}

export default async function Page() {
  const s = await getStoreSettings();

  const origem = s.address || "nosso Centro de Distribuição";
  const cep = formatCep(s.originCep);
  const whatsapp = s.whatsapp || s.contactPhone;
  const telefone = s.contactPhone;
  const email = s.contactEmail || "contato@runmotos.com.br";

  return (
    <LegalPage title="Política de Envio e Frete" updatedAt="25/06/2026">
      <p>
        A <strong>{s.storeName}</strong> preza pela agilidade e transparência em todo o
        processo de entrega. Abaixo você encontra todas as informações sobre nossos prazos e
        métodos de envio.
      </p>

      <h2>1. Prazos de envio e entrega</h2>
      <p>O prazo de entrega é composto por duas etapas:</p>
      <ul>
        <li>
          <strong>Processamento (separação):</strong> tempo para confirmação do pagamento,
          separação, conferência e embalagem do produto em nosso Centro de Distribuição —{" "}
          <strong>1 a 3 dias úteis</strong> após a confirmação do pagamento.
        </li>
        <li>
          <strong>Entrega (transporte):</strong> tempo de transporte, que varia de acordo com o
          CEP e o método de envio escolhido. O prazo exato é exibido no checkout.
        </li>
      </ul>
      <p>
        O <strong>prazo total</strong> é a soma do tempo de processamento + tempo de entrega.
        Pagamentos via PIX costumam confirmar na hora; cartão pode levar algumas horas.
      </p>

      <h2>2. Cálculo do frete e logística</h2>
      <p>
        O custo do frete é calculado automaticamente após você informar o <strong>CEP</strong> de
        destino, tanto na página do produto quanto no carrinho. O cálculo leva em consideração:
      </p>
      <ul>
        <li>
          <strong>Local de origem do envio:</strong> {origem}
          {cep ? ` – CEP ${cep}` : ""}.
        </li>
        <li>
          <strong>Plataforma de envio:</strong> utilizamos a <strong>Envia.com</strong>, com
          parceria entre diversas transportadoras (Correios, Jadlog, entre outras) para garantir
          o melhor custo e prazo para a sua região.
        </li>
        <li>
          <strong>Peso e dimensões:</strong> volume e peso total dos produtos no carrinho.
        </li>
      </ul>

      <h2>3. Rastreamento do pedido</h2>
      <p>
        Assim que o pedido for despachado, você receberá o <strong>código de rastreamento</strong>{" "}
        por e-mail e poderá acompanhar o status em <strong>Minha Conta → Pedidos</strong>. As
        atualizações também podem ser consultadas no site da transportadora responsável.
      </p>
      <ul>
        <li>
          Em caso de ausência do destinatário, a transportadora fará até{" "}
          <strong>3 tentativas de entrega</strong>. Sem sucesso, o produto retorna ao nosso Centro
          de Distribuição.
        </li>
        <li>
          O prazo de entrega começa a contar a partir do dia útil seguinte à confirmação do
          pagamento (início do processamento).
        </li>
      </ul>

      <h2>4. Endereço de envio</h2>
      <p>
        É responsabilidade do cliente garantir que o endereço de entrega esteja correto e completo
        no momento da compra. A {s.storeName} não se responsabiliza por entregas em endereços
        incorretos fornecidos pelo cliente. Pedidos devolvidos por endereço incorreto podem ter um
        novo custo de reenvio.
      </p>

      <h2>Central de atendimento</h2>
      <ul>
        {whatsapp && (
          <li>
            <strong>WhatsApp (preferencial):</strong> {whatsapp}
          </li>
        )}
        <li>
          <strong>E-mail:</strong> {email}
        </li>
        {telefone && (
          <li>
            <strong>Telefone:</strong> {telefone}
          </li>
        )}
        <li>
          <strong>Horário:</strong> Seg–Sex: 8h–18h | Sáb: 8h–12h
        </li>
      </ul>
    </LegalPage>
  );
}
