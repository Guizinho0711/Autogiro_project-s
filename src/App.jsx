import { Suspense, lazy, useEffect, useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { useTema } from "./hooks/useTema.js";
import { Skeleton } from "./components/ui/Skeleton.jsx";
import { todayISO } from "./utils/format.js";

// Cada página vira um arquivo separado: o site carrega só o que o visitante abre.
const VeiculosPage = lazy(() => import("./pages/VeiculosPage.jsx"));
const VeiculoDetalhePage = lazy(() => import("./pages/VeiculoDetalhePage.jsx"));
const OperacoesPage = lazy(() => import("./pages/OperacoesPage.jsx"));
const OperacaoDetalhePage = lazy(() => import("./pages/OperacaoDetalhePage.jsx"));
const CreditoPage = lazy(() => import("./pages/CreditoPage.jsx"));
const TermosPage = lazy(() => import("./pages/TermosPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const ConexoesPage = lazy(() => import("./pages/ConexoesPage.jsx"));

const TITULOS = { veiculos: "Veículos", operacoes: "Minhas operações", credito: "Pedido de financiamento", termos: "Termos de uso", admin: "Área do lojista", conexoes: "Conexões" };

export default function App() {
  const [dataRef, setDataRef] = useState(todayISO());
  const [page, id] = useHashRoute();
  const { tema, proximo } = useTema();
  useEffect(() => { document.title = `${TITULOS[page] ?? "Veículos"} | AutoGiro`; }, [page]);

  const isOp = page === "operacoes";
  const dec = id && decodeURIComponent(id);
  let content;
  if (isOp) content = dec ? <OperacaoDetalhePage id={dec} dataRef={dataRef} /> : <OperacoesPage dataRef={dataRef} />;
  else if (page === "credito") content = <CreditoPage key={dec ?? ""} veiculoId={dec} />;
  else if (page === "termos") content = <TermosPage />;
  else if (page === "admin") content = <AdminPage />;
  else if (page === "conexoes") content = <ConexoesPage />;
  else content = dec ? <VeiculoDetalhePage id={dec} /> : <VeiculosPage />;

  const cur = (p) => (page === p || (p === "veiculos" && !TITULOS[page]) ? "page" : undefined);
  return (
    <>
      <a className="skip" href="#conteudo" onClick={(e) => { e.preventDefault(); document.getElementById("conteudo")?.focus(); }}>Pular para o conteúdo</a>
      <header className="topbar">
        <div className="container topbar__inner">
          <a className="brand" href="#/veiculos" aria-label="AutoGiro, página inicial"><Marca /><span className="brand__text">AutoGiro</span></a>
          <div className="topbar__right">
          <nav aria-label="Principal" className="nav">
            <a href="#/veiculos" aria-current={cur("veiculos")}>Veículos</a>
            <a href="#/operacoes" aria-current={cur("operacoes")}><span className="hide-sm">Minhas operações</span><span className="show-sm">Operações</span></a>
            <a href="#/credito" aria-current={cur("credito")}>Crédito</a>
          </nav>
          <button type="button" className="theme-btn" onClick={proximo} aria-label={`Tema: ${tema}. Trocar`} title={`Tema: ${tema}`}><IconeTema tema={tema} /></button>
          </div>
        </div>
        {isOp && (
          <div className="refbar"><div className="container refbar__inner">
            <label htmlFor="data-ref">Data de referência</label>
            <input id="data-ref" type="date" value={dataRef} onChange={(e) => e.target.value && setDataRef(e.target.value)} />
          </div></div>
        )}
      </header>

      <div id="conteudo" tabIndex={-1}>
        <Suspense fallback={<main className="container" aria-busy="true"><Skeleton style={{ height: 36, width: "50%", margin: "32px 0 16px" }} /><Skeleton style={{ height: 160, width: "100%" }} /></main>}>
          {content}
        </Suspense>
      </div>

      <footer className="footer">
        <div className="container footer__inner">
          <p><strong className="brand"><Marca />AutoGiro</strong><br /><span className="muted small">Projeto acadêmico. Simulações sem IOF e tarifas; condições finais dependem da análise de crédito.</span></p>
          <nav aria-label="Rodapé" className="footer__nav">
            <a href="#/veiculos">Veículos</a><a href="#/operacoes">Minhas operações</a><a href="#/credito">Crédito</a><a href="#/termos">Termos de uso</a><a href="#/admin">Área do lojista</a><a href="#/conexoes">Conexões</a>
          </nav>
          <p className="small muted">© {new Date().getFullYear()} AutoGiro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  );
}

/** Marca: um giro (volante) desenhado em traço único. */
function Marca() {
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.4" />
      <path d="M3.6 10.2c2.6-.9 5.4-1.2 8.4-1.2s5.8.3 8.4 1.2M12 14.4v6.5" />
    </svg>
  );
}

function IconeTema({ tema }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", "aria-hidden": true };
  if (tema === "claro") return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
  if (tema === "escuro") return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>;
  return <svg {...p}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
}
