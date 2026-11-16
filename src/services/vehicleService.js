import { env } from "../config/env.js";
import { http, ApiError } from "./api/httpClient.js";
import { ENDPOINTS } from "./api/endpoints.js";
import { VEHICLES_MOCK } from "./mocks/vehicles.mock.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Simulação local: latência + filtros. Teste o erro abrindo a página com ?mock=error */
async function listMock({ search, category, maxPrice }) {
  await wait(700);
  if (new URLSearchParams(window.location.search).get("mock") === "error") {
    throw new ApiError("O servidor não respondeu. Tente novamente em instantes.", { status: 500, code: "SERVER" });
  }
  const q = search ? normalize(search) : "";
  const items = VEHICLES_MOCK.filter((v) =>
    (!q || normalize(`${v.brand} ${v.model} ${v.version}`).includes(q)) &&
    (!category || v.category === category) &&
    (!maxPrice || v.priceBRL <= Number(maxPrice))
  );
  return { items, total: items.length };
}

export const vehicleService = {
  /** @param {import("./api/contracts.js").ListVehiclesParams} params
   *  @returns {Promise<import("./api/contracts.js").ListVehiclesResponse>} */
  list(params = {}, signal) {
    if (env.MOCK_VEHICLES) return listMock(params);
    return http(ENDPOINTS.vehicles.list, { query: params, signal });
  },
  async get(id, signal) {
    if (env.MOCK_VEHICLES) {
      await wait(400);
      const v = VEHICLES_MOCK.find((x) => x.id === id);
      if (!v) throw new ApiError("Veículo não encontrado.", { status: 404, code: "NOT_FOUND" });
      return v;
    }
    return http(ENDPOINTS.vehicles.detail(id), { signal });
  },
};
