import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatBRL, formatKm } from "../../utils/format.js";

/** @param {{ vehicle: import("../../services/api/contracts.js").Vehicle }} props */
export function VehicleCard({ vehicle: v, onSimular }) {
  const reserved = v.status === "reserved";
  return (
    <article className="card">
      <div className="card__top">
        <span className="tag">{CATEGORY_LABELS[v.category]}</span>
        {reserved && <span className="tag tag--muted">Reservado</span>}
      </div>
      <h3 className="card__title">
        <a className="card__link" href={`#/veiculos/${v.id}`}>{v.brand} {v.model}</a>
      </h3>
      <p className="card__version">{v.version}</p>
      <p className="card__meta">
        {v.year} · {formatKm(v.mileageKm)} · {TRANSMISSION_LABELS[v.transmission]} · {FUEL_LABELS[v.fuel]}
      </p>
      <p className="card__city">{v.city}</p>
      <div className="card__bottom">
        <strong className="card__price">{formatBRL(v.priceBRL)}</strong>
        <button className="btn btn--small" type="button" disabled={reserved} onClick={() => onSimular(v)}>
          {reserved ? "Indisponível" : "Simular parcelas"}
        </button>
      </div>
    </article>
  );
}
