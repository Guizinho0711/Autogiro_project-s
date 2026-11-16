import { simular } from "./simulacaoService.js";

export const ESTIMATIVA = { meses: 48, entradaPct: 20, faixa: "B" };

/** Parcela de referência exibida nos cartões: 48x, 20% de entrada, perfil B. */
export function estimativa(v, taxaMensal) {
  if (taxaMensal == null) return null;
  const entrada = Math.round((v.priceBRL * ESTIMATIVA.entradaPct) / 100);
  const r = simular({ valorVeiculo: v.priceBRL, entrada, meses: ESTIMATIVA.meses, taxaMensal, sistema: "PRICE" });
  return r && { parcela: r.primeiraParcela, meses: ESTIMATIVA.meses, entrada };
}
