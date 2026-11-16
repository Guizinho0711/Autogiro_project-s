import { Suspense, lazy, useEffect, useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute.js";
import { Skeleton } from "./components/ui/Skeleton.jsx";
import { todayISO } from "./utils/format.js";

// Cada página vira um arquivo separado: o site carrega só o que o visitante abre.
const VeiculosPage = lazy(() => import("./pages/VeiculosPage.jsx"));
const VeiculoDetalhePage = lazy(() => import("./pages/VeiculoDetalhePage.jsx"));
const OperacoesPage = lazy(() => import("./pages/OperacoesPage.jsx"));
const OperacaoDetalhePage = lazy(() => import("./pages/OperacaoDetalhePage.jsx"));
const CreditoPage = lazy(() => import("./pages/CreditoPage.jsx"));
const TermosPage = lazy(() => import("./pages/TermosPage.jsx"));

const TITULOS = { veiculos: "Veículos", operacoes: "Minhas operações", credito: "Análise de crédito", termos: "Termos de uso" };

export default function App() {
  const [dataRef, setDataRef] = useState(todayISO());
  const [page, id] = useHashRoute();
  useEffect(() => { document.title = `${TITULOS[page] ?? "Veículos"} | AutoGiro`; }, [page]);

  const isOp = page === "operacoes";
  const dec = id && decodeURIComponent(id);
  let content;
  if (isOp) content = dec ? <OperacaoDetalhePage id={dec} dataRef={dataRef} /> : <OperacoesPage dataRef={dataRef} />;
  else if (page === "credito") content = <CreditoPage />;
  else if (page === "termos") content = <TermosPage />;
  else content = dec ? <VeiculoDetalhePage id={dec} /> : <VeiculosPage />;

  const cur = (p) => (page === p || (p === "veiculos" && !TITULOS[page]) ? "page" : undefined);
  return (
    <>
      <a className="skip" href="#conteudo">Pular para o conteúdo</a>
      <header className="topbar">
        <div className="container topbar__inner">
          <a className="brand" href="#/veiculos" aria-label="AutoGiro, página inicial">AutoGiro</a>
          <nav aria-label="Principal" className="nav">
            <a href="#/veiculos" aria-current={cur("veiculos")}>Veículos</a>
            <a href="#/operacoes" aria-current={cur("operacoes")}>Minhas operações</a>
            <a href="#/credito" aria-current={cur("credito")}>Crédito</a>
          </nav>
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
          <p><strong className="brand">AutoGiro</strong><br /><span className="muted small">Simulações ilustrativas. Sujeito à análise de crédito.</span></p>
          <nav aria-label="Rodapé" className="footer__nav">
            <a href="#/veiculos">Veículos</a><a href="#/operacoes">Minhas operações</a><a href="#/credito">Crédito</a><a href="#/termos">Termos de uso</a>
          </nav>
          <p className="small muted">© {new Date().getFullYear()} AutoGiro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </>
  );
}
