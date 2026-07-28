import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = { title: "Sobre nós" };

export default function Page() {
  return (
    <LegalPage title="Sobre a RunMotos">
      <p>
        A RunMotos nasceu da paixão por duas rodas. Somos motociclistas equipando
        motociclistas — sabemos na pele o que é encarar a estrada, a chuva e o trânsito todos
        os dias.
      </p>
      <h2>Nossa missão</h2>
      <p>
        Oferecer jaquetas e equipamentos de alta qualidade, com proteção de verdade, conforto e
        um visual que combina com quem vive sobre a moto.
      </p>
      <h2>Por que comprar com a gente</h2>
      <p>
        Produtos originais e selecionados, atendimento especializado, envio para todo o Brasil e
        compra 100% segura. Mais que uma loja, somos uma comunidade.
      </p>
    </LegalPage>
  );
}
