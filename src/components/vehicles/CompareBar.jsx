import { useEffect, useRef, useState } from "react";
import { vehicleService } from "../../services/vehicleService.js";
import { useComparar } from "../../state/store.js";
import { useAsync } from "../../hooks/useAsync.js";
import { estimativa } from "../../services/estimativa.js";
import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatBRL, formatKm, formatMoney } from "../../utils/format.js";
import { VehicleArt } from "./VehicleArt.jsx";

function CompareDialog({ ids, taxa, onClose, onRemove }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.showModal(); }, []);
  const { status, data } = useAsync((s) => vehicleService.list({}, s), []);
  const lista = status === "success" ? ids.map((id) => data.items.find((v) => v.id === id)).filter(Boolean) : [];
  const menor = lista.length ? Math.min(...lista.map((v) => v.priceBRL)) : 0;
  const linhas = [
    ["Preço", (v) => <strong>{formatBRL(v.priceBRL)}{v.priceBRL === menor && lista.length > 1 && <span className="badge badge--ok badge--inline">menor</span>}</strong>],
    ["Parcela estimada", (v) => { const e = estimativa(v, taxa); return e ? `${e.meses}x de ${formatMoney(e.parcela)}` : "—"; }],
    ["Categoria", (v) => CATEGORY_LABELS[v.category]],
    ["Ano", (v) => v.year],
    ["Quilometragem", (v) => formatKm(v.mileageKm)],
    ["Câmbio", (v) => TRANSMISSION_LABELS[v.transmission]],
    ["Combustível", (v) => FUEL_LABELS[v.fuel]],
    ["Cor", (v) => v.color?.nome ?? "—"],
    ["Cidade", (v) => v.city],
  ];
  return (
    <dialog ref={ref} className="dialog--wide dialog--compare" onClose={onClose} aria-labelledby="cmp-t">
      <h2 id="cmp-t" className="dialog__title">Comparar veículos</h2>
      <p className="muted small">A parcela considera entrada de 20%, 48 meses e perfil de crédito B. Use o simulador para outras condições.</p>
      {status === "loading" && <p aria-busy="true" className="muted">Carregando…</p>}
      {status === "success" && (
        <div className="wide compare">
          <table className="table">
            <caption className="sr-only">Comparação lado a lado</caption>
            <thead><tr><td />{lista.map((v) => (
              <th key={v.id} scope="col">
                <div className="compare__head"><VehicleArt category={v.category} color={v.color?.hex} /><a href={`#/veiculos/${v.id}`} onClick={() => ref.current.close()}>{v.brand} {v.model}</a><span className="muted small">{v.version}</span>
                  <button type="button" className="link-btn" onClick={() => onRemove(v.id)}>Remover</button></div>
              </th>))}</tr></thead>
            <tbody>{linhas.map(([nome, fn]) => <tr key={nome}><th scope="row">{nome}</th>{lista.map((v) => <td key={v.id}>{fn(v)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      <div className="dialog__actions"><button className="btn" type="button" onClick={() => ref.current.close()}>Fechar</button></div>
    </dialog>
  );
}

/** Barra fixa que aparece quando há veículos marcados para comparar. */
export function CompareBar({ taxa }) {
  const cmp = useComparar();
  const [aberto, setAberto] = useState(false);
  if (!cmp.ids.length) return null;
  return (
    <>
      <div className="comparebar" role="region" aria-label="Comparação">
        <p><strong>{cmp.ids.length}</strong> de 3 para comparar{cmp.ids.length < 2 && <span className="muted"> · marque mais um</span>}</p>
        <div className="comparebar__actions">
          <button className="btn btn--ghost btn--small" type="button" onClick={cmp.limpar}>Limpar</button>
          <button className="btn btn--small" type="button" disabled={cmp.ids.length < 2} onClick={() => setAberto(true)}>Comparar</button>
        </div>
      </div>
      {aberto && <CompareDialog ids={cmp.ids} taxa={taxa} onClose={() => setAberto(false)} onRemove={(id) => { cmp.toggle(id); if (cmp.ids.length <= 2) setAberto(false); }} />}
    </>
  );
}
