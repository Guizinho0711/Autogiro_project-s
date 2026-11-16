import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatBRL, formatKm, formatMoney } from "../../utils/format.js";
import { useComparar, useFavoritos } from "../../state/store.js";
import { estimativa } from "../../services/estimativa.js";
import { VehiclePhoto } from "./VehiclePhoto.jsx";

export function FavoriteButton({ id, nome }) {
  const fav = useFavoritos();
  const on = fav.has(id);
  return (
    <button type="button" className={`icon-btn${on ? " is-on" : ""}`} aria-pressed={on} aria-label={`${on ? "Remover dos" : "Adicionar aos"} favoritos: ${nome}`} onClick={() => fav.toggle(id)}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.3 3.3 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function CompareToggle({ id, nome }) {
  const cmp = useComparar();
  const on = cmp.has(id), bloqueado = !on && cmp.cheio;
  return (
    <label className={`check${bloqueado ? " is-disabled" : ""}`}>
      <input type="checkbox" checked={on} disabled={bloqueado} onChange={() => cmp.toggle(id)} aria-label={`Comparar ${nome}`} />
      <span>{bloqueado ? "Máx. 3" : "Comparar"}</span>
    </label>
  );
}

/** @param {{ vehicle: import("../../services/api/contracts.js").Vehicle, taxa?: number|null }} props */
export function VehicleCard({ vehicle: v, taxa, onSimular }) {
  const reserved = v.status === "reserved";
  const nome = `${v.brand} ${v.model}`;
  const est = estimativa(v, taxa);
  return (
    <article className="card">
      <div className="card__media">
        <VehiclePhoto vehicle={v} />
        <div className="card__badges">
          <span className="tag">{CATEGORY_LABELS[v.category]}</span>
          {reserved && <span className="tag tag--warn">Reservado</span>}
        </div>
        <FavoriteButton id={v.id} nome={nome} />
      </div>
      <div className="card__body">
        <h3 className="card__title"><a className="card__link" href={`#/veiculos/${v.id}`}>{nome}</a></h3>
        <p className="card__version">{v.version}</p>
        <ul className="specs" aria-label="Características">
          <li>{v.year}</li><li>{formatKm(v.mileageKm)}</li><li>{TRANSMISSION_LABELS[v.transmission]}</li><li>{FUEL_LABELS[v.fuel]}</li>
        </ul>
        <p className="card__city">{v.city}</p>
        <div className="card__bottom">
          <div>
            <strong className="card__price">{formatBRL(v.priceBRL)}</strong>
            {est && <p className="card__est">{est.meses}x de {formatMoney(est.parcela)}</p>}
          </div>
          <button className="btn btn--small" type="button" disabled={reserved} onClick={() => onSimular(v)}>{reserved ? "Indisponível" : "Simular"}</button>
        </div>
        <CompareToggle id={v.id} nome={nome} />
      </div>
    </article>
  );
}
