import { useEffect, useMemo, useRef, useState } from "react";
import { simular } from "../../services/simulacaoService.js";
import { faixasContrataveis, taxaDaFaixa } from "../../services/creditoService.js";
import { usePolitica } from "../../hooks/usePolitica.js";
import { formatMoney } from "../../utils/format.js";

const parse = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));
const pct = (n) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;

export function SimularFinanciamentoDialog({ vehicle, onClose }) {
  const dialog = useRef(null);
  const politica = usePolitica();
  const [entrada, setEntrada] = useState(String(Math.round(vehicle.priceBRL * 0.2)));
  const [meses, setMeses] = useState(48);
  const [sistema, setSistema] = useState("PRICE");
  const [faixa, setFaixa] = useState("B");

  useEffect(() => { dialog.current.showModal(); }, []);

  const prazos = useMemo(() => {
    const min = politica?.prazoMinMeses ?? 12, max = politica?.prazoMaxMeses ?? 60;
    const out = []; for (let m = min; m <= max; m += 6) out.push(m); return out;
  }, [politica]);
  const taxa = politica ? taxaDaFaixa(politica, faixa) : null;
  const e = parse(entrada);
  const erro = !(e >= 0) ? "Informe o valor da entrada."
    : e >= vehicle.priceBRL ? "A entrada deve ser menor que o valor do veículo." : "";
  const r = useMemo(() => (erro || taxa == null ? null : simular({ valorVeiculo: vehicle.priceBRL, entrada: e, meses, taxaMensal: taxa, sistema })), [erro, e, meses, taxa, sistema, vehicle]);
  const entradaPct = vehicle.priceBRL ? Math.round((e / vehicle.priceBRL) * 100) : 0;

  return (
    <dialog ref={dialog} className="dialog--wide" onClose={onClose} aria-labelledby="sim-titulo">
      <h2 id="sim-titulo" className="dialog__title">Simular financiamento</h2>
      <p className="muted">{vehicle.brand} {vehicle.model} {vehicle.version}, {vehicle.year}. <strong>{formatMoney(vehicle.priceBRL)}</strong></p>

      <div className="sim-grid">
        <div className="field">
          <label htmlFor="s-entrada">Entrada (R$)</label>
          <input id="s-entrada" inputMode="decimal" value={entrada} onChange={(ev) => setEntrada(ev.target.value)} aria-invalid={!!erro} aria-describedby="s-erro" />
          <div className="chips" role="group" aria-label="Entrada sugerida">
            {[0, 10, 20, 30, 40].map((p) => <button key={p} type="button" className="chip" aria-pressed={entradaPct === p} onClick={() => setEntrada(String(Math.round((vehicle.priceBRL * p) / 100)))}>{p}%</button>)}
          </div>
        </div>
        <div className="field">
          <label htmlFor="s-prazo">Prazo</label>
          <select id="s-prazo" value={meses} onChange={(ev) => setMeses(Number(ev.target.value))}>{prazos.map((m) => <option key={m} value={m}>{m} meses</option>)}</select>
        </div>
        <div className="field">
          <label htmlFor="s-faixa">Perfil de crédito</label>
          <select id="s-faixa" value={faixa} onChange={(ev) => setFaixa(ev.target.value)} disabled={!politica}>
            {(politica ? faixasContrataveis(politica) : [{ faixa: "B", descricao: "Carregando" }]).map((f) => <option key={f.faixa} value={f.faixa}>{f.faixa}: {f.descricao}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="s-sistema">Sistema</label>
          <select id="s-sistema" value={sistema} onChange={(ev) => setSistema(ev.target.value)}>
            <option value="PRICE">PRICE (parcelas fixas)</option>
            <option value="SAC">SAC (parcelas decrescentes)</option>
          </select>
        </div>
      </div>
      <p id="s-erro" className="form-error" role="alert">{erro}</p>
      {taxa != null && <p className="muted small rate-line">Taxa do perfil {faixa}: <strong>{pct(taxa)} ao mês</strong>{politica && ` (${pct(politica.faixas.find((f) => f.faixa === faixa).taxaAnualPercentual)} ao ano)`}</p>}

      <div aria-live="polite">
        {r && (
          <>
            <div className="stats">
              <div className="stat stat--hero"><span className="muted">{sistema === "PRICE" ? "Parcela mensal" : "Primeira parcela"}</span><strong>{formatMoney(r.primeiraParcela)}</strong>{sistema === "SAC" && <span className="muted">última: {formatMoney(r.ultimaParcela)}</span>}</div>
              <div className="stat"><span className="muted">Valor financiado</span><strong>{formatMoney(r.valorFinanciado)}</strong></div>
              <div className="stat"><span className="muted">Total pago</span><strong>{formatMoney(r.totalPago + e)}</strong><span className="muted">com a entrada</span></div>
              <div className="stat"><span className="muted">Total de juros</span><strong>{formatMoney(r.totalJuros)}</strong></div>
            </div>
            <details className="sched">
              <summary>Ver cronograma das {meses} parcelas</summary>
              <div className="wide sched__box">
                <table className="table">
                  <thead><tr><th>Nº</th><th className="num">Parcela</th><th className="num">Juros</th><th className="num">Amortização</th><th className="num">Saldo</th></tr></thead>
                  <tbody>{r.parcelas.map((p) => <tr key={p.numero}><td>{p.numero}</td><td className="num">{formatMoney(p.valor)}</td><td className="num">{formatMoney(p.juros)}</td><td className="num">{formatMoney(p.amortizacao)}</td><td className="num">{formatMoney(p.saldoDevedor)}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </div>
      <p className="muted small">Simulação ilustrativa, sem IOF, tarifas ou seguros. A taxa final depende do score na análise de crédito.</p>
      <div className="dialog__actions"><button className="btn" type="button" onClick={() => dialog.current.close()}>Fechar</button></div>
    </dialog>
  );
}
