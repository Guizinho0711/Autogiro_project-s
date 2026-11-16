import { useEffect, useRef, useState } from "react";
import { pedidoService, REGRA_DECISAO_DEMO } from "../../services/pedidoService.js";
import { scoreService } from "../../services/scoreService.js";
import { formatDate, formatMoney } from "../../utils/format.js";

const pct = (n) => (n == null ? "—" : `${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`);

function Etapa({ estado, titulo, children }) {
  // estado: "feito" | "agora" | "falhou" | "depois"
  return (
    <li className={`etapa etapa--${estado}`}>
      <span className="etapa__marca" aria-hidden="true">
        {estado === "feito" ? <svg viewBox="0 0 16 16" width="12" height="12"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          : estado === "falhou" ? <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg> : null}
      </span>
      <div className="etapa__texto"><strong>{titulo}</strong>{children && <div className="muted small">{children}</div>}</div>
      <span className="sr-only">{{ feito: "concluída", agora: "em andamento", falhou: "não concluída", depois: "a seguir" }[estado]}</span>
    </li>
  );
}

function OpcaoSistema({ sim, escolhido, onEscolher, desabilitado }) {
  const primeira = sim.cronograma?.[0]?.valor, ultima = sim.cronograma?.at(-1)?.valor;
  return (
    <button type="button" className={`opcao${escolhido ? " is-on" : ""}`} aria-pressed={escolhido} onClick={onEscolher} disabled={desabilitado}>
      <span className="opcao__nome">{sim.sistema === "PRICE" ? "PRICE: parcelas iguais" : "SAC: parcelas que diminuem"}</span>
      <span className="opcao__valor">{sim.sistema === "PRICE" ? formatMoney(primeira) : `${formatMoney(primeira)} a ${formatMoney(ultima)}`}</span>
      <dl className="opcao__dl">
        <div><dt>Total de juros</dt><dd>{formatMoney(sim.totalJuros)}</dd></div>
        <div><dt>Total pago</dt><dd>{formatMoney(sim.totalPago)}</dd></div>
        <div><dt>IOF</dt><dd>{sim.encargos ? formatMoney(sim.encargos.total) : "—"}</dd></div>
        <div><dt>CET ao ano</dt><dd>{pct(sim.cet?.anualPercentual)}</dd></div>
      </dl>
    </button>
  );
}

