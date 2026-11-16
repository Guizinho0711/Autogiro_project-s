import { useMemo, useState } from "react";
import { esteiraService } from "../services/esteiraService.js";
import { vehicleService } from "../services/vehicleService.js";
import { scoreService, montarRequisicao, faixaJuros, ROTULO_FAIXA_SCORE } from "../services/scoreService.js";
import { simular } from "../services/simulacaoService.js";
import { usePolitica } from "../hooks/usePolitica.js";
import { useAsync } from "../hooks/useAsync.js";
import { JsonTree } from "../components/ui/JsonTree.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { SimularFinanciamentoDialog } from "../components/vehicles/SimularFinanciamentoDialog.jsx";
import { cpfValido, mascaraCpf, soDigitos } from "../utils/cpf.js";
import { formatMoney, parseNum, todayISO } from "../utils/format.js";

const VAZIO = {
  cpf: "", idade: "", estadoCivil: "", numeroDependentes: "0", rendaMensal: "", dividaTotal: "0",
  limiteTotal: "0", limiteUtilizado: "0", diasAtraso: "0", mesesEmprego: "", mesesBanco: "",
  veiculoId: "", valorVeiculo: "", entrada: "", prazoMeses: "48", amortizacao: "PRICE", forcarRecalculo: false,
};
const EXEMPLO = {
  cpf: "529.982.247-25", idade: "34", estadoCivil: "CASADO", numeroDependentes: "1", rendaMensal: "8500", dividaTotal: "1200",
  limiteTotal: "6000", limiteUtilizado: "1500", diasAtraso: "0", mesesEmprego: "36", mesesBanco: "48",
};
const ESTADOS = [["SOLTEIRO", "Solteiro(a)"], ["CASADO", "Casado(a)"], ["UNIAO_ESTAVEL", "União estável"], ["DIVORCIADO", "Divorciado(a)"], ["VIUVO", "Viúvo(a)"]];
const pct = (n, d = 2) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
const novoIdentificador = () => `OP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

/** Lê o formulário e devolve { dados } ou { erros }. Regras iguais às do Score (e CPF válido para o Juros). */
function validar(f, politica) {
  const e = {};
  const int = (k) => { const n = Number(f[k]); return f[k] !== "" && Number.isInteger(n) ? n : NaN; };
  const d = {
    cpf: soDigitos(f.cpf), idade: int("idade"), estadoCivil: f.estadoCivil, numeroDependentes: int("numeroDependentes"),
    rendaMensal: parseNum(f.rendaMensal), dividaTotal: parseNum(f.dividaTotal), limiteTotal: parseNum(f.limiteTotal),
    limiteUtilizado: parseNum(f.limiteUtilizado), diasAtraso: int("diasAtraso"), mesesEmprego: int("mesesEmprego"), mesesBanco: int("mesesBanco"),
    valorVeiculo: parseNum(f.valorVeiculo), entrada: parseNum(f.entrada), prazoMeses: Number(f.prazoMeses), amortizacao: f.amortizacao,
  };
  if (!cpfValido(d.cpf)) e.cpf = "CPF inválido. Confira os 11 dígitos.";
  if (!(d.idade >= 18 && d.idade <= 120)) e.idade = "Idade entre 18 e 120 anos.";
  if (!d.estadoCivil) e.estadoCivil = "Escolha o estado civil.";
  if (!(d.numeroDependentes >= 0)) e.numeroDependentes = "Número inteiro, zero ou mais.";
  if (!(d.rendaMensal >= 0)) e.rendaMensal = "Informe a renda mensal.";
  if (!(d.dividaTotal >= 0)) e.dividaTotal = "Informe as dívidas (0 se não houver).";
  if (!(d.limiteTotal >= 0)) e.limiteTotal = "Informe o limite (0 se não houver).";
  if (!(d.limiteUtilizado >= 0)) e.limiteUtilizado = "Informe o valor usado (0 se nada).";
  else if (d.limiteUtilizado > d.limiteTotal) e.limiteUtilizado = "Não pode passar do limite total.";
  if (!(d.diasAtraso >= 0)) e.diasAtraso = "Número inteiro, zero ou mais.";
  if (!(d.mesesEmprego >= 0)) e.mesesEmprego = "Em meses, zero ou mais.";
  if (!(d.mesesBanco >= 0)) e.mesesBanco = "Em meses, zero ou mais.";
  if (!(d.valorVeiculo > 0)) e.valorVeiculo = "Informe o valor do veículo.";
  if (!(d.entrada >= 0)) e.entrada = "Informe a entrada (0 se não houver).";
  else if (d.entrada >= d.valorVeiculo) e.entrada = "A entrada deve ser menor que o valor do veículo.";
  const min = politica?.prazoMinMeses ?? 12, max = politica?.prazoMaxMeses ?? 60;
  if (!(d.prazoMeses >= min && d.prazoMeses <= max)) e.prazoMeses = `Prazo de ${min} a ${max} meses.`;
  return Object.keys(e).length ? { erros: e } : { dados: d };
}

function Campo({ id, label, erro, dica, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {(erro || dica) && <span id={`${id}-msg`} className={erro ? "field__error" : "field__hint"}>{erro || dica}</span>}
    </div>
  );
}

function Resultado({ r, politica, dados, veiculo, onSimular }) {
  const fj = faixaJuros(politica, r.scoreFinal);
  const recusado = fj && !fj.permiteContratacao;
  const financiado = dados.valorVeiculo - dados.entrada;
  const est = fj?.permiteContratacao ? simular({ valorVeiculo: dados.valorVeiculo, entrada: dados.entrada, meses: dados.prazoMeses, taxaMensal: fj.taxaMensalPercentual, sistema: dados.amortizacao }) : null;
  const pos = Math.min(100, Math.max(0, r.scoreFinal / 10));
  return (
    <section className="panel result" aria-labelledby="res-t" tabIndex={-1} id="resultado">
      <h2 id="res-t" className="h2 h2--flush">Resultado da análise</h2>
      <div className="result__top">
        <div className="scorebox">
          <span className="muted small">Score</span>
          <strong className="scorebox__n">{r.scoreFinal}</strong>
          <span className="muted small">de 1000</span>
        </div>
        <div className="result__summary">
          <div className="meter" role="img" aria-label={`Score ${r.scoreFinal} de 1000`}>
            <div className="meter__track">{["E", "D", "C", "B", "A"].map((l) => <span key={l} className={`meter__band${fj?.faixa === l ? " is-on" : ""}`}>{l}</span>)}</div>
            <span className="meter__pin" style={{ left: `${pos}%` }} />
          </div>
          <dl className="kv">
            <div><dt>Classificação do Score</dt><dd>{ROTULO_FAIXA_SCORE[r.faixaRisco] ?? r.faixaRisco}</dd></div>
            <div><dt>Perfil de juros</dt><dd>{fj ? (fj.permiteContratacao ? `${fj.faixa}, ${pct(fj.taxaMensalPercentual)} ao mês` : `${fj.faixa}, recusado`) : "—"}</dd></div>
            <div><dt>Chance de inadimplência</dt><dd>{pct(Number(r.probabilidadeDefault) * 100)}</dd></div>
            <div><dt>Origem</dt><dd>{r.origem === "BANCO" ? "Resultado salvo (até 30 dias)" : "Cálculo novo"}</dd></div>
          </dl>
        </div>
      </div>

      {recusado ? (
        <p className="alert alert--bad" role="alert">Score abaixo do mínimo para financiar veículos ({politica.faixas.find((f) => f.faixa === "D").scoreMin} pontos). A contratação seria recusada.</p>
      ) : est && (
        <div className="alert alert--ok">
          <p>Com o perfil <strong>{fj.faixa}</strong>, {formatMoney(financiado)} em {dados.prazoMeses}x pelo {dados.amortizacao}: <strong>{dados.amortizacao === "PRICE" ? `${formatMoney(est.primeiraParcela)} por mês` : `de ${formatMoney(est.primeiraParcela)} a ${formatMoney(est.ultimaParcela)}`}</strong>. Total de juros: {formatMoney(est.totalJuros)}.</p>
          {veiculo && <button type="button" className="btn btn--small" onClick={onSimular}>Abrir o simulador do {veiculo.brand} {veiculo.model}</button>}
        </div>
      )}

      <h3 className="h3">O que pesou no score</h3>
      <ul className="comps">
        {r.componentes.map((c) => (
          <li key={c.nome} className="comp">
            <div className="comp__head"><strong>{c.nome}</strong><span className="muted small">peso {pct(Number(c.pesoPonderado) * 100, 0)}</span><span className="comp__pts">{Number(c.pontuacao)} / {Number(c.pontuacaoMaxima)}</span></div>
            <div className="bar" aria-hidden="true"><span style={{ width: `${(Number(c.pontuacao) / Number(c.pontuacaoMaxima)) * 100}%` }} /></div>
            <p className="muted small">{c.motivo}</p>
          </li>
        ))}
      </ul>

      <details className="sched">
        <summary>Ver a resposta completa do Score</summary>
        <pre className="raw">{JSON.stringify(r, null, 2)}</pre>
      </details>
      <p className="muted small">
        {scoreService.modoDemonstracao
          ? "Modo demonstração: o cálculo foi feito no navegador com as mesmas regras do Score Engine (modelo SCORE_PF v1.1.0). Nada foi enviado."
          : `Calculado pelo Score Engine (${r.modelo?.codigo} ${r.modelo?.versao}). O próprio Score encaminhou o resultado para a Decisão, com o identificador ${r.identificador}.`}
      </p>
    </section>
  );
}

function ConsultaEsteira() {
  const health = useAsync((signal) => esteiraService.health(signal), []);
  const [id, setId] = useState("");
  const [q, setQ] = useState({ status: "idle" });
  const consultar = async (e) => {
    e.preventDefault();
    const v = id.trim();
    if (!v) return setQ({ status: "error", message: "Informe o número da proposta." });
    setQ({ status: "loading" });
    try { setQ({ status: "ok", data: await esteiraService.consultar(v) }); }
    catch (err) { setQ({ status: "error", message: err.message }); }
  };
  return (
    <section className="panel" aria-labelledby="cs">
      <h2 id="cs" className="h2 h2--flush">Consultar proposta na esteira CredCasa</h2>
      <div aria-live="polite" className="esteira-status">
        {health.status === "loading" && <><Skeleton style={{ height: 18, width: "60%" }} /><p className="muted small">Acordando o servidor, pode levar até 1 minuto na primeira vez.</p></>}
        {health.status === "success" && <p><span className="badge badge--ok">Online</span></p>}
        {health.status === "error" && <p><span className="badge badge--bad">Indisponível</span> <span className="muted small">{health.error.message}</span> <button className="link-btn" onClick={health.reload}>Verificar de novo</button></p>}
      </div>
      <form className="inline-form" onSubmit={consultar}>
        <div className="field field--grow"><label htmlFor="pid">Número da proposta</label><input id="pid" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID retornado pela esteira" aria-describedby="perro" /></div>
        <button className="btn" disabled={q.status === "loading"}>{q.status === "loading" ? "Consultando…" : "Consultar"}</button>
      </form>
      <p id="perro" className="form-error" role="alert">{q.status === "error" ? q.message : ""}</p>
      {q.status === "ok" && <div aria-live="polite"><JsonTree data={q.data} /></div>}
    </section>
  );
}

export default function CreditoPage({ veiculoId }) {
  const politica = usePolitica();
  const lista = useAsync((signal) => vehicleService.list({}, signal), []);
  const veiculos = lista.status === "success" ? lista.data.items.filter((v) => v.status !== "reserved") : [];
  const inicial = useMemo(() => ({ ...VAZIO, veiculoId: veiculoId ?? "" }), [veiculoId]);
  const [f, setF] = useState(inicial);
  const [erros, setErros] = useState({});
  const [envio, setEnvio] = useState({ status: "idle" });
  const [simulando, setSimulando] = useState(false);

  // Preenche valor e entrada quando o veículo chega (vindo da página do veículo) ou muda.
  const veiculo = veiculos.find((v) => v.id === f.veiculoId) ?? null;
  const [aplicado, setAplicado] = useState(null);
  if (veiculo && aplicado !== veiculo.id) {
    setAplicado(veiculo.id);
    setF((s) => ({ ...s, valorVeiculo: String(veiculo.priceBRL), entrada: String(Math.round(veiculo.priceBRL * 0.2)) }));
  }

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const prazos = []; for (let m = politica?.prazoMinMeses ?? 12; m <= (politica?.prazoMaxMeses ?? 60); m += 6) prazos.push(m);

  const enviar = async (e) => {
    e.preventDefault();
    const v = validar(f, politica);
    setErros(v.erros ?? {});
    if (v.erros) { document.getElementById(Object.keys(v.erros)[0] === "cpf" ? "c-cpf" : `c-${Object.keys(v.erros)[0]}`)?.focus(); return; }
    const d = v.dados;
    const req = montarRequisicao({ ...d, limiteUtilizado: d.limiteUtilizado, limiteTotal: d.limiteTotal, valorFinanciado: Math.round((d.valorVeiculo - d.entrada) * 100) / 100, identificador: novoIdentificador(), dataLiberacao: todayISO(), forcarRecalculo: f.forcarRecalculo });
    setEnvio({ status: "loading" });
    try {
      const r = await scoreService.avaliar(req);
      setEnvio({ status: "ok", r, dados: d });
      requestAnimationFrame(() => document.getElementById("resultado")?.focus());
    } catch (err) { setEnvio({ status: "error", message: err.message }); }
  };

  const campo = (k, label, props = {}, dica) => (
    <Campo id={`c-${k}`} label={label} erro={erros[k]} dica={dica}>
      <input id={`c-${k}`} value={f[k]} onChange={set(k)} aria-invalid={!!erros[k]} aria-describedby={erros[k] || dica ? `c-${k}-msg` : undefined} {...props} />
    </Campo>
  );

  return (
    <main className="container">
      <section className="intro">
        <h1>Análise de crédito</h1>
        <p>Preencha seus dados para calcular o score. Com ele, sai o seu perfil de juros e a parcela real do financiamento.</p>
        <p className={`badge ${scoreService.modoDemonstracao ? "badge--neutral" : "badge--ok"} mode`}>{scoreService.modoDemonstracao ? "Modo demonstração: cálculo no navegador" : "Conectado ao Score Engine"}</p>
      </section>

      <form className="panel credit-form" onSubmit={enviar} noValidate aria-describedby="envio-erro">
        <div className="credit-form__head">
          <h2 className="h2 h2--flush">Seus dados</h2>
          <button type="button" className="btn btn--ghost btn--small" onClick={() => { setF((s) => ({ ...s, ...EXEMPLO })); setErros({}); }}>Preencher exemplo</button>
        </div>
        <fieldset>
          <legend>Cadastro</legend>
          <div className="form-grid">
            {campo("cpf", "CPF", { inputMode: "numeric", autoComplete: "off", placeholder: "000.000.000-00", value: mascaraCpf(f.cpf) })}
            {campo("idade", "Idade", { inputMode: "numeric" })}
            <Campo id="c-estadoCivil" label="Estado civil" erro={erros.estadoCivil}>
              <select id="c-estadoCivil" value={f.estadoCivil} onChange={set("estadoCivil")} aria-invalid={!!erros.estadoCivil}><option value="">Escolha</option>{ESTADOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Campo>
            {campo("numeroDependentes", "Dependentes", { inputMode: "numeric" })}
          </div>
        </fieldset>
        <fieldset>
          <legend>Renda e dívidas</legend>
          <div className="form-grid">
            {campo("rendaMensal", "Renda mensal (R$)", { inputMode: "decimal" })}
            {campo("dividaTotal", "Dívidas em aberto (R$)", { inputMode: "decimal" }, "Soma de empréstimos e financiamentos.")}
            {campo("limiteTotal", "Limite do cartão e cheque especial (R$)", { inputMode: "decimal" })}
            {campo("limiteUtilizado", "Quanto desse limite está usado (R$)", { inputMode: "decimal" })}
            {campo("diasAtraso", "Dias de atraso nos últimos 12 meses", { inputMode: "numeric" })}
            {campo("mesesEmprego", "Meses no emprego atual", { inputMode: "numeric" })}
            {campo("mesesBanco", "Meses de conta no banco", { inputMode: "numeric" })}
          </div>
        </fieldset>
        <fieldset>
          <legend>Financiamento</legend>
          <div className="form-grid">
            <Campo id="c-veiculoId" label="Veículo (opcional)">
              <select id="c-veiculoId" value={f.veiculoId} onChange={(e) => { setAplicado(null); set("veiculoId")(e); }}>
                <option value="">Outro valor</option>
                {veiculos.map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year}, {formatMoney(v.priceBRL)}</option>)}
              </select>
            </Campo>
            {campo("valorVeiculo", "Valor do veículo (R$)", { inputMode: "decimal" })}
            {campo("entrada", "Entrada (R$)", { inputMode: "decimal" })}
            <Campo id="c-prazoMeses" label="Prazo" erro={erros.prazoMeses}>
              <select id="c-prazoMeses" value={f.prazoMeses} onChange={set("prazoMeses")}>{prazos.map((m) => <option key={m} value={m}>{m} meses</option>)}</select>
            </Campo>
            <Campo id="c-amortizacao" label="Sistema">
              <select id="c-amortizacao" value={f.amortizacao} onChange={set("amortizacao")}><option value="PRICE">PRICE (parcelas fixas)</option><option value="SAC">SAC (parcelas decrescentes)</option></select>
            </Campo>
          </div>
        </fieldset>
        <label className="check"><input type="checkbox" checked={f.forcarRecalculo} onChange={set("forcarRecalculo")} /><span>Calcular de novo, mesmo que já exista um resultado dos últimos 30 dias</span></label>
        <p id="envio-erro" className="form-error" role="alert">{envio.status === "error" ? envio.message : Object.keys(erros).length ? "Confira os campos destacados." : ""}</p>
        <div className="credit-form__actions">
          <button className="btn" disabled={envio.status === "loading"}>{envio.status === "loading" ? "Calculando…" : "Calcular score"}</button>
          <p className="muted small">Seus dados são usados só para este cálculo. Veja os <a className="link" href="#/termos">Termos de uso</a>.</p>
        </div>
      </form>

      <div aria-live="polite">
        {envio.status === "loading" && <div className="panel"><Skeleton style={{ height: 120, width: "100%" }} /></div>}
        {envio.status === "ok" && <Resultado r={envio.r} politica={politica} dados={envio.dados} veiculo={veiculo} onSimular={() => setSimulando(true)} />}
      </div>

      <ConsultaEsteira />
      {simulando && veiculo && envio.r && <SimularFinanciamentoDialog vehicle={veiculo} faixaInicial={faixaJuros(politica, envio.r.scoreFinal)?.faixa} onClose={() => setSimulando(false)} />}
    </main>
  );
}
