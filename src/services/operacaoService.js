import { env } from "../config/env.js";
import { http } from "./api/httpClient.js";
import { ENDPOINTS as E } from "./api/endpoints.js";
import { mockApi } from "./mocks/operacoes.mock.js";

const ref = (dataReferencia) => ({ dataReferencia });

/** Serviço de operações do grupo FinOps (financial-operations-service, porta 8083). */
const real = {
  list: (r, signal) => http(E.operacoes.list, { query: ref(r), signal }),
  get: (id, r, signal) => http(E.operacoes.detail(id), { query: ref(r), signal }),
  parcelas: (id, r, signal) => http(E.operacoes.parcelas(id), { query: ref(r), signal }),
  resumo: (id, r, signal) => http(E.operacoes.resumo(id), { query: ref(r), signal }),
  historico: (id, r, signal) => http(E.operacoes.historico(id), { query: ref(r), signal }),
  pagar: (id, numero, body) => http(E.operacoes.pagamento(id, numero), { method: "POST", body }),
  simularAmortizacao: (id, { quantidadeParcelas, modo, dataReferencia }, signal) =>
    http(E.operacoes.amortizacaoSimulacao(id), { query: { quantidadeParcelas, modo, dataReferencia }, signal }),
  amortizar: (id, body) => http(E.operacoes.amortizacao(id), { method: "POST", body }),
  liquidacao: (id, r, signal) => http(E.operacoes.liquidacao(id), { query: ref(r), signal }),
  liquidar: (id, body) => http(E.operacoes.liquidacao(id), { method: "POST", body }),
};

/** Mesma interface para mock e API real. A escolha é feita a cada chamada: a tela Conexões pode trocar na hora. */
export const operacaoService = new Proxy({}, {
  get: (_alvo, nome) => (env.MOCK_OPERACOES ? mockApi : real)[nome],
});
