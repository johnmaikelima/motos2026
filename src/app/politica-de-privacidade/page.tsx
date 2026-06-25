import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Page() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="18/06/2026">
      <p>
        Esta política descreve como a RunMotos coleta, usa e protege seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>
      <h2>Dados que coletamos</h2>
      <p>
        Nome, CPF, e-mail, telefone e endereço — utilizados exclusivamente para processar e
        entregar seu pedido, além de dados de navegação para melhorar sua experiência.
      </p>
      <h2>Como usamos seus dados</h2>
      <p>
        Para processar pagamentos, emitir notas fiscais, realizar entregas e oferecer
        atendimento. Não vendemos seus dados a terceiros.
      </p>
      <h2>Segurança</h2>
      <p>
        Todo o tráfego é criptografado (HTTPS) e os dados sensíveis de integração são
        processados apenas no servidor. Pagamentos são feitos por gateways certificados PCI-DSS.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo
        e-mail <strong>privacidade@runmotos.com.br</strong>.
      </p>
    </LegalPage>
  );
}
