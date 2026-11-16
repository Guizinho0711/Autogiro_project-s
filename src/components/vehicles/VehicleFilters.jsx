import { CATEGORY_LABELS } from "../../utils/format.js";

const PRICE_OPTIONS = [30000, 60000, 100000, 150000, 250000];

export function VehicleFilters({ filters, onChange, onClear, totalFavoritos }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });
  const hasFilters = filters.search || filters.category || filters.maxPrice || filters.onlyFav;

  return (
    <form className="finder" role="search" aria-label="Buscar veículos" onSubmit={(e) => e.preventDefault()}>
      <div className="finder__row">
        <div className="field field--grow">
          <label htmlFor="f-search">Marca ou modelo</label>
          <input id="f-search" type="search" placeholder="Ex.: Corolla, Onix, Hilux" value={filters.search} onChange={set("search")} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="f-price">Preço máximo</label>
          <select id="f-price" value={filters.maxPrice} onChange={set("maxPrice")}>
            <option value="">Sem limite</option>
            {PRICE_OPTIONS.map((p) => <option key={p} value={p}>Até R$ {p.toLocaleString("pt-BR")}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sort">Ordenar por</label>
          <select id="f-sort" value={filters.sort} onChange={set("sort")}>
            <option value="menor_preco">Menor preço</option>
            <option value="maior_preco">Maior preço</option>
            <option value="mais_novo">Mais novos</option>
            <option value="menor_km">Menor quilometragem</option>
          </select>
        </div>
      </div>

      <div className="finder__row finder__row--chips">
        <div className="pills" role="group" aria-label="Categoria">
          {[["", "Todos"], ...Object.entries(CATEGORY_LABELS)].map(([value, label]) => (
            <button key={value || "todos"} type="button" className="pill" aria-pressed={filters.category === value} onClick={() => onChange({ ...filters, category: value })}>{label}</button>
          ))}
        </div>
        <div className="finder__actions">
          <button type="button" className="pill pill--fav" aria-pressed={!!filters.onlyFav} onClick={() => onChange({ ...filters, onlyFav: !filters.onlyFav })}>
            Favoritos{totalFavoritos > 0 ? ` (${totalFavoritos})` : ""}
          </button>
          <button className="btn btn--ghost btn--small" type="button" onClick={onClear} disabled={!hasFilters}>Limpar</button>
        </div>
      </div>
    </form>
  );
}
