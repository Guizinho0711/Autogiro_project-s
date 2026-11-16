import { env } from "../config/env.js";
import { http, ApiError } from "./api/httpClient.js";
import { simular } from "./simulacaoService.js";
import { POLITICA_REFERENCIA } from "./creditoService.js";
import { mockApi as operacoesMock } from "./mocks/operacoes.mock.js";
import { todayISO } from "../utils/format.js";

/**
 * Pedido de financiamento, no fluxo combinado entre os grupos:
 *   AutoGiro → Score → Decisão → Juros → (FinOps e Documentos)
 * O AutoGiro só fala com o Score para enviar. Depois, consulta o serviço de juros pelo número da
 * operação até a simulação aparecer (polling). Se a Decisão recusar, nada chega ao Juros: por isso
 * existe um limite de tempo. Por fim, o cliente escolhe PRICE ou SAC e o Juros registra no FinOps.
 */

/** Número da operação usado por todos os grupos: OP-AAAA-NNNNNN (o FinOps aceita 4 dígitos ou mais, até 20 caracteres). */
export function novoNumeroOperacao(agora = new Date()) {
  const seq = String((agora.getTime() % 900000) + 100000);
  return `OP-${agora.getFullYear()}-${seq}`;
}

// ---------- Serviço de juros real (gmelchert/calculo-juros-facul) ----------
const juros = (path, opts = {}) => http(path, { baseUrl: env.JUROS_URL, ...opts });

/** Uma consulta: devolve a operação se ela já existe no Juros, ou null se ainda não chegou. */
async function consultarJurosReal(numero, signal) {
  try {
    // 200: já está DEFINIDA (alguém já escolheu o sistema).
    const consolidado = await juros(`/api/operacoes/por-identificador/${encodeURIComponent(numero)}/consolidado`, { signal });
    return { estado: "DEFINIDA", consolidado };
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    if (err.status === 404) return null; // ainda não chegou
    if (err.status === 422 && err.code === "OPERACAO_NAO_DEFINIDA") {
      // Já existe e está SIMULADA: o consolidado só vale para definidas, então buscamos a operação completa.
      const lista = await juros("/api/operacoes", { query: { estado: "SIMULADA", tamanho: 100 }, signal });
      const resumo = lista.itens?.find((o) => o.identificador === numero);
      const id = resumo?.id ?? Number(/Operação (\d+)/.exec(err.message)?.[1]);
      if (!id) return null;
      return juros(`/api/operacoes/${id}`, { signal });
    }
    throw err;
  }
}

// ---------- Modo demonstração: Decisão e Juros simulados no navegador ----------
const demo = new Map(); // número → { prontaEm, operacao } ou { recusada: true }
const r2 = (n) => Math.round(n * 100) / 100;
const addMeses = (iso, m) => { const [y, mo, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + m, Math.min(d, 28))).toISOString().slice(0, 10); };
const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// CET mensal: a taxa que iguala o valor liberado às parcelas (Newton).
function cetMensal(liberado, parcelas) {
  let i = 0.02;
  for (let k = 0; k < 60; k++) {
    let f = -liberado, df = 0;
    parcelas.forEach((p, n) => { const t = n + 1; f += p / Math.pow(1 + i, t); df -= (t * p) / Math.pow(1 + i, t + 1); });
    const prox = i - f / df; if (Math.abs(prox - i) < 1e-10) { i = prox; break; } i = prox;
  }
  return i;
}

/** Monta uma operação no mesmo formato que o serviço de juros devolve (estimativa local). */
function operacaoDemo({ numero, valor, prazoMeses, score, documento, dataLiberacao }) {
  const faixa = POLITICA_REFERENCIA.faixas.find((f) => score >= f.scoreMin && score <= f.scoreMax);
  const simulacoes = {};
  for (const sistema of ["PRICE", "SAC"]) {
    const r = simular({ valorVeiculo: valor, entrada: 0, meses: prazoMeses, taxaMensal: faixa.taxaMensalPercentual, sistema });
    const cronograma = r.parcelas.map((p) => ({ numero: p.numero, amortizacao: p.amortizacao, juros: p.juros, valor: p.valor, saldoDevedor: p.saldoDevedor, vencimento: addMeses(dataLiberacao, p.numero) }));
    // IOF de pessoa física: 0,38% sobre o crédito + 0,0082% ao dia sobre cada amortização (até 365 dias).
    const iofAdicional = r2(valor * 0.0038);
    const iofDiario = r2(cronograma.reduce((t, c) => t + c.amortizacao * 0.000082 * Math.min(365, dias(dataLiberacao, c.vencimento)), 0));
    const encargos = { iof: { adicional: iofAdicional, diario: iofDiario, total: r2(iofAdicional + iofDiario) }, total: r2(iofAdicional + iofDiario) };
    const valorLiberado = r2(valor - encargos.total);
    const m = cetMensal(valorLiberado, cronograma.map((c) => c.valor));
    simulacoes[sistema] = {
      sistema, ...(sistema === "PRICE" ? { parcelaFixa: r.primeiraParcela } : { amortizacaoBase: cronograma[0].amortizacao }),
      totalJuros: r.totalJuros, totalPago: r.totalPago, encargos, valorLiberado,
      cet: { mensalPercentual: r2(m * 100), anualPercentual: r2((Math.pow(1 + m, 12) - 1) * 100) }, cronograma,
    };
  }
  return {
    id: Math.floor(Math.random() * 90000) + 10000, identificador: numero, criadoEm: new Date().toISOString(), estado: "SIMULADA", definicao: null,
    cliente: { tipoPessoa: "PF", documento },
    entrada: { valor, modalidade: "VEICULOS", score, prazoMeses, dataLiberacao, primeiroRelacionamento: false },
    taxa: { faixaRisco: faixa.faixa, descricaoFaixa: faixa.descricao, taxaFinalMes: faixa.taxaMensalPercentual, taxaFinalAno: faixa.taxaAnualPercentual },
    simulacoes, demonstracao: true,
  };
}

