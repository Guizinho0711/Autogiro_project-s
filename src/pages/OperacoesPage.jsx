import { useMemo, useState } from "react";
import { operacaoService } from "../services/operacaoService.js";
import { useAsync } from "../hooks/useAsync.js";
import { StatusBadge } from "../components/operacoes/StatusBadge.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";
import { STATUS_OPERACAO, formatMoney } from "../utils/format.js";

export default function OperacoesPage({ dataRef }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState("");
  const { status, data, error, reload } = useAsync((signal) => operacaoService.list(dataRef, signal), [dataRef]);

  const items = useMemo(
    () => (data ?? []).filter((o) => (!situacao || o.status === situacao) && (!busca || o.numeroOperacao.toLowerCase().includes(busca.toLowerCase()))),
    [data, busca, situacao]
  );

  return (
    <main className="container">
      <section className="intro"><h1>Minhas operações</h1><p>Acompanhe parcelas, atrasos e pagamentos dos seus financiamentos.</p></section>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field--grow"><label htmlFor="o-busca">Número da operação</label><input id="o-busca" type="search" placeholder="Ex.: OP-2026-0001" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <div className="field"><label htmlFor="o-sit">Situação</label>
          <select id="o-sit" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(STATUS_OPERACAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
      </form>

      <div aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && (
          <div className="wide" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="row-skeleton"><Skeleton style={{ height: 18, width: "100%" }} /></div>)}</div>
        )}
        {status === "error" && <StateMessage role="alert" title="Não foi possível carregar as operações" text={error.message} actionLabel="Tentar de novo" onAction={reload} />}
        {status === "success" && items.length === 0 && <StateMessage title="Nenhuma operação encontrada" text="Revise a busca ou a situação selecionada." />}
        {status === "success" && items.length > 0 && (
          <div className="wide">
            <table className="table">
              <thead><tr><th>Operação</th><th>Produto</th><th>Situação</th><th className="num">Atraso</th><th className="num">Saldo devedor</th><th className="num">Parcelas</th></tr></thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id}>
                    <td><a className="link" href={`#/operacoes/${o.numeroOperacao}`}>{o.numeroOperacao}</a></td>
                    <td>{o.produto.nome}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="num">{o.diasEmAtraso > 0 ? `${o.diasEmAtraso} dias` : "—"}</td>
                    <td className="num">{formatMoney(o.saldoDevedor)}</td>
                    <td className="num">{o.condicoesFinanceiras.quantidadeParcelas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
