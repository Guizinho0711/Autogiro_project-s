import { useState } from "react";
import { vehicleService } from "../services/vehicleService.js";
import { simular } from "../services/simulacaoService.js";
import { taxaDaFaixa } from "../services/creditoService.js";
import { ESTIMATIVA } from "../services/estimativa.js";
import { usePolitica } from "../hooks/usePolitica.js";
import { useAsync } from "../hooks/useAsync.js";
import { SimularFinanciamentoDialog } from "../components/vehicles/SimularFinanciamentoDialog.jsx";
import { VehicleCard, FavoriteButton, CompareToggle } from "../components/vehicles/VehicleCard.jsx";
import { VehiclePhoto } from "../components/vehicles/VehiclePhoto.jsx";
import { CompareBar } from "../components/vehicles/CompareBar.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";
import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatKm, formatMoney } from "../utils/format.js";

function Parcelas({ v, taxa }) {
  const entrada = Math.round((v.priceBRL * ESTIMATIVA.entradaPct) / 100);
  const linhas = [12, 24, 36, 48, 60].map((m) => [m, simular({ valorVeiculo: v.priceBRL, entrada, meses: m, taxaMensal: taxa, sistema: "PRICE" })]).filter(([, r]) => r);
  return (
    <section aria-labelledby="parc">
      <h2 id="parc" className="h2">Parcelas por prazo</h2>
      <div className="wide">
        <table className="table">
          <caption className="sr-only">Parcela por prazo, PRICE, entrada de {ESTIMATIVA.entradaPct}%</caption>
          <thead><tr><th scope="col">Prazo</th><th scope="col" className="num">Parcela</th><th scope="col" className="num">Total de juros</th></tr></thead>
          <tbody>{linhas.map(([m, r]) => <tr key={m}><th scope="row">{m}x</th><td className="num">{formatMoney(r.primeiraParcela)}</td><td className="num">{formatMoney(r.totalJuros)}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="muted small">Entrada de {ESTIMATIVA.entradaPct}% ({formatMoney(entrada)}), perfil {ESTIMATIVA.faixa} ({taxa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% ao mês), sistema PRICE.</p>
    </section>
  );
}

function Compartilhar({ nome }) {
  const [msg, setMsg] = useState("");
  const go = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: nome, url });
      else { await navigator.clipboard.writeText(url); setMsg("Link copiado."); setTimeout(() => setMsg(""), 2500); }
    } catch { /* o usuário cancelou ou o navegador bloqueou */ }
  };
  return <><button type="button" className="btn btn--ghost" onClick={go}>Compartilhar</button><span className="sr-only" role="status">{msg}</span>{msg && <span className="muted small" aria-hidden="true">{msg}</span>}</>;
}

