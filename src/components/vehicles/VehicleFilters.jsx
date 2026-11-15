import { CATEGORY_LABELS } from "../../utils/format.js";

const PRICE_OPTIONS = [30000, 60000, 100000, 150000, 250000];

export function VehicleFilters({ filters, onChange, onClear }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const hasFilters = filters.search || filters.category || filters.maxPrice;

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
      <div className="field field--grow">
        <label htmlFor="f-search">Marca ou modelo</label>
        <input id="f-search" type="search" placeholder="Ex.: Corolla" value={filters.search} onChange={set("search")} />
      </div>
      <div className="field">
        <label htmlFor="f-cat">Categoria</label>
        <select id="f-cat" value={filters.category} onChange={set("category")}>
          <option value="">Todas</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-price">Preço máximo</label>
        <select id="f-price" value={filters.maxPrice} onChange={set("maxPrice")}>
          <option value="">Sem limite</option>
          {PRICE_OPTIONS.map((p) => (
            <option key={p} value={p}>Até R$ {p.toLocaleString("pt-BR")}</option>
          ))}
        </select>
      </div>
      <button className="btn btn--ghost" type="button" onClick={onClear} disabled={!hasFilters}>
        Limpar filtros
      </button>
    </form>
  );
}
