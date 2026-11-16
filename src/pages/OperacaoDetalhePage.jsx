import { useState } from "react";
import { operacaoService as api } from "../services/operacaoService.js";
import { useAsync } from "../hooks/useAsync.js";
import { StatusBadge } from "../components/operacoes/StatusBadge.jsx";
import { PagarParcelaDialog } from "../components/operacoes/PagarParcelaDialog.jsx";
import { AnteciparQuitar } from "../components/operacoes/AnteciparQuitar.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";
import { TIPO_EVENTO, formatDate, formatMoney, formatPct } from "../utils/format.js";

const TABS = [["resumo", "Resumo"], ["parcelas", "Parcelas"], ["antecipar", "Antecipar e quitar"], ["historico", "Histórico"]];

export default function OperacaoDetalhePage({ id, dataRef }) {
  const [tab, setTab] = useState("resumo");
  const [pagando, setPagando] = useState(null);

  const { status, data, error, reload } = useAsync(async (signal) => {
    const [operacao, resumo, parcelas, historico] = await Promise.all([
      api.get(id, dataRef, signal), api.resumo(id, dataRef, signal), api.parcelas(id, dataRef, signal), api.historico(id, dataRef, signal),
    ]);
    return { operacao, resumo, parcelas, historico };
  }, [id, dataRef]);

  return (
    <main className="container">
      <p className="crumb"><a className="link" href="#/operacoes">← Minhas operações</a></p>

      {status === "loading" && <div aria-busy="true" style={{ padding: "24px 0" }}><Skeleton style={{ height: 32, width: "40%", marginBottom: 16 }} /><Skeleton style={{ height: 120, width: "100%" }} /></div>}
      {status === "error" && <StateMessage role="alert" title={error.status === 404 ? "Operação não encontrada" : "Não foi possível carregar a operação"} text={error.message} actionLabel="Tentar de novo" onAction={reload} />}

      {status === "success" && (() => {
        const { operacao: o, resumo: r, parcelas, historico } = data;
        const c = o.condicoesFinanceiras;
        return (
          <>
            <header className="detail-head"><h1>{o.numeroOperacao}</h1><StatusBadge status={o.status} />{o.diasEmAtraso > 0 && <span className="muted">{o.diasEmAtraso} dias em atraso</span>}</header>

            <div role="tablist" aria-label="Seções da operação" className="tabs">
              {TABS.map(([k, label]) => <button key={k} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`panel-${k}`} className="tab" onClick={() => setTab(k)}>{label}</button>)}
            </div>

            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === "resumo" && (
                <>
                  <div className="stats">
                    {[["Saldo devedor", r.saldoDevedor], ["Para quitar hoje", r.valorParaQuitar], ["Total pago", r.totalPago], ["Valor vencido", r.valorVencido], ["Encargos em aberto", r.encargosEmAberto]].map(([k, v]) => (
                      <div className="stat" key={k}><span className="muted">{k}</span><strong>{formatMoney(v)}</strong></div>
                    ))}
                  </div>
                  <dl className="terms">
                    <div><dt>Valor aprovado</dt><dd>{formatMoney(c.valorAprovado)}</dd></div>
                    <div><dt>Parcelas</dt><dd>{c.quantidadeParcelas}x ({c.sistemaAmortizacao})</dd></div>
                    <div><dt>Juros</dt><dd>{formatPct(c.taxaJuros)} a.m. · {formatPct(c.taxaJurosAnual)} a.a.</dd></div>
                    <div><dt>CET</dt><dd>{formatPct(o.cet.mensal)} a.m. · {formatPct(o.cet.anual)} a.a.</dd></div>
                    <div><dt>Primeiro vencimento</dt><dd>{formatDate(c.primeiroVencimento)}</dd></div>
                    <div><dt>Produto</dt><dd>{o.produto.nome}</dd></div>
                  </dl>
                </>
              )}

              {tab === "parcelas" && (
                <div className="wide">
                  <table className="table">
                    <thead><tr><th>Nº</th><th>Vencimento</th><th className="num">Parcela</th><th className="num">Em aberto</th><th className="num">Encargos</th><th className="num">Para quitar</th><th>Situação</th><th><span className="sr-only">Ação</span></th></tr></thead>
                    <tbody>
                      {parcelas.map((p) => (
                        <tr key={p.numero}>
                          <td>{p.numero}</td><td>{formatDate(p.vencimento)}</td>
                          <td className="num">{formatMoney(p.valorParcela)}</td><td className="num">{formatMoney(p.valorEmAberto)}</td>
                          <td className="num">{p.encargos.total > 0 ? formatMoney(p.encargos.total) : "—"}</td><td className="num">{formatMoney(p.totalParaQuitar)}</td>
                          <td><StatusBadge status={p.status} kind="parcela" /></td>
                          <td><button className="btn btn--small" disabled={p.status === "PAGA"} onClick={() => setPagando(p)} aria-label={`Pagar parcela ${p.numero}`}>Pagar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "antecipar" && <AnteciparQuitar id={id} dataRef={dataRef} operacao={o} parcelas={parcelas} onMudou={reload} />}

              {tab === "historico" && (
                <ol className="timeline">
                  {historico.map((h, i) => (
                    <li key={h.id ?? `c-${i}`}>
                      <strong>{TIPO_EVENTO[h.tipo] ?? h.tipo}</strong>{h.numeroParcela ? ` · parcela ${h.numeroParcela}` : ""}
                      <span className="muted"> · {formatDate(h.dataEfeito)}{h.origem === "CALCULADO" ? " · calculado" : ""}</span>
                      {h.valor != null && <div>{formatMoney(h.valor)}</div>}
                      {h.descricao && <div className="muted">{h.descricao}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {pagando && <PagarParcelaDialog operacaoId={id} parcela={pagando} dataRef={dataRef} onDone={(pagou) => { setPagando(null); if (pagou) reload(); }} />}
          </>
        );
      })()}
    </main>
  );
}
