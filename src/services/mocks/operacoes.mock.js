// Mock que imita o financial-operations-service (mesmos formatos de src/services/api/contracts.operacoes.js).
import { ApiError } from "../api/httpClient.js";
import { todayISO } from "../../utils/format.js";

const r2 = (n) => Math.round(n * 100) / 100;
const wait = (ms = 550) => new Promise((r) => setTimeout(r, ms));
const addMonths = (iso, m) => { const [y, mo, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + m, Math.min(d, 28))).toISOString().slice(0, 10); };
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function criar(id, valor, n, taxa, offset) {
  const primeiro = addMonths(todayISO(), offset);
  const pmt = r2((valor * taxa) / (1 - Math.pow(1 + taxa, -n)));
  let saldo = valor;
  const parcelas = Array.from({ length: n }, (_, i) => {
    const juros = r2(saldo * taxa), amortizacao = r2(pmt - juros);
    saldo = r2(saldo - amortizacao);
    return { numero: i + 1, vencimento: addMonths(primeiro, i), valorParcela: pmt, amortizacao, juros, saldoDevedor: saldo, pago: 0, multaPaga: 0, moraPaga: 0 };
  });
  const lib = addMonths(primeiro, -1);
  return { id, numeroOperacao: `OP-2026-${String(id).padStart(4, "0")}`, valor, n, taxa, primeiro, lib, parcelas,
    eventos: [{ id: 1, tipo: "OPERACAO_REGISTRADA", origem: "REGISTRADO", dataEfeito: lib, registradoEm: `${lib}T12:00:00Z`, lancamentos: [] }] };
}
const DB = [criar(1, 10000, 12, 0.0185, -2), criar(2, 45000, 48, 0.0149, 1), criar(3, 28000, 36, 0.0162, -5)];
const replays = new Map();

function parcelaView(p, ref) {
  const aberto = r2(p.valorParcela - p.pago);
  const dias = aberto > 0 ? Math.max(0, days(p.vencimento, ref)) : 0;
  const multa = dias > 0 ? Math.max(0, r2(p.valorParcela * 0.02 - p.multaPaga)) : 0;
  const jurosMora = dias > 0 ? Math.max(0, r2((p.valorParcela * 0.01 * dias) / 30 - p.moraPaga)) : 0;
  const status = aberto <= 0 ? "PAGA" : dias > 0 ? "VENCIDA" : p.pago > 0 ? "PARCIALMENTE_PAGA" : "PENDENTE";
  return { numero: p.numero, vencimento: p.vencimento, valorParcela: p.valorParcela, amortizacao: p.amortizacao, juros: p.juros, saldoDevedor: p.saldoDevedor,
    valorEmAberto: aberto, diasEmAtraso: dias, encargos: { multa, jurosMora, total: r2(multa + jurosMora) }, totalParaQuitar: r2(aberto + multa + jurosMora), status };
}
const views = (o, ref) => o.parcelas.map((p) => parcelaView(p, ref));

function operacaoView(o, ref) {
  const v = views(o, ref);
  const dias = Math.max(0, ...v.map((p) => p.diasEmAtraso));
  const status = v.every((p) => p.status === "PAGA") ? "LIQUIDADA" : dias > 90 ? "INADIMPLENTE" : dias > 0 ? "EM_ATRASO" : "ATIVA";
  const saldoDevedor = r2(o.parcelas.reduce((s, p, i) => s + p.amortizacao * (v[i].valorEmAberto / p.valorParcela), 0));
  return { id: o.id, numeroOperacao: o.numeroOperacao, clienteId: "CLI-0001", tipoPessoa: "PF", status, diasEmAtraso: dias,
    definidoEm: `${o.lib}T12:00:00Z`, dataLiberacao: o.lib, saldoDevedor,
    produto: { codigo: "VEIC", nome: "Financiamento de veículo", modalidadeBcb: "Aquisição de veículos" },
    condicoesFinanceiras: { valorAprovado: o.valor, prazoMeses: o.n, quantidadeParcelas: o.n, taxaJuros: o.taxa, taxaJurosAnual: Math.round((Math.pow(1 + o.taxa, 12) - 1) * 1e4) / 1e4,
      faixaRisco: "B", tetoAplicado: false, sistemaAmortizacao: "PRICE", primeiroVencimento: o.primeiro },
    encargos: { iof: { diario: 0, adicional: 0, total: 0 }, tarifaCadastro: 0, total: 0 }, valorLiberado: o.valor,
    cet: { mensal: o.taxa, anual: Math.round((Math.pow(1 + o.taxa, 12) - 1) * 1e4) / 1e4 }, criadoEm: `${o.lib}T12:00:00Z` };
}

