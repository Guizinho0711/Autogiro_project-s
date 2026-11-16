import { useMemo, useState } from "react";
import { simular } from "../../services/simulacaoService.js";
import { faixasContrataveis, taxaDaFaixa } from "../../services/creditoService.js";
import { formatMoney } from "../../utils/format.js";

const brl0 = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;

function Faixa({ id, label, valor, min, max, step, onChange, mostrar }) {
  const p = `${((valor - min) / (max - min)) * 100}%`;
  return (
    <div className="range">
      <div className="range__top"><label htmlFor={id}>{label}</label><output htmlFor={id}>{mostrar(valor)}</output></div>
      <input id={id} type="range" min={min} max={max} step={step} value={valor} style={{ "--p": p }} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={mostrar(valor)} />
    </div>
  );
}

/** Simulador da chamada: arraste e veja a parcela mudar. Usa as mesmas taxas e o mesmo cálculo do simulador completo. */
export function QuickSim({ politica, onVerVeiculos }) {
  const [valor, setValor] = useState(90000);
  const [entradaPct, setEntradaPct] = useState(20);
  const [meses, setMeses] = useState(48);
  const [faixa, setFaixa] = useState("B");
  const taxa = politica ? taxaDaFaixa(politica, faixa) : null;
  const entrada = Math.round((valor * entradaPct) / 100);
  const r = useMemo(() => (taxa == null ? null : simular({ valorVeiculo: valor, entrada, meses, taxaMensal: taxa, sistema: "PRICE" })), [valor, entrada, meses, taxa]);
  const parcela = r ? formatMoney(r.primeiraParcela) : "—";

  return (
    <section className="qs" aria-labelledby="qs-t">
      <div className="qs__head">
        <h2 id="qs-t" className="qs__title">Quanto fica a parcela</h2>
        <div className="seg" role="group" aria-label="Perfil de crédito">
          {(politica ? faixasContrataveis(politica) : []).map((f) => (
            <button key={f.faixa} type="button" aria-pressed={faixa === f.faixa} onClick={() => setFaixa(f.faixa)} title={`${f.descricao}: ${pct(f.taxaMensalPercentual)} ao mês`}>{f.faixa}</button>
          ))}
        </div>
      </div>
      <p className="qs__readout" aria-live="polite" aria-atomic="true">
        <span key={parcela} className="is-tick">{parcela}</span><small>/mês</small>
      </p>
      <p className="qs__sub">{meses}x, perfil {faixa}{taxa != null && ` a ${pct(taxa)} ao mês`}. Total de juros {r ? brl0(r.totalJuros) : "—"}.</p>

      <div className="qs__controls">
        <Faixa id="qs-valor" label="Valor do veículo" valor={valor} min={15000} max={250000} step={1000} onChange={setValor} mostrar={brl0} />
        <Faixa id="qs-entrada" label="Entrada" valor={entradaPct} min={0} max={60} step={5} onChange={setEntradaPct} mostrar={(v) => `${v}% (${brl0(Math.round((valor * v) / 100))})`} />
        <Faixa id="qs-prazo" label="Prazo" valor={meses} min={politica?.prazoMinMeses ?? 12} max={politica?.prazoMaxMeses ?? 60} step={6} onChange={setMeses} mostrar={(v) => `${v} meses`} />
      </div>

      <div className="qs__foot">
        <span>Sistema PRICE, sem IOF e tarifas. A taxa final sai da análise de crédito.</span>
        <button type="button" className="btn btn--small" onClick={() => onVerVeiculos(valor)}>Ver veículos até {brl0(valor)}</button>
      </div>
    </section>
  );
}

const ICONE = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const FATOS = [
  [<svg {...ICONE} key="i"><path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" /></svg>, "Taxas publicadas", "De 1,50% a 3,00% ao mês, conforme o perfil de crédito."],
  [<svg {...ICONE} key="i"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>, "Simulação sem cadastro", "Você vê a parcela antes de informar qualquer dado."],
  [<svg {...ICONE} key="i"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /></svg>, "Cálculo exato", "PRICE e SAC calculados centavo por centavo, com o cronograma completo."],
  [<svg {...ICONE} key="i"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>, "Dados protegidos", "Usados só para a análise, conforme a LGPD."],
];

export function FaixaConfianca() {
  return (
    <ul className="trust" aria-label="Por que confiar">
      {FATOS.map(([icone, t, d]) => <li key={t}>{icone}<strong>{t}</strong><span>{d}</span></li>)}
    </ul>
  );
}
