import { useState } from "react";
import { env, envPadrao, salvarConexoes, restaurarConexoes, temAjustes } from "../config/env.js";

// Um serviço por grupo. "health" é o endereço que cada um usa para dizer que está no ar.
const SERVICOS = [
  { id: "score", nome: "Score Engine", grupo: "Grupo do Score", url: "SCORE_URL", mock: "MOCK_SCORE", porta: 8080, health: "/api/v1/score/health",
    uso: "Recebe o pedido e calcula o score. Ele mesmo envia o resultado para a Decisão." },
  { id: "juros", nome: "Serviço de juros", grupo: "Grupo de Juros", url: "JUROS_URL", mock: "MOCK_CREDITO", porta: 3000, health: "/api/health",
    uso: "Taxas por perfil e a simulação PRICE e SAC do pedido. Registra a operação no FinOps." },
  { id: "finops", nome: "Operações (FinOps)", grupo: "Grupo FinOps", url: "API_URL", mock: "MOCK_OPERACOES", porta: 8083, health: "/health",
    uso: "Minhas operações: parcelas, pagamentos, antecipação e quitação." },
];
const normaliza = (u) => u.trim().replace(/\/+$/, "");

async function testar(base, caminho) {
  const inicio = performance.now();
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(normaliza(base) + caminho, { signal: ctrl.signal });
    const ms = Math.round(performance.now() - inicio);
    return r.ok ? { ok: true, msg: `No ar (${ms} ms)` } : { ok: false, msg: `Respondeu com erro ${r.status}` };
  } catch (e) {
    return { ok: false, msg: e.name === "AbortError" ? "Não respondeu em 5 segundos" : "Sem resposta. Confira o IP, a porta e se o serviço está rodando." };
  } finally { clearTimeout(t); }
}

export default function ConexoesPage() {
  const [f, setF] = useState(() => Object.fromEntries(SERVICOS.flatMap((s) => [[s.url, env[s.url]], [s.mock, env[s.mock]]]).concat([["ESPERA_PEDIDO_S", env.ESPERA_PEDIDO_S]])));
  const [teste, setTeste] = useState({});
  const [aviso, setAviso] = useState("");
  const httpsComIp = window.location.protocol === "https:" && SERVICOS.some((s) => !f[s.mock] && /^http:/.test(f[s.url]));
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setAviso(""); };

  const testarUm = async (s) => { setTeste((t) => ({ ...t, [s.id]: { testando: true } })); const r = await testar(f[s.url], s.health); setTeste((t) => ({ ...t, [s.id]: r })); };
  const testarTodos = () => SERVICOS.forEach(testarUm);
  const salvar = (e) => {
    e.preventDefault();
    const espera = Math.min(600, Math.max(15, Number(f.ESPERA_PEDIDO_S) || 120));
    salvarConexoes({ ...f, ...Object.fromEntries(SERVICOS.map((s) => [s.url, normaliza(f[s.url])])), ESPERA_PEDIDO_S: espera });
    setF((s) => ({ ...s, ESPERA_PEDIDO_S: espera }));
    setAviso("Conexões salvas neste navegador. Já valem na próxima ação, sem recarregar.");
  };
  const restaurar = () => {
    restaurarConexoes();
    setF(Object.fromEntries(SERVICOS.flatMap((s) => [[s.url, envPadrao[s.url]], [s.mock, envPadrao[s.mock]]]).concat([["ESPERA_PEDIDO_S", envPadrao.ESPERA_PEDIDO_S]])));
    setTeste({}); setAviso("Voltou aos endereços do arquivo .env.");
  };

  return (
    <main className="container">
      <section className="intro">
        <h1>Conexões</h1>
        <p>No dia da apresentação, cada grupo roda o seu serviço no próprio computador, na rede local. Coloque aqui o IP e a porta de cada um e teste antes de começar.</p>
        <p className="muted small">Este AutoGiro está rodando em <strong>{window.location.origin}</strong>.{temAjustes() ? " Há endereços salvos neste navegador." : " Usando os endereços do arquivo .env."}</p>
      </section>

      {httpsComIp && (
        <p className="alert alert--bad" role="alert">Esta página está aberta pelo site publicado (https), e o navegador bloqueia chamadas para endereços http de computadores da rede. Para usar os IPs dos grupos, rode o AutoGiro num computador da rede (npm run dev) e abra por lá.</p>
      )}

      <form className="conexoes" onSubmit={salvar} noValidate>
        {SERVICOS.map((s) => {
          const t = teste[s.id];
          return (
            <section key={s.id} className="panel conexao" aria-labelledby={`cx-${s.id}`}>
              <div className="conexao__head">
                <div>
                  <h2 id={`cx-${s.id}`} className="h2 h2--flush">{s.nome}</h2>
                  <p className="muted small">{s.grupo}. {s.uso}</p>
                </div>
                <label className="check conexao__mock"><input type="checkbox" checked={!!f[s.mock]} onChange={(e) => set(s.mock, e.target.checked)} /><span>Usar simulado</span></label>
              </div>
              <div className="conexao__linha">
                <div className="field">
                  <label htmlFor={`url-${s.id}`}>Endereço (IP e porta)</label>
                  <input id={`url-${s.id}`} inputMode="url" autoComplete="off" spellCheck="false" value={f[s.url]} onChange={(e) => set(s.url, e.target.value)} placeholder={`http://192.168.0.10:${s.porta}`} disabled={!!f[s.mock]} />
                </div>
                <button type="button" className="btn btn--ghost" onClick={() => testarUm(s)} disabled={!!f[s.mock] || !f[s.url]}>Testar</button>
              </div>
              <p className="conexao__status" role="status">
                {f[s.mock] ? <span className="badge badge--neutral">Simulado no navegador</span>
                  : t?.testando ? <span className="muted small">Testando…</span>
                  : t ? <><span className={`badge ${t.ok ? "badge--ok" : "badge--bad"}`}>{t.ok ? "Online" : "Fora do ar"}</span> <span className="muted small">{t.msg}</span></>
                  : <span className="muted small">Ainda não testado. Porta padrão: {s.porta}. Teste em {s.health}.</span>}
              </p>
            </section>
          );
        })}

        <section className="panel" aria-labelledby="cx-espera">
          <h2 id="cx-espera" className="h2 h2--flush">Espera do pedido</h2>
          <div className="conexao__linha">
            <div className="field">
              <label htmlFor="espera">Quanto tempo esperar a resposta do serviço de juros (segundos)</label>
              <input id="espera" type="number" min="15" max="600" step="15" value={f.ESPERA_PEDIDO_S} onChange={(e) => set("ESPERA_PEDIDO_S", e.target.value)} />
            </div>
          </div>
          <p className="muted small">Se a Decisão recusar a proposta, nada chega ao serviço de juros. Depois desse tempo, a tela avisa e oferece continuar esperando.</p>
        </section>

        <p className="form-ok" role="status">{aviso}</p>
        <div className="credit-form__actions">
          <button className="btn">Salvar conexões</button>
          <button type="button" className="btn btn--ghost" onClick={testarTodos}>Testar todos</button>
          <button type="button" className="link-btn" onClick={restaurar}>Voltar ao padrão</button>
        </div>
      </form>
    </main>
  );
}