export default function VeiculoDetalhePage({ id }) {
  const [simulando, setSimulando] = useState(false);
  const [simSimilar, setSimSimilar] = useState(null);
  const politica = usePolitica();
  const taxa = politica ? taxaDaFaixa(politica, ESTIMATIVA.faixa) : null;
  const { status, data: v, error, reload } = useAsync((signal) => vehicleService.get(id, signal), [id]);
  const lista = useAsync((signal) => vehicleService.list({}, signal), []);

  return (
    <main className="container">
      <nav aria-label="Caminho" className="crumb"><a className="link" href="#/veiculos">Veículos</a> / <span aria-current="page">{v ? `${v.brand} ${v.model}` : "Detalhes"}</span></nav>

      {status === "loading" && <div aria-busy="true" className="detail"><Skeleton style={{ height: 320, width: "100%" }} /><Skeleton style={{ height: 320, width: "100%" }} /></div>}
      {status === "error" && <StateMessage role="alert" title={error.status === 404 ? "Veículo não encontrado" : "Não foi possível carregar o veículo"} text={error.message} actionLabel="Tentar de novo" onAction={reload} />}

      {status === "success" && (() => {
        const entrada = Math.round((v.priceBRL * ESTIMATIVA.entradaPct) / 100);
        const est = taxa != null ? simular({ valorVeiculo: v.priceBRL, entrada, meses: ESTIMATIVA.meses, taxaMensal: taxa, sistema: "PRICE" }) : null;
        const reservado = v.status === "reserved";
        const nome = `${v.brand} ${v.model}`;
        const similares = lista.status === "success" ? lista.data.items.filter((x) => x.id !== v.id && x.category === v.category).slice(0, 3) : [];
        return (
          <>
            <article className="detail">
              <div>
                <figure className="hero-img">
                  <VehiclePhoto vehicle={v} eager />
                  {v.photo?.fonte && <figcaption>Foto ilustrativa do modelo: <a href={v.photo.fonte} target="_blank" rel="noopener noreferrer">{v.photo.credito || "fonte"}</a>{/commons\.wikimedia/.test(v.photo.fonte) && ", autor e licença na página"}</figcaption>}
                </figure>
                <header className="detail__head">
                  <div className="detail__tags"><span className="tag">{CATEGORY_LABELS[v.category]}</span>{reservado && <span className="tag tag--warn">Reservado</span>}</div>
                  <h1>{nome}</h1>
                  <p className="muted">{v.version}</p>
                </header>
                <section aria-labelledby="ficha">
                  <h2 id="ficha" className="h2">Ficha técnica</h2>
                  <dl className="terms">
                    {[["Ano", v.year], ["Quilometragem", formatKm(v.mileageKm)], ["Câmbio", TRANSMISSION_LABELS[v.transmission]], ["Combustível", FUEL_LABELS[v.fuel]], ["Cor", v.color?.nome ?? "—"], ["Cidade", v.city]].map(([k, val]) => (
                      <div key={k}><dt>{k}</dt><dd>{val}</dd></div>
                    ))}
                  </dl>
                </section>
                {v.description && <section aria-labelledby="desc"><h2 id="desc" className="h2">Sobre este veículo</h2><p className="muted pre-line">{v.description}</p></section>}
                {v.opcionais?.length > 0 && (
                  <section aria-labelledby="opc">
                    <h2 id="opc" className="h2">Itens e opcionais</h2>
                    <ul className="pills-static">{v.opcionais.map((o) => <li key={o}>{o}</li>)}</ul>
                  </section>
                )}
                {taxa != null && <Parcelas v={v} taxa={taxa} />}
              </div>
              <aside className="buybox" aria-label="Valores e simulação">
                <div className="buybox__top"><p className="muted">Preço</p><FavoriteButton id={v.id} nome={nome} /></div>
                <p className="buybox__price">{formatMoney(v.priceBRL)}</p>
                {est && <p className="buybox__est">ou a partir de <strong>{formatMoney(est.primeiraParcela)}</strong>/mês<br /><span className="muted small">{ESTIMATIVA.meses}x, entrada de {formatMoney(entrada)}, perfil {ESTIMATIVA.faixa}</span></p>}
                <button className="btn" type="button" disabled={reservado} onClick={() => setSimulando(true)}>{reservado ? "Indisponível" : "Simular financiamento"}</button>
                <a className="btn btn--ghost" href={`#/credito/${v.id}`}>Analisar meu crédito</a>
                <div className="buybox__row"><CompareToggle id={v.id} nome={nome} /><Compartilhar nome={nome} /></div>
              </aside>
            </article>
            {similares.length > 0 && (
              <section className="section" aria-labelledby="sim">
                <h2 id="sim" className="section__title">Veículos parecidos</h2>
                <div className="grid">{similares.map((s) => <VehicleCard key={s.id} vehicle={s} taxa={taxa} onSimular={setSimSimilar} />)}</div>
              </section>
            )}
            {simulando && <SimularFinanciamentoDialog vehicle={v} onClose={() => setSimulando(false)} />}
            {simSimilar && <SimularFinanciamentoDialog vehicle={simSimilar} onClose={() => setSimSimilar(null)} />}
            <CompareBar taxa={taxa} />
          </>
        );
      })()}
    </main>
  );
}
