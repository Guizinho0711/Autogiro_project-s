const SECOES = [
  ["Aceitação", "Ao acessar ou usar o AutoGiro, você declara que leu e concorda com estes Termos de Uso. Se não concordar, não utilize o site."],
  ["Objeto", "O AutoGiro é uma plataforma de apoio ao financiamento de veículos: exibe veículos, permite simular parcelas e acompanhar operações de crédito. Este é um projeto acadêmico, sem fins comerciais."],
  ["Simulações", "Os valores simulados são ilustrativos. Não incluem IOF, tarifas, seguros ou outros encargos, e não representam oferta, proposta ou garantia de aprovação de crédito. As condições reais dependem de análise."],
  ["Cadastro e dados pessoais", "Os dados informados são usados apenas para operar os serviços do site, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Você pode pedir acesso, correção ou exclusão dos seus dados. Não coletamos mais dados do que o necessário."],
  ["Uso adequado", "É proibido usar o site para fraudar, acessar áreas restritas sem autorização, sobrecarregar os serviços ou copiar o conteúdo para fins comerciais."],
  ["Propriedade intelectual", "O código, o texto e a identidade visual do AutoGiro pertencem à equipe do projeto. Marcas de terceiros citadas pertencem aos seus titulares."],
  ["Limitação de responsabilidade", "O serviço é oferecido no estado em que se encontra, podendo ficar indisponível. A equipe não responde por decisões tomadas com base nas simulações."],
  ["Alterações", "Estes termos podem ser atualizados a qualquer momento. A versão vigente é a publicada nesta página."],
  ["Foro", "Fica eleito o foro da comarca da instituição de ensino da equipe para resolver questões relacionadas a estes termos."],
];

export default function TermosPage() {
  return (
    <main className="container">
      <article className="prose">
        <header className="intro"><h1>Termos de uso</h1><p>Última atualização: novembro de 2026.</p></header>
        {SECOES.map(([t, txt], i) => (
          <section key={t} aria-labelledby={`t${i}`}><h2 id={`t${i}`} className="h2">{i + 1}. {t}</h2><p>{txt}</p></section>
        ))}
        <p className="muted small">Texto-modelo para um projeto acadêmico. Antes de uso comercial, passe por revisão jurídica.</p>
      </article>
    </main>
  );
}