/** Regra da Decisão simulada: a mesma do serviço simulado de Decisão do CredCasa (700+ aprova; 550 a 699 vai para análise manual). */
export const REGRA_DECISAO_DEMO = "700 pontos ou mais aprova; de 550 a 699 vai para análise manual; abaixo de 550 recusa";
function decisaoDemo(score) { return score >= 700 ? "APROVADO" : score >= 550 ? "ANALISE_MANUAL" : "REPROVADO"; }

export const pedidoService = {
  get juroSimulado() { return env.MOCK_CREDITO; },
  get limiteSegundos() { return env.MOCK_CREDITO ? 15 : env.ESPERA_PEDIDO_S; },

  /** Chamado depois que o Score respondeu. No modo demonstração, agenda o que a Decisão e o Juros fariam. */
  registrarEnvio({ numero, valor, prazoMeses, score, documento }) {
    if (!env.MOCK_CREDITO) return;
    if (decisaoDemo(score) !== "APROVADO") { demo.set(numero, { recusada: true }); return; }
    demo.set(numero, { prontaEm: Date.now() + 2500 + Math.random() * 2000, operacao: operacaoDemo({ numero, valor, prazoMeses, score, documento, dataLiberacao: todayISO() }) });
  },

  /** Uma consulta ao Juros: a operação, ou null se ainda não chegou. */
  async consultar(numero, signal) {
    if (!env.MOCK_CREDITO) return consultarJurosReal(numero, signal);
    await new Promise((r) => setTimeout(r, 250));
    const d = demo.get(numero);
    return d && !d.recusada && Date.now() >= d.prontaEm ? d.operacao : null;
  },

  /**
   * Fica consultando o Juros até a operação aparecer ou o tempo acabar.
   * onTick({ tentativa, decorrido, limite }) é chamado a cada consulta, para a tela mostrar o progresso.
   */
  async acompanhar(numero, { signal, onTick, intervaloMs = 3000, limiteS = this.limiteSegundos } = {}) {
    const inicio = Date.now();
    for (let tentativa = 1; ; tentativa++) {
      if (signal?.aborted) throw new ApiError("Acompanhamento cancelado.", { code: "CANCELADO" });
      let op = null;
      try { op = await this.consultar(numero, signal); }
      catch (err) {
        if (err.code === "NETWORK" || err.code === "TIMEOUT") throw new ApiError(`Não consegui falar com o serviço de juros em ${env.JUROS_URL}. Confira o endereço na tela Conexões.`, { code: "NETWORK" });
        throw err;
      }
      const decorrido = (Date.now() - inicio) / 1000;
      onTick?.({ tentativa, decorrido, limite: limiteS });
      if (op) return op;
      if (decorrido >= limiteS) {
        throw new ApiError(`Nada chegou ao serviço de juros em ${Math.round(limiteS)} segundos. A Decisão pode ter recusado a proposta ou pedido análise manual.`, { code: "TEMPO_ESGOTADO" });
      }
      await new Promise((r) => setTimeout(r, env.MOCK_CREDITO ? 1000 : intervaloMs));
    }
  },

  /** O cliente escolheu PRICE ou SAC. O Juros grava e envia a operação ao FinOps e ao grupo de Documentos. */
  async definir(operacao, sistema) {
    if (!env.MOCK_CREDITO && !operacao.demonstracao) {
      return juros(`/api/operacoes/${operacao.id}/definicao`, { method: "POST", body: { sistema } });
    }
    await new Promise((r) => setTimeout(r, 700));
    const definida = { ...operacao, estado: "DEFINIDA", definicao: { sistema, definidoEm: new Date().toISOString() } };
    if (env.MOCK_OPERACOES) operacoesMock.registrarDoJuros(definida);
    return definida;
  },
};
