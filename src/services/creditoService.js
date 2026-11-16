import { env } from "../config/env.js";
import { http } from "./api/httpClient.js";

/** Tabela de referência: os mesmos valores do seed do serviço de juros (modalidade VEICULOS),
 *  do repositório gmelchert/calculo-juros-facul (outro grupo). Os valores são deles; aqui só são exibidos. */
export const POLITICA_REFERENCIA = {
  modalidade: "VEICULOS",
  prazoMinMeses: 12,
  prazoMaxMeses: 60,
  tetoTaxaMensalPercentual: 3.0,
  origem: "referencia",
  faixas: [
    { faixa: "A", scoreMin: 800, scoreMax: 1000, taxaMensalPercentual: 1.5, taxaAnualPercentual: 19.56, descricao: "Risco muito baixo", permiteContratacao: true },
    { faixa: "B", scoreMin: 600, scoreMax: 799, taxaMensalPercentual: 2.0, taxaAnualPercentual: 26.82, descricao: "Risco baixo", permiteContratacao: true },
    { faixa: "C", scoreMin: 400, scoreMax: 599, taxaMensalPercentual: 2.5, taxaAnualPercentual: 34.49, descricao: "Risco médio", permiteContratacao: true },
    { faixa: "D", scoreMin: 200, scoreMax: 399, taxaMensalPercentual: 3.0, taxaAnualPercentual: 42.58, descricao: "Risco alto", permiteContratacao: true },
    { faixa: "E", scoreMin: 0, scoreMax: 199, taxaMensalPercentual: null, taxaAnualPercentual: null, descricao: "Recusado: score abaixo do mínimo", permiteContratacao: false },
  ],
};

// Traduz GET /api/modalidades/VEICULOS (serviço de juros) para o formato do contrato do AutoGiro.
const fromJuros = (m) => ({
  modalidade: m.codigo,
  prazoMinMeses: m.prazoMinMeses,
  prazoMaxMeses: m.prazoMaxMeses,
  tetoTaxaMensalPercentual: m.tetoTaxaMes,
  origem: "juros",
  faixas: m.faixas.map((f) => ({
    faixa: f.faixa, scoreMin: f.scoreMin, scoreMax: f.scoreMax,
    taxaMensalPercentual: f.taxaMes, taxaAnualPercentual: f.taxaAno,
    descricao: f.descricao, permiteContratacao: f.permiteContratacao,
  })),
});

let cache = null, cacheUrl = null;

export const creditoService = {
  /** Política de crédito de veículos. Se o serviço de juros não responder, usa a tabela de referência. */
  politica(signal) {
    if (env.MOCK_CREDITO) return Promise.resolve(POLITICA_REFERENCIA);
    if (cacheUrl !== env.JUROS_URL) { cache = null; cacheUrl = env.JUROS_URL; }
    cache ??= http("/api/modalidades/VEICULOS", { baseUrl: env.JUROS_URL, signal })
      .then(fromJuros)
      .catch(() => { cache = null; return { ...POLITICA_REFERENCIA, origem: "referencia" }; });
    return cache;
  },
};

/** Faixas que aceitam contratação, para os seletores. */
export const faixasContrataveis = (politica) => politica.faixas.filter((f) => f.permiteContratacao);
export const taxaDaFaixa = (politica, letra) => politica.faixas.find((f) => f.faixa === letra)?.taxaMensalPercentual ?? null;
