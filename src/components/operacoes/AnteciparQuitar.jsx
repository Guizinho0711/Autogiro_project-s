import { useEffect, useState } from "react";
import { operacaoService as api } from "../../services/operacaoService.js";
import { formatDate, formatMoney, todayISO } from "../../utils/format.js";
import { uid } from "../../utils/id.js";

// O FinOps não aceita pagamento com data futura: com a data de referência no futuro, a conta usa
// essa data, mas o registro fica com a data de hoje.
const dataPagamento = (ref) => (ref > todayISO() ? todayISO() : ref);

function Antecipar({ id, dataRef, parcelasAbertas, onFeito }) {
  const max = Math.max(0, parcelasAbertas - 1);
  const [qtd, setQtd] = useState(Math.min(2, max) || 1);
  const [modo, setModo] = useState("ULTIMAS");
  const [sim, setSim] = useState({ status: "idle" });
  const [conf, setConf] = useState({ status: "idle" });
  useEffect(() => { setSim({ status: "idle" }); setConf({ status: "idle" }); }, [qtd, modo, dataRef]);

  const simular = async () => {
    setSim({ status: "loading" });
    try { setSim({ status: "ok", r: await api.simularAmortizacao(id, { quantidadeParcelas: qtd, modo, dataReferencia: dataRef }) }); }
    catch (e) { setSim({ status: "error", msg: e.message }); }
  };
  const confirmar = async () => {
    setConf({ status: "loading" });
    try {
      const r = await api.amortizar(id, { quantidadeParcelas: qtd, modo, dataPagamento: dataPagamento(dataRef), identificadorPagamento: `AMT-${uid().slice(0, 12)}` });
      setConf({ status: "ok", r });
    } catch (e) { setConf({ status: "error", msg: e.message }); }
  };
  const r = sim.r;
  return (
    <section className="panel" aria-labelledby="ant-t">
      <h2 id="ant-t" className="h2 h2--flush">Antecipar parcelas</h2>
      <p className="muted small">Pague parcelas futuras antes do vencimento, com desconto dos juros. As últimas reduzem o prazo e dão mais desconto.</p>
      {max < 1 ? <p className="muted">Não há parcelas suficientes em aberto para antecipar. Use a quitação abaixo.</p> : (
        <>
          <div className="form-grid ant-grid">
            <div className="field"><label htmlFor="ant-q">Quantas parcelas</label><input id="ant-q" type="number" min="1" max={max} value={qtd} onChange={(e) => setQtd(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} /></div>
            <div className="field"><label htmlFor="ant-m">Quais</label><select id="ant-m" value={modo} onChange={(e) => setModo(e.target.value)}><option value="ULTIMAS">As últimas (reduz o prazo)</option><option value="PROXIMAS">As próximas a vencer</option></select></div>
            <button type="button" className="btn btn--ghost" onClick={simular} disabled={sim.status === "loading"}>{sim.status === "loading" ? "Calculando…" : "Simular antecipação"}</button>
          </div>
          <p className="form-error" role="alert">{sim.status === "error" ? sim.msg : ""}</p>
          {r && conf.status !== "ok" && (
            <div aria-live="polite">
              <div className="stats">
                <div className="stat stat--hero"><span className="muted">Você paga hoje</span><strong>{formatMoney(r.totais.valorAPagar)}</strong></div>
                <div className="stat"><span className="muted">Desconto</span><strong>{formatMoney(r.totais.desconto)}</strong></div>
                <div className="stat"><span className="muted">Saldo devedor depois</span><strong>{formatMoney(r.saldoDevedorApos)}</strong></div>
                <div className="stat"><span className="muted">Parcelas que restam</span><strong>{r.quantidadeParcelasRestantes}</strong></div>
              </div>
              <div className="wide">
                <table className="table">
                  <caption className="sr-only">Parcelas antecipadas</caption>
                  <thead><tr><th>Nº</th><th>Vencimento</th><th className="num">Parcela</th><th className="num">Valor hoje</th><th className="num">Desconto</th></tr></thead>
                  <tbody>{r.parcelas.map((p) => <tr key={p.numero}><td>{p.numero}</td><td>{formatDate(p.vencimento)}</td><td className="num">{formatMoney(p.valorParcela)}</td><td className="num">{formatMoney(p.valorPresente)}</td><td className="num">{formatMoney(p.desconto)}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="form-error" role="alert">{conf.status === "error" ? conf.msg : ""}</p>
              <button type="button" className="btn" onClick={confirmar} disabled={conf.status === "loading"}>{conf.status === "loading" ? "Registrando…" : `Confirmar antecipação de ${formatMoney(r.totais.valorAPagar)}`}</button>
            </div>
          )}
          {conf.status === "ok" && <div className="alert alert--ok" role="status"><p>Antecipação registrada: {conf.r.quantidadeParcelas} parcela(s), {formatMoney(conf.r.totais.valorAPagar)} pagos com {formatMoney(conf.r.totais.desconto)} de desconto.</p><button type="button" className="btn btn--small" onClick={onFeito}>Atualizar a operação</button></div>}
        </>
      )}
    </section>
  );
}

function Quitar({ id, dataRef, onFeito }) {
  const [q, setQ] = useState({ status: "loading" });
  const [conf, setConf] = useState({ status: "idle" });
  const [certeza, setCerteza] = useState(false);
  useEffect(() => {
    let vivo = true; setQ({ status: "loading" }); setCerteza(false); setConf({ status: "idle" });
    api.liquidacao(id, dataPagamento(dataRef)).then((r) => vivo && setQ({ status: "ok", r }), (e) => vivo && setQ({ status: "error", msg: e.message }));
    return () => { vivo = false; };
  }, [id, dataRef]);
  const quitar = async () => {
    setConf({ status: "loading" });
    try {
      const r = await api.liquidar(id, { valor: q.r.valorParaQuitar, dataPagamento: q.r.dataReferencia, identificadorPagamento: `LIQ-${uid().slice(0, 12)}`, origem: "CLIENTE" });
      setConf({ status: "ok", r });
    } catch (e) { setConf({ status: "error", msg: e.message }); setCerteza(false); }
  };
  return (
    <section className="panel" aria-labelledby="liq-t">
      <h2 id="liq-t" className="h2 h2--flush">Quitar a operação</h2>
      <p className="muted small">Paga tudo de uma vez: as parcelas vencidas com encargos e as que vão vencer com desconto dos juros.</p>
      {q.status === "loading" && <p className="muted" aria-busy="true">Calculando o valor para quitar…</p>}
      {q.status === "error" && <p className="form-error" role="alert">{q.msg}</p>}
      {q.status === "ok" && conf.status !== "ok" && (() => {
        const r = q.r;
        return (
          <>
            <div className="stats">
              <div className="stat stat--hero"><span className="muted">Para quitar em {formatDate(r.dataReferencia)}</span><strong>{formatMoney(r.valorParaQuitar)}</strong></div>
              <div className="stat"><span className="muted">Saldo devedor</span><strong>{formatMoney(r.saldoDevedor)}</strong></div>
              <div className="stat"><span className="muted">Vencidas com encargos</span><strong>{formatMoney(r.vencidas.total)}</strong></div>
              <div className="stat"><span className="muted">Desconto nas a vencer</span><strong>{formatMoney(r.aVencer.desconto)}</strong></div>
            </div>
            <p className="form-error" role="alert">{conf.status === "error" ? conf.msg : ""}</p>
            {!certeza
              ? <button type="button" className="btn btn--ghost" onClick={() => setCerteza(true)}>Quitar por {formatMoney(r.valorParaQuitar)}</button>
              : <div className="pedido__acoes"><button type="button" className="btn btn--danger" onClick={quitar} disabled={conf.status === "loading"}>{conf.status === "loading" ? "Quitando…" : "Confirmar quitação"}</button><button type="button" className="link-btn" onClick={() => setCerteza(false)}>Cancelar</button><span className="muted small">Isso encerra a operação e não pode ser desfeito.</span></div>}
          </>
        );
      })()}
      {conf.status === "ok" && <div className="alert alert--ok" role="status"><p>Operação quitada com {formatMoney(conf.r.valor)} em {formatDate(conf.r.dataPagamento)}.</p><button type="button" className="btn btn--small" onClick={onFeito}>Atualizar a operação</button></div>}
    </section>
  );
}

/** Aba "Antecipar e quitar" do detalhe da operação (rotas de amortização e liquidação do FinOps). */
export function AnteciparQuitar({ id, dataRef, operacao, parcelas, onMudou }) {
  if (operacao.status === "LIQUIDADA") return <p className="state">Esta operação já está quitada.</p>;
  const abertas = parcelas.filter((p) => p.status !== "PAGA").length;
  return (
    <div className="ant-quitar">
      <Antecipar id={id} dataRef={dataRef} parcelasAbertas={abertas} onFeito={onMudou} />
      <Quitar id={id} dataRef={dataRef} onFeito={onMudou} />
      {dataRef > todayISO() && <p className="muted small">A data de referência está no futuro: os valores são calculados para ela, mas o registro fica com a data de hoje.</p>}
    </div>
  );
}
