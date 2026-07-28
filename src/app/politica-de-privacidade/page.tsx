import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de Privacidade" };

export default function Page() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="25/06/2026">
      <p>
        Esta política descreve como a RunMotos coleta, usa e protege seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
      </p>
      <h2>Quem é a controladora dos seus dados</h2>
      <p>
        A <strong>RunMotos.com.br</strong> é uma das marcas da{" "}
        <strong>Altustec</strong> (CNPJ 27.111.744/0001-30), responsável (controladora) pelo
        tratamento dos dados pessoais coletados nesta loja.
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
      <h2>Cookies e ferramentas de análise</h2>
      <p>
        Utilizamos cookies e ferramentas de análise para entender como você navega e melhorar
        a sua experiência. Entre elas, o <strong>Microsoft Clarity</strong>, que registra de
        forma agregada e anônima dados de uso (como cliques, rolagem e mapas de calor). Esses
        dados não são usados para identificá-lo pessoalmente. Você pode bloquear cookies nas
        configurações do seu navegador. Saiba mais na{" "}
        <a
          href="https://privacy.microsoft.com/privacystatement"
          target="_blank"
          rel="noopener noreferrer"
        >
          Declaração de Privacidade da Microsoft
        </a>
        .
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
