import { formatMoney } from "../../utils/format.js";

const PASSOS = [
  ["Escolha o veículo", "Filtre por categoria e preço, salve favoritos e compare até três modelos lado a lado."],
  ["Simule a parcela", "Informe entrada, prazo de 12 a 60 meses e o perfil de crédito. Veja PRICE e SAC com o cronograma completo."],
  ["Acompanhe a operação", "Depois de contratado, consulte parcelas, pague com a data que quiser e veja o saldo para quitar."],
];

export function ComoFunciona() {
  return (
    <section className="section" aria-labelledby="como">
      <h2 id="como" className="section__title">Como funciona</h2>
      <ol className="steps">
        {PASSOS.map(([t, d], i) => <li key={t} className="step"><span className="step__n" aria-hidden="true">{i + 1}</span><h3>{t}</h3><p className="muted">{d}</p></li>)}
      </ol>
    </section>
  );
}

export function TaxasPorPerfil({ politica }) {
  if (!politica) return null;
  const ex = { valor: 50000, meses: 48 };
  return (
    <section className="section" aria-labelledby="taxas">
      <h2 id="taxas" className="section__title">Taxas por perfil de crédito</h2>
      <p className="muted section__lead">A taxa depende do score na análise de crédito. Aqui estão as faixas da modalidade de veículos, com prazo de {politica.prazoMinMeses} a {politica.prazoMaxMeses} meses.</p>
      <div className="wide">
        <table className="table">
          <caption className="sr-only">Taxa de juros por faixa de score</caption>
          <thead><tr><th scope="col">Perfil</th><th scope="col">Score</th><th scope="col" className="num">Taxa ao mês</th><th scope="col" className="num">Taxa ao ano</th><th scope="col">Risco</th></tr></thead>
          <tbody>{politica.faixas.map((f) => (
            <tr key={f.faixa}>
              <th scope="row">Perfil {f.faixa}</th><td>{f.scoreMin} a {f.scoreMax}</td>
              <td className="num">{f.permiteContratacao ? `${f.taxaMensalPercentual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%` : "—"}</td>
              <td className="num">{f.permiteContratacao ? `${f.taxaAnualPercentual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%` : "—"}</td>
              <td>{f.descricao}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <p className="muted small">Exemplo: financiar {formatMoney(ex.valor)} em {ex.meses}x. {politica.origem === "juros" ? "Taxas lidas do serviço de juros." : "Tabela de referência da modalidade de veículos."}</p>
    </section>
  );
}

const PERGUNTAS = [
  ["O que é PRICE e o que é SAC?", "Na PRICE, todas as parcelas têm o mesmo valor. Na SAC, a amortização é fixa e a parcela começa mais alta e diminui a cada mês. A SAC costuma render menos juros no total."],
  ["Como a taxa é definida?", "Pelo score de crédito. Cada faixa (A a D) tem uma taxa mensal. Abaixo do score mínimo, a contratação é recusada. No simulador você escolhe o perfil para ter uma ideia; o valor final sai da análise."],
  ["A simulação é uma oferta?", "Não. É uma estimativa sem IOF, tarifas ou seguros. A proposta só vale depois da análise de crédito."],
  ["Posso pagar uma parcela atrasada?", "Sim. Em Minhas operações, a data de referência mostra multa e juros de mora para cada parcela vencida, e o pagamento divide o valor entre encargos, juros e amortização."],
  ["Meus favoritos ficam salvos?", "Ficam neste navegador. Se você limpar os dados do site ou trocar de aparelho, eles não acompanham."],
];

export function Faq() {
  return (
    <section className="section" aria-labelledby="faq">
      <h2 id="faq" className="section__title">Perguntas frequentes</h2>
      <div className="faq">{PERGUNTAS.map(([q, a]) => <details key={q}><summary>{q}</summary><p className="muted">{a}</p></details>)}</div>
    </section>
  );
}