function find(id) {
  const o = DB.find((x) => x.numeroOperacao === id || String(x.id) === String(id));
  if (!o) throw new ApiError("Operação não encontrada.", { status: 404, code: "NOT_FOUND" });
  return o;
}
const sum = (arr, f) => r2(arr.reduce((s, x) => s + f(x), 0));

export const mockApi = {
  async list(ref) { await wait(); return DB.map((o) => operacaoView(o, ref)); },
  async get(id, ref) { await wait(); return operacaoView(find(id), ref); },
  async parcelas(id, ref) { await wait(); return views(find(id), ref); },
  async resumo(id, ref) {
    await wait(); const o = find(id), v = views(o, ref), op = operacaoView(o, ref);
    return { numeroOperacao: o.numeroOperacao, dataReferencia: ref, status: op.status, diasEmAtraso: op.diasEmAtraso, totalContratado: o.valor,
      totalPrevisto: sum(o.parcelas, (p) => p.valorParcela), totalPago: sum(o.parcelas, (p) => p.pago + p.multaPaga + p.moraPaga),
      valorAmortizado: sum(o.parcelas, (p) => (p.pago * p.amortizacao) / p.valorParcela), jurosPagos: sum(o.parcelas, (p) => (p.pago * p.juros) / p.valorParcela),
      encargosPagos: sum(o.parcelas, (p) => p.multaPaga + p.moraPaga), descontoAntecipacao: 0,
      valorVencido: sum(v.filter((p) => p.status === "VENCIDA"), (p) => p.valorEmAberto), encargosEmAberto: sum(v, (p) => p.encargos.total),
      saldoDevedor: op.saldoDevedor, valorParaQuitar: sum(v, (p) => p.totalParaQuitar) };
  },
  async historico(id, ref) {
    await wait(); const o = find(id);
    const calculados = views(o, ref).filter((p) => p.status === "VENCIDA").map((p) => ({ tipo: "PARCELA_VENCIDA", origem: "CALCULADO",
      dataEfeito: p.vencimento, numeroParcela: p.numero, descricao: `Parcela ${p.numero} vencida`, lancamentos: [] }));
    return [...o.eventos, ...calculados].sort((a, b) => b.dataEfeito.localeCompare(a.dataEfeito));
  },
  async pagar(id, numero, { valor, dataPagamento, identificadorPagamento, origem }) {
    await wait(700);
    if (identificadorPagamento && replays.has(identificadorPagamento)) return replays.get(identificadorPagamento);
    const o = find(id), p = o.parcelas.find((x) => x.numero === Number(numero));
    if (!p) throw new ApiError("Parcela não encontrada.", { status: 404, code: "NOT_FOUND" });
    const ref = dataPagamento || todayISO(), v = parcelaView(p, ref);
    if (v.status === "PAGA") throw new ApiError("A parcela já está paga.", { status: 400 });
    if (!(valor > 0)) throw new ApiError("Informe um valor maior que zero.", { status: 400 });
    if (valor > v.totalParaQuitar + 0.005) throw new ApiError("O valor excede o total para quitar da parcela.", { status: 400 });
    let resto = r2(valor);
    const multa = Math.min(resto, v.encargos.multa); resto = r2(resto - multa);
    const jurosMora = Math.min(resto, v.encargos.jurosMora); resto = r2(resto - jurosMora);
    const juros = r2((resto * p.juros) / p.valorParcela), amortizacao = r2(resto - juros);
    p.pago = r2(p.pago + resto); p.multaPaga = r2(p.multaPaga + multa); p.moraPaga = r2(p.moraPaga + jurosMora);
    const registradoEm = new Date().toISOString(), nv = parcelaView(p, ref);
    o.eventos.push({ id: o.eventos.length + 1, tipo: "PAGAMENTO", origem: "REGISTRADO", dataEfeito: ref, registradoEm, valor, identificadorPagamento,
      numeroParcela: p.numero, lancamentos: [{ numeroParcela: p.numero, multa, jurosMora, juros, amortizacao, desconto: 0 }] });
    const op = operacaoView(o, ref);
    const res = { id: o.eventos.length, dataPagamento: ref, valor, identificadorPagamento, origem, distribuicao: { multa, jurosMora, juros, amortizacao },
      parcela: { numero: p.numero, status: nv.status === "PAGA" ? "PAGA" : "PARCIALMENTE_PAGA", valorEmAberto: nv.valorEmAberto, encargosEmAberto: nv.encargos.total },
      operacao: { numeroOperacao: o.numeroOperacao, status: op.status, saldoDevedor: op.saldoDevedor }, registradoEm };
    if (identificadorPagamento) replays.set(identificadorPagamento, res);
    return res;
  },
};
