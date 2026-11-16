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
  const status = o.liquidada || v.every((p) => p.status === "PAGA") ? "LIQUIDADA" : dias > 90 ? "INADIMPLENTE" : dias > 0 ? "EM_ATRASO" : "ATIVA";
  const saldoDevedor = r2(o.parcelas.reduce((s, p, i) => s + p.amortizacao * (v[i].valorEmAberto / p.valorParcela), 0));
  return { id: o.id, numeroOperacao: o.numeroOperacao, clienteId: o.clienteId ?? "CLI-0001", tipoPessoa: "PF", status, diasEmAtraso: dias,
    definidoEm: `${o.lib}T12:00:00Z`, dataLiberacao: o.lib, saldoDevedor,
    produto: { codigo: "VEIC", nome: "Financiamento de veículo", modalidadeBcb: "Aquisição de veículos" },
    condicoesFinanceiras: { valorAprovado: o.valor, prazoMeses: o.n, quantidadeParcelas: o.n, taxaJuros: o.taxa, taxaJurosAnual: Math.round((Math.pow(1 + o.taxa, 12) - 1) * 1e4) / 1e4,
      faixaRisco: o.faixa ?? "B", tetoAplicado: false, sistemaAmortizacao: o.sistema ?? "PRICE", primeiroVencimento: o.primeiro },
    encargos: { iof: { diario: 0, adicional: 0, total: 0 }, tarifaCadastro: 0, total: 0 }, valorLiberado: o.valor,
    cet: { mensal: o.taxa, anual: Math.round((Math.pow(1 + o.taxa, 12) - 1) * 1e4) / 1e4 }, criadoEm: `${o.lib}T12:00:00Z` };
}

function find(id) {
  const o = DB.find((x) => x.numeroOperacao === id || String(x.id) === String(id));
  if (!o) throw new ApiError("Operação não encontrada.", { status: 404, code: "NOT_FOUND" });
  return o;
}
const sum = (arr, f) => r2(arr.reduce((s, x) => s + f(x), 0));

