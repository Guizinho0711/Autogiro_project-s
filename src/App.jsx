import { useState } from "react";
import { useHashRoute } from "./hooks/useHashRoute.js";
import VeiculosPage from "./pages/VeiculosPage.jsx";
import OperacoesPage from "./pages/OperacoesPage.jsx";
import OperacaoDetalhePage from "./pages/OperacaoDetalhePage.jsx";
import { todayISO } from "./utils/format.js";

export default function App() {
  const [dataRef, setDataRef] = useState(todayISO());
  const [page, id] = useHashRoute();
  const inOperacoes = page === "operacoes";

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <span className="brand">AutoGiro</span>
          <nav aria-label="Principal" className="nav">
            <a href="#/veiculos" aria-current={!inOperacoes ? "page" : undefined}>Veículos</a>
            <a href="#/operacoes" aria-current={inOperacoes ? "page" : undefined}>Minhas operações</a>
          </nav>
        </div>
        {inOperacoes && (
          <div className="refbar"><div className="container refbar__inner">
            <label htmlFor="data-ref">Data de referência</label>
            <input id="data-ref" type="date" value={dataRef} onChange={(e) => e.target.value && setDataRef(e.target.value)} />
          </div></div>
        )}
      </header>
      {inOperacoes ? (id ? <OperacaoDetalhePage id={decodeURIComponent(id)} dataRef={dataRef} /> : <OperacoesPage dataRef={dataRef} />) : <VeiculosPage />}
    </>
  );
}
