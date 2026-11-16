export const formatBRL = (v) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const formatKm = (v) => `${v.toLocaleString("pt-BR")} km`;

export const CATEGORY_LABELS = { hatch: "Hatch", sedan: "Sedã", suv: "SUV", picape: "Picape", moto: "Moto" };
export const FUEL_LABELS = { flex: "Flex", gasolina: "Gasolina", diesel: "Diesel", eletrico: "Elétrico" };
export const TRANSMISSION_LABELS = { manual: "Manual", automatico: "Automático" };

export const formatMoney = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatPct = (fraction) => `${(fraction * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
// Datas "YYYY-MM-DD" são formatadas sem passar por Date, para não deslocar o dia pelo fuso.
export const formatDate = (iso) => { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; };
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const STATUS_OPERACAO = { ATIVA: "Em dia", EM_ATRASO: "Em atraso", INADIMPLENTE: "Inadimplente", RENEGOCIADA: "Renegociada", LIQUIDADA: "Liquidada" };
export const STATUS_PARCELA = { PENDENTE: "A vencer", PAGA: "Paga", PARCIALMENTE_PAGA: "Parcial", VENCIDA: "Vencida" };
export const TIPO_EVENTO = {
  OPERACAO_REGISTRADA: "Operação registrada", PAGAMENTO: "Pagamento", AMORTIZACAO_ANTECIPADA: "Amortização antecipada",
  LIQUIDACAO: "Liquidação", PARCELA_VENCIDA: "Parcela vencida", OPERACAO_INADIMPLENTE: "Operação inadimplente",
};
/** "12.345,67" ou "12345.67" → 12345.67. Vazio ou inválido → NaN. */
export const parseNum = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};
