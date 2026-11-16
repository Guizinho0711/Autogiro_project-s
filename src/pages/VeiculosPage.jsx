import { useState } from "react";
import { vehicleService } from "../services/vehicleService.js";
import { useAsync } from "../hooks/useAsync.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { VehicleFilters } from "../components/vehicles/VehicleFilters.jsx";
import { SimularFinanciamentoDialog } from "../components/vehicles/SimularFinanciamentoDialog.jsx";
import { VehicleCard } from "../components/vehicles/VehicleCard.jsx";
import { VehicleCardSkeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";

const EMPTY_FILTERS = { search: "", category: "", maxPrice: "", sort: "menor_preco" };
const ORDEM = {
  menor_preco: (a, b) => a.priceBRL - b.priceBRL, maior_preco: (a, b) => b.priceBRL - a.priceBRL,
  mais_novo: (a, b) => b.year - a.year || a.mileageKm - b.mileageKm, menor_km: (a, b) => a.mileageKm - b.mileageKm,
};
const ordenar = (items, k) => [...items].sort(ORDEM[k] ?? ORDEM.menor_preco);

export default function VeiculosPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [simulando, setSimulando] = useState(null);
  const search = useDebounce(filters.search, 300);

  const { status, data, error, reload } = useAsync(
    (signal) => vehicleService.list({ search, category: filters.category, maxPrice: filters.maxPrice }, signal),
    [search, filters.category, filters.maxPrice]
  );

  return (
    <main className="container">
        <section className="intro">
          <h1>Encontre seu próximo <span className="grad">seminovo</span> e simule o financiamento</h1>
          <p>Filtre o estoque, escolha um veículo e veja a parcela antes de falar com a gente.</p>
        </section>

        <VehicleFilters filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} />

        <div aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && (
            <div className="grid">
              {Array.from({ length: 6 }, (_, i) => <VehicleCardSkeleton key={i} />)}
            </div>
          )}

          {status === "error" && (
            <StateMessage
              role="alert"
              title="Não foi possível carregar os veículos"
              text={error.message}
              actionLabel="Tentar de novo"
              onAction={reload}
            />
          )}

          {status === "success" && data.items.length === 0 && (
            <StateMessage
              title="Nenhum veículo encontrado"
              text="Tente outra marca ou aumente o preço máximo."
              actionLabel="Limpar filtros"
              onAction={() => setFilters(EMPTY_FILTERS)}
            />
          )}

          {status === "success" && data.items.length > 0 && (
            <>
              <p className="count">{data.total} {data.total === 1 ? "veículo" : "veículos"}</p>
              <div className="grid">
                {ordenar(data.items, filters.sort).map((v) => <VehicleCard key={v.id} vehicle={v} onSimular={setSimulando} />)}
              </div>
            </>
          )}
        </div>
      {simulando && <SimularFinanciamentoDialog vehicle={simulando} onClose={() => setSimulando(null)} />}
      </main>
  );
}