/** Acompanha o pedido depois do Score: espera o Juros, mostra PRICE e SAC e registra a escolha. */
export function PedidoAcompanhamento({ numero, score }) {
  const [fase, setFase] = useState("esperando"); // esperando | chegou | definindo | definida | tempo | erro
  const [tick, setTick] = useState({ decorrido: 0, limite: pedidoService.limiteSegundos, tentativa: 0 });
  const [op, setOp] = useState(null);
  const [erro, setErro] = useState("");
  const [sistema, setSistema] = useState("PRICE");
  const [definida, setDefinida] = useState(null);
  const [rodada, setRodada] = useState(0);
  const ctrl = useRef(null);
  const scoreSimuladoJurosReal = scoreService.modoDemonstracao && !pedidoService.juroSimulado;

  useEffect(() => {
    if (fase !== "esperando") return undefined;
    const c = new AbortController(); ctrl.current = c;
    pedidoService.acompanhar(numero, { signal: c.signal, onTick: setTick }).then(
      (o) => { if (c.signal.aborted) return; if (o.estado === "DEFINIDA") { setDefinida(o); setFase("definida"); } else { setOp(o); setFase("chegou"); } },
      (e) => { if (c.signal.aborted) return; setErro(e.message); setFase(e.code === "TEMPO_ESGOTADO" ? "tempo" : "erro"); },
    );
    return () => c.abort();
  }, [numero, rodada, fase]);

  const definir = async () => {
    setFase("definindo"); setErro("");
    try { setDefinida(await pedidoService.definir(op, sistema)); setFase("definida"); }
    catch (e) { setErro(e.message); setFase("chegou"); }
  };
  const esperarMais = () => { setErro(""); setFase("esperando"); setRodada((r) => r + 1); };
  const progresso = Math.min(100, (tick.decorrido / Math.max(1, tick.limite)) * 100);
  const chegou = ["chegou", "definindo", "definida"].includes(fase);
  const numeroFinal = definida?.identificador ?? numero;

  return (
    <section className="panel pedido" aria-labelledby="pedido-t">
      <div className="credit-form__head">
        <h2 id="pedido-t" className="h2 h2--flush">Pedido de financiamento</h2>
        <span className="pedido__numero">{numero}</span>
      </div>
      <p className="muted small">O AutoGiro mandou o pedido ao Score. O Score passa para a Decisão, e a Decisão, se aprovar, para o serviço de juros. Aqui o site consulta o serviço de juros até a simulação chegar.</p>
      {pedidoService.juroSimulado && <p className="muted small">Modo demonstração: Decisão e serviço de juros simulados no navegador ({REGRA_DECISAO_DEMO}).</p>}
      {scoreSimuladoJurosReal && <p className="alert alert--bad small" role="note">O Score está em modo simulado, então o pedido não foi enviado à Decisão de verdade e o serviço de juros não vai receber nada. Ligue o Score real na tela <a className="link" href="#/conexoes">Conexões</a>.</p>}

      <ol className="etapas">
        <Etapa estado="feito" titulo="Enviado ao Score">Score {score} calculado. O próprio Score encaminha para a Decisão.</Etapa>
        <Etapa estado={chegou ? "feito" : fase === "esperando" ? "agora" : "falhou"} titulo="Decisão e serviço de juros">
          {fase === "esperando" && <>Consultando o serviço de juros… {Math.round(tick.decorrido)} de {Math.round(tick.limite)} s</>}
          {chegou && op && <>Aprovado. Taxa do perfil {op.taxa?.faixaRisco}: {pct(op.taxa?.taxaFinalMes)} ao mês.</>}
          {chegou && !op && definida && <>A operação já tinha sido definida.</>}
          {(fase === "tempo" || fase === "erro") && erro}
        </Etapa>
        <Etapa estado={fase === "definida" ? "feito" : chegou ? "agora" : "depois"} titulo="Escolha entre PRICE e SAC" />
        <Etapa estado={fase === "definida" ? "feito" : "depois"} titulo="Operação registrada">
          {fase === "definida" && <>O serviço de juros enviou a operação ao FinOps e ao grupo de Documentos.</>}
        </Etapa>
      </ol>

      {fase === "esperando" && (
        <div className="pedido__espera">
          <div className="progresso" role="progressbar" aria-label="Tempo de espera" aria-valuemin={0} aria-valuemax={Math.round(tick.limite)} aria-valuenow={Math.round(tick.decorrido)}><span style={{ width: `${progresso}%` }} /></div>
          <button type="button" className="link-btn" onClick={() => { ctrl.current?.abort(); setErro("Acompanhamento parado. Você pode retomar quando quiser."); setFase("tempo"); }}>Parar de esperar</button>
        </div>
      )}

      {(fase === "tempo" || fase === "erro") && (
        <div className="pedido__acoes">
          <button type="button" className="btn btn--small" onClick={esperarMais}>Continuar esperando</button>
          {fase === "erro" && <a className="btn btn--ghost btn--small" href="#/conexoes">Conferir conexões</a>}
        </div>
      )}

      {chegou && op && fase !== "definida" && (
        <div className="pedido__escolha">
          <p>Simulação do serviço de juros para {formatMoney(op.entrada.valor)} em {op.entrada.prazoMeses}x. Escolha o sistema:</p>
          <div className="opcoes" role="group" aria-label="Sistema de amortização">
            {["PRICE", "SAC"].filter((s) => op.simulacoes?.[s]).map((s) => <OpcaoSistema key={s} sim={op.simulacoes[s]} escolhido={sistema === s} onEscolher={() => setSistema(s)} desabilitado={fase === "definindo"} />)}
          </div>
          <p className="form-error" role="alert">{erro}</p>
          <button type="button" className="btn" onClick={definir} disabled={fase === "definindo"}>{fase === "definindo" ? "Registrando…" : `Contratar com ${sistema}`}</button>
          {op.demonstracao && <p className="muted small">IOF e CET estimados no navegador. No serviço de juros real, os valores vêm de lá.</p>}
        </div>
      )}

      {fase === "definida" && (
        <div className="alert alert--ok" role="status">
          <p><strong>Operação {numeroFinal} registrada{definida?.definicao?.sistema ? ` com ${definida.definicao.sistema}` : ""}.</strong> {definida?.definicao?.definidoEm && `Definida em ${formatDate(definida.definicao.definidoEm)}.`} Em instantes ela aparece em Minhas operações.</p>
          <a className="btn btn--small" href={`#/operacoes/${encodeURIComponent(numeroFinal)}`}>Ver a operação</a>
        </div>
      )}
    </section>
  );
}
