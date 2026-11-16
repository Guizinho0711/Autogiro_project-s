import { useMemo, useState } from "react";
import { vehicleService } from "../services/vehicleService.js";
import { env } from "../config/env.js";
import { taxaDaFaixa } from "../services/creditoService.js";
import { usePolitica } from "../hooks/usePolitica.js";
import { useAsync } from "../hooks/useAsync.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useFavoritos } from "../state/store.js";
import { VehicleFilters } from "../components/vehicles/VehicleFilters.jsx";
import { SimularFinanciamentoDialog } from "../components/vehicles/SimularFinanciamentoDialog.jsx";
import { VehicleCard } from "../components/vehicles/VehicleCard.jsx";
import { CompareBar } from "../components/vehicles/CompareBar.jsx";
import { ComoFunciona, TaxasPorPerfil, Faq } from "../components/vehicles/HomeSections.jsx";
import { VehicleCardSkeleton } from "../components/ui/Skeleton.jsx";
import { StateMessage } from "../components/ui/StateMessage.jsx";

const EMPTY_FILTERS = { search: "", category: "", maxPrice: "", sort: "menor_preco", onlyFav: false };
const ORDEM = {
  menor_preco: (a, b) => a.priceBRL - b.priceBRL, maior_preco: (a, b) => b.priceBRL - a.priceBRL,
  mais_novo: (a, b) => b.year - a.year || a.mileageKm - b.mileageKm, menor_km: (a, b) => a.mileageKm - b.mileageKm,
};

export default function VeiculosPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [simulando, setSimulando] = useState(null);
  const search = useDebounce(filters.search, 300);
  const fav = useFavoritos();
  const politica = usePolitica();
  const taxa = politica ? taxaDaFaixa(politica, "B") : null;

  const { status, data, error, reload } = useAsync(
    (signal) => vehicleService.list({ search, category: filters.category, maxPrice: filters.maxPrice }, signal),
    [search, filters.category, filters.maxPrice]
  );

  const itens = useMemo(() => {
    if (!data) return [];
    const base = filters.onlyFav ? data.items.filter((v) => fav.has(v.id)) : data.items;
    return [...base].sort(ORDEM[filters.sort] ?? ORDEM.menor_preco);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters.onlyFav, filters.sort, fav.ids]);

  return (
    <main className="container">
      <section className="hero" aria-labelledby="titulo">
        <p className="eyebrow">Financiamento de veículos</p>
        <h1 id="titulo">Seu próximo carro, com a parcela clara desde o começo</h1>
        <p className="hero__lead">Escolha entre carros, picapes e motos, compare e simule com a taxa do seu perfil de crédito antes de falar com a gente.</p>
        <ul className="hero__facts">
          <li><strong>12 a 60</strong> meses de prazo</li>
          <li><strong>PRICE</strong> ou <strong>SAC</strong></li>
          <li><strong>{politica ? `${taxaDaFaixa(politica, "A").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%` : "—"}</strong> ao mês, a partir de</li>
        </ul>
      </section>

      <VehicleFilters filters={filters} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} totalFavoritos={fav.ids.length} />

      <section aria-label="Resultados" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && <div className="grid">{Array.from({ length: 6 }, (_, i) => <VehicleCardSkeleton key={i} />)}</div>}
        {status === "error" && <StateMessage role="alert" title="Não foi possível carregar os veículos" text={error.message} actionLabel="Tentar de novo" onAction={reload} />}
        {status === "success" && itens.length === 0 && (
          <StateMessage
            title={filters.onlyFav ? "Você ainda não tem favoritos aqui" : "Nenhum veículo encontrado"}
            text={filters.onlyFav ? "Toque no coração de um veículo para guardá-lo." : "Tente outra marca ou aumente o preço máximo."}
            actionLabel={filters.onlyFav ? "Ver todos" : "Limpar filtros"}
            onAction={() => setFilters(filters.onlyFav ? { ...filters, onlyFav: false } : EMPTY_FILTERS)}
          />
        )}
        {status === "success" && itens.length > 0 && (
          <>
            <p className="count">{itens.length} {itens.length === 1 ? "veículo" : "veículos"}{data.origem === "exemplo" && !env.MOCK_VEHICLES && <span className="muted"> (catálogo de exemplo: o banco de dados não respondeu)</span>}</p>
            <div className="grid">{itens.map((v) => <VehicleCard key={v.id} vehicle={v} taxa={taxa} onSimular={setSimulando} />)}</div>
          </>
        )}
      </section>

      <ComoFunciona />
      <TaxasPorPerfil politica={politica} />
      <Faq />

      <CompareBar taxa={taxa} />
      {simulando && <SimularFinanciamentoDialog vehicle={simulando} onClose={() => setSimulando(null)} />}
    </main>
  );
}
