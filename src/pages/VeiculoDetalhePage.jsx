import { useState } from "react";
import { vehicleService } from "../services/vehicleService.js";
import { simular } from "../services/simulacaoService.js";
import { useAsync } from "../hooks/useAsync.js";
import { SimularFinanciamentoDialog } from "../components/vehicles/SimularFinanciamentoDialog.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";
import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatKm, formatMoney } from "../utils/format.js";

export default function VeiculoDetalhePage({ id }) {
  const [simulando, setSimulando] = useState(false);
  const { status, data: v, error, reload } = useAsync((signal) => vehicleService.get(id, signal), [id]);

  return (
    <main className="container">
      <nav aria-label="Caminho" className="crumb"><a className="link" href="#/veiculos">Veículos</a> / <span aria-current="page">{v ? `${v.brand} ${v.model}` : "Detalhes"}</span></nav>

      {status === "loading" && <div aria-busy="true" className="detail"><Skeleton style={{ height: 260, width: "100%" }} /><Skeleton style={{ height: 260, width: "100%" }} /></div>}
      {status === "error" && <StateMessage role="alert" title={error.status === 404 ? "Veículo não encontrado" : "Não foi possível carregar o veículo"} text={error.message} actionLabel="Tentar de novo" onAction={reload} />}

      {status === "success" && (() => {
        const entrada = Math.round(v.priceBRL * 0.2);
        const est = simular({ valorVeiculo: v.priceBRL, entrada, meses: 48, taxaMensal: 1.8, sistema: "PRICE" });
        const reservado = v.status === "reserved";
        return (
          <article className="detail">
            <div>
              <div className="hero-img" aria-hidden="true"><span>{v.brand}</span></div>
              <header className="detail__head">
                <p className="tag">{CATEGORY_LABELS[v.category]}</p>
                <h1>{v.brand} {v.model}</h1>
                <p className="muted">{v.version}</p>
              </header>
              <section aria-labelledby="ficha">
                <h2 id="ficha" className="h2">Ficha técnica</h2>
                <dl className="terms">
                  {[["Ano", v.year], ["Quilometragem", formatKm(v.mileageKm)], ["Câmbio", TRANSMISSION_LABELS[v.transmission]], ["Combustível", FUEL_LABELS[v.fuel]], ["Cidade", v.city], ["Situação", reservado ? "Reservado" : "Disponível"]].map(([k, val]) => (
                    <div key={k}><dt>{k}</dt><dd>{val}</dd></div>
                  ))}
                </dl>
              </section>
            </div>
            <aside className="buybox" aria-label="Valores e simulação">
              <p className="muted">Preço</p>
              <p className="buybox__price">{formatMoney(v.priceBRL)}</p>
              {est && <p className="buybox__est">ou a partir de <strong>{formatMoney(est.primeiraParcela)}</strong>/mês<br /><span className="muted small">48x, entrada de {formatMoney(entrada)}, juros ilustrativos</span></p>}
              <button className="btn" type="button" disabled={reservado} onClick={() => setSimulando(true)}>{reservado ? "Indisponível" : "Simular financiamento"}</button>
              <a className="btn btn--ghost" href="#/credito">Análise de crédito</a>
            </aside>
            {simulando && <SimularFinanciamentoDialog vehicle={v} onClose={() => setSimulando(false)} />}
          </article>
        );
      })()}
    </main>
  );
}
