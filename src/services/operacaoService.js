import { env } from "../config/env.js";
import { http } from "./api/httpClient.js";
import { ENDPOINTS as E } from "./api/endpoints.js";
import { mockApi } from "./mocks/operacoes.mock.js";

const ref = (dataReferencia) => ({ dataReferencia });

/** Mesma interface para mock e API real: os componentes não sabem qual está em uso. */
const real = {
  list: (r, signal) => http(E.operacoes.list, { query: ref(r), signal }),
  get: (id, r, signal) => http(E.operacoes.detail(id), { query: ref(r), signal }),
  parcelas: (id, r, signal) => http(E.operacoes.parcelas(id), { query: ref(r), signal }),
  resumo: (id, r, signal) => http(E.operacoes.resumo(id), { query: ref(r), signal }),
  historico: (id, r, signal) => http(E.operacoes.historico(id), { query: ref(r), signal }),
  pagar: (id, numero, body) => http(E.operacoes.pagamento(id, numero), { method: "POST", body }),
};

export const operacaoService = env.MOCK_OPERACOES ? mockApi : real;