// ---- Antecipação e quitação (mesmas regras do FinOps, de forma simplificada) ----
const proximoNum = () => Math.max(0, ...DB.map((o) => o.id)) + 1;
// Valor presente da parcela k (1 = próxima a vencer), descontando a fração f já decorrida do período.
const vp = (valor, taxa, k, f) => r2(valor / Math.pow(1 + taxa, Math.max(0, k - f)));
function fracaoDecorrida(o, refISO) {
  const anteriores = o.parcelas.map((p) => p.vencimento).filter((d) => d <= refISO);
  const inicio = anteriores.length ? anteriores[anteriores.length - 1] : o.lib;
  return Math.min(1, Math.max(0, days(inicio, refISO) / 30));
}
function abertasFuturas(o, refISO) {
  const v = views(o, refISO);
  if (v.some((p) => p.status === "VENCIDA" || p.status === "PARCIALMENTE_PAGA")) {
    throw new ApiError("Há parcela vencida em aberto ou paga em parte. Regularize antes de antecipar.", { status: 400 });
  }
  return o.parcelas.filter((p, i) => v[i].status === "PENDENTE");
}
function calculaAmortizacao(o, { quantidadeParcelas, modo = "ULTIMAS", dataReferencia }) {
  const refISO = dataReferencia || todayISO(), q = Number(quantidadeParcelas), m = String(modo).toUpperCase();
  const abertas = abertasFuturas(o, refISO);
  if (!(Number.isInteger(q) && q > 0)) throw new ApiError("Informe quantas parcelas antecipar.", { status: 400 });
  if (q >= abertas.length) throw new ApiError("Isso cobre todas as parcelas em aberto. Use a quitação da operação.", { status: 400 });
  const f = fracaoDecorrida(o, refISO);
  const escolhidas = (m === "PROXIMAS" ? abertas.slice(0, q) : abertas.slice(-q));
  const parcelas = escolhidas.map((p) => {
    const k = abertas.indexOf(p) + 1, presente = p.vencimento === refISO ? p.valorParcela : vp(p.valorParcela, o.taxa, k, f);
    return { numero: p.numero, vencimento: p.vencimento, valorParcela: p.valorParcela, valorPresente: presente, desconto: r2(p.valorParcela - presente), amortizacao: presente, juros: 0 };
  });
  const totais = { valorParcelas: sum(parcelas, (p) => p.valorParcela), desconto: sum(parcelas, (p) => p.desconto), valorPresente: sum(parcelas, (p) => p.valorPresente), amortizacao: sum(parcelas, (p) => p.amortizacao), juros: 0 };
  totais.valorAPagar = totais.valorPresente;
  const antes = operacaoView(o, refISO).saldoDevedor;
  return { numeroOperacao: o.numeroOperacao, modo: m, dataReferencia: refISO, quantidadeParcelas: q, parcelas, totais,
    saldoDevedorAntes: antes, saldoDevedorApos: r2(Math.max(0, antes - totais.amortizacao)), quantidadeParcelasRestantes: abertas.length - q };
}
function calculaLiquidacao(o, refISO) {
  if (operacaoView(o, refISO).status === "LIQUIDADA") throw new ApiError("A operação já está liquidada.", { status: 400 });
  const v = views(o, refISO), f = fracaoDecorrida(o, refISO);
  const vencidas = v.filter((p) => p.status === "VENCIDA" || (p.diasEmAtraso > 0 && p.valorEmAberto > 0))
    .map((p) => ({ numero: p.numero, vencimento: p.vencimento, diasEmAtraso: p.diasEmAtraso, valorEmAberto: p.valorEmAberto, multa: p.encargos.multa, jurosMora: p.encargos.jurosMora, total: p.totalParaQuitar }));
  const futuras = v.filter((p) => p.valorEmAberto > 0 && p.diasEmAtraso === 0);
  const aVencerParcelas = futuras.map((p, i) => {
    const presente = p.vencimento === refISO ? p.valorEmAberto : vp(p.valorEmAberto, o.taxa, i + 1, f);
    return { numero: p.numero, vencimento: p.vencimento, valorEmAberto: p.valorEmAberto, valorPresente: presente, desconto: r2(p.valorEmAberto - presente) };
  });
  const aVencer = { parcelas: aVencerParcelas, valorNominal: sum(aVencerParcelas, (p) => p.valorEmAberto), valorPresente: sum(aVencerParcelas, (p) => p.valorPresente) };
  aVencer.desconto = r2(aVencer.valorNominal - aVencer.valorPresente); aVencer.amortizacao = aVencer.valorPresente; aVencer.juros = 0;
  const totalVencidas = sum(vencidas, (p) => p.total);
  return { numeroOperacao: o.numeroOperacao, dataReferencia: refISO, valorParaQuitar: r2(totalVencidas + aVencer.valorPresente),
    saldoDevedor: operacaoView(o, refISO).saldoDevedor, vencidas: { parcelas: vencidas, total: totalVencidas }, aVencer };
}

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
  async simularAmortizacao(id, params) { await wait(); return calculaAmortizacao(find(id), params); },
  async amortizar(id, { quantidadeParcelas, modo, dataPagamento, identificadorPagamento }) {
    await wait(700);
    if (identificadorPagamento && replays.has(identificadorPagamento)) return replays.get(identificadorPagamento);
    const o = find(id), sim = calculaAmortizacao(o, { quantidadeParcelas, modo, dataReferencia: dataPagamento });
    sim.parcelas.forEach((x) => { const p = o.parcelas.find((y) => y.numero === x.numero); p.pago = p.valorParcela; p.desconto = x.desconto; });
    const evento = { id: o.eventos.length + 1, tipo: "AMORTIZACAO_ANTECIPADA", origem: "REGISTRADO", dataEfeito: sim.dataReferencia, registradoEm: new Date().toISOString(),
      valor: sim.totais.valorAPagar, descricao: `${sim.quantidadeParcelas} parcela(s) antecipada(s), desconto de R$ ${sim.totais.desconto.toFixed(2).replace(".", ",")}`,
      lancamentos: sim.parcelas.map((p) => ({ numeroParcela: p.numero, amortizacao: p.amortizacao, juros: 0, desconto: p.desconto })) };
    o.eventos.push(evento);
    const res = { eventoId: evento.id, tipo: "AMORTIZACAO_ANTECIPADA", numeroOperacao: o.numeroOperacao, modo: sim.modo, identificadorPagamento, dataPagamento: sim.dataReferencia,
      quantidadeParcelas: sim.quantidadeParcelas, lancamentos: sim.parcelas, totais: sim.totais, saldoDevedorAntes: sim.saldoDevedorAntes, saldoDevedorApos: sim.saldoDevedorApos, quantidadeParcelasRestantes: sim.quantidadeParcelasRestantes };
    if (identificadorPagamento) replays.set(identificadorPagamento, res);
    return res;
  },
  async liquidacao(id, ref) { await wait(); return calculaLiquidacao(find(id), ref || todayISO()); },
  async liquidar(id, { valor, dataPagamento, identificadorPagamento }) {
    await wait(700);
    if (identificadorPagamento && replays.has(identificadorPagamento)) return replays.get(identificadorPagamento);
    const o = find(id), refISO = dataPagamento || todayISO(), calc = calculaLiquidacao(o, refISO);
    if (Math.abs(Number(valor) - calc.valorParaQuitar) > 0.009) throw new ApiError(`O valor para quitar nesta data é R$ ${calc.valorParaQuitar.toFixed(2).replace(".", ",")}. Consulte de novo e confirme.`, { status: 400 });
    o.parcelas.forEach((p) => { p.pago = p.valorParcela; });
    o.liquidada = true;
    const evento = { id: o.eventos.length + 1, tipo: "LIQUIDACAO", origem: "REGISTRADO", dataEfeito: refISO, registradoEm: new Date().toISOString(), valor: calc.valorParaQuitar,
      descricao: `Operação quitada, desconto de R$ ${calc.aVencer.desconto.toFixed(2).replace(".", ",")}`, lancamentos: [] };
    o.eventos.push(evento);
    const res = { id: evento.id, dataPagamento: refISO, valor: calc.valorParaQuitar, identificadorPagamento, vencidas: calc.vencidas.parcelas, aVencer: { parcelas: calc.aVencer.parcelas.map((p) => p.numero), valorNominal: calc.aVencer.valorNominal, desconto: calc.aVencer.desconto } };
    if (identificadorPagamento) replays.set(identificadorPagamento, res);
    return res;
  },
  /** Modo demonstração: o "serviço de juros" simulado registra aqui a operação definida (como o Juros real faz no FinOps). */
  registrarDoJuros(op) {
    const sim = op.simulacoes[op.definicao.sistema];
    const lib = op.entrada.dataLiberacao;
    const parcelas = sim.cronograma.map((c) => ({ numero: c.numero, vencimento: c.vencimento, valorParcela: c.valor, amortizacao: c.amortizacao, juros: c.juros, saldoDevedor: c.saldoDevedor, pago: 0, multaPaga: 0, moraPaga: 0 }));
    const existente = DB.find((o) => o.numeroOperacao === op.identificador);
    if (existente) return existente;
    const nova = { id: proximoNum(), numeroOperacao: op.identificador, valor: op.entrada.valor, n: op.entrada.prazoMeses, taxa: op.taxa.taxaFinalMes / 100, primeiro: parcelas[0].vencimento,
      lib, parcelas, sistema: op.definicao.sistema, faixa: op.taxa.faixaRisco, clienteId: op.cliente.documento,
      eventos: [{ id: 1, tipo: "OPERACAO_REGISTRADA", origem: "REGISTRADO", dataEfeito: lib, registradoEm: new Date().toISOString(), descricao: "Recebida do serviço de juros", lancamentos: [] }] };
    DB.unshift(nova);
    return nova;
  },
};
