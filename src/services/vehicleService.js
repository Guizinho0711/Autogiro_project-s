import { env } from "../config/env.js";
import { ApiError } from "./api/httpClient.js";
import { VEHICLES_MOCK } from "./mocks/vehicles.mock.js";
import { supabase } from "./supabase.js";
import { fromRow } from "./veiculoMapper.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Origem do catálogo exibido: "banco" (Supabase) ou "exemplo" (dados do próprio site). */
export const catalogo = { origem: env.MOCK_VEHICLES ? "exemplo" : "banco" };

// O estoque é pequeno: buscamos tudo uma vez (cache de 1 minuto) e filtramos no navegador,
// o que permite buscar sem acento ("sedã" = "seda") e responder na hora a cada filtro.
let cache = null;
async function todos() {
  if (env.MOCK_VEHICLES) { await wait(500); return VEHICLES_MOCK; }
  if (cache && Date.now() - cache.t < 60_000) return cache.itens;
  try {
    const sb = await supabase();
    const { data, error } = await sb.from("veiculos").select("*").in("status", ["disponivel", "reservado"]).order("created_at", { ascending: false });
    if (error) throw error;
    catalogo.origem = "banco";
    cache = { t: Date.now(), itens: data.map(fromRow) };
    return cache.itens;
  } catch {
    // Banco fora do ar (ou projeto pausado): o site continua com o catálogo de exemplo.
    catalogo.origem = "exemplo";
    return VEHICLES_MOCK;
  }
}
export const limparCacheVeiculos = () => { cache = null; };

export const vehicleService = {
  async list({ search, category, maxPrice } = {}) {
    if (new URLSearchParams(window.location.search).get("mock") === "error") {
      await wait(300);
      throw new ApiError("O servidor não respondeu. Tente novamente em instantes.", { status: 500, code: "SERVER" });
    }
    const q = search ? normalize(search) : "";
    const items = (await todos()).filter((v) =>
      (!q || normalize(`${v.brand} ${v.model} ${v.version}`).includes(q)) &&
      (!category || v.category === category) &&
      (!maxPrice || v.priceBRL <= Number(maxPrice)));
    return { items, total: items.length, origem: catalogo.origem };
  },
  async get(id) {
    const v = (await todos()).find((x) => x.id === id);
    if (!v) throw new ApiError("Veículo não encontrado.", { status: 404, code: "NOT_FOUND" });
    return v;
  },
};
