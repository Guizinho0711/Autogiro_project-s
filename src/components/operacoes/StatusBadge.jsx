import { STATUS_OPERACAO, STATUS_PARCELA } from "../../utils/format.js";

const TONE = { ATIVA: "ok", PAGA: "ok", LIQUIDADA: "ok", PENDENTE: "neutral", RENEGOCIADA: "neutral", PARCIALMENTE_PAGA: "warn", EM_ATRASO: "warn", VENCIDA: "bad", INADIMPLENTE: "bad" };

/** O texto sempre aparece; a cor só reforça. */
export function StatusBadge({ status, kind = "operacao" }) {
  const label = (kind === "parcela" ? STATUS_PARCELA : STATUS_OPERACAO)[status] ?? status;
  return <span className={`badge badge--${TONE[status] ?? "neutral"}`}>{label}</span>;
}
