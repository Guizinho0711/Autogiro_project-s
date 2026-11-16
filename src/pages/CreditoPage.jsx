import { useState } from "react";
import { esteiraService } from "../services/esteiraService.js";
import { useAsync } from "../hooks/useAsync.js";
import { JsonTree } from "../components/ui/JsonTree.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";

export default function CreditoPage() {
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
    <main className="container">
      <section className="intro">
        <h1>Análise de crédito</h1>
        <p>Consulte uma proposta da esteira de crédito (score, decisão e operação) pelo número dela.</p>
      </section>

      <section className="panel" aria-labelledby="st">
        <h2 id="st" className="h2">Servidor da esteira</h2>
        <div aria-live="polite">
          {health.status === "loading" && <><Skeleton style={{ height: 18, width: "60%" }} /><p className="muted small" style={{ marginTop: 8 }}>Acordando o servidor, pode levar até 1 minuto na primeira vez.</p></>}
          {health.status === "success" && <p><span className="badge badge--ok">Online</span> <span className="muted small">resposta: {JSON.stringify(health.data)}</span></p>}
          {health.status === "error" && <><p><span className="badge badge--bad">Indisponível</span> <span className="muted small">{health.error.message}</span></p><button className="btn btn--small btn--ghost" onClick={health.reload}>Verificar de novo</button></>}
        </div>
      </section>

      <section className="panel" aria-labelledby="cs">
        <h2 id="cs" className="h2">Consultar proposta</h2>
        <form className="filters" onSubmit={consultar} style={{ marginBottom: 16 }}>
          <div className="field field--grow"><label htmlFor="pid">Número da proposta</label><input id="pid" value={id} onChange={(e) => setId(e.target.value)} placeholder="ID retornado pela esteira" aria-describedby="perro" /></div>
          <button className="btn" disabled={q.status === "loading"}>{q.status === "loading" ? "Consultando..." : "Consultar"}</button>
        </form>
        <p id="perro" className="form-error" role="alert">{q.status === "error" ? q.message : ""}</p>
        {q.status === "ok" && (
          <div aria-live="polite">
            <JsonTree data={q.data} />
            <details className="sched"><summary>Ver resposta bruta</summary><pre className="raw">{JSON.stringify(q.data, null, 2)}</pre></details>
          </div>
        )}
      </section>
    </main>
  );
}
