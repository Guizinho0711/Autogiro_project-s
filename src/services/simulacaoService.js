/**
 * Simulação de financiamento (PRICE ou SAC), calculada no front em centavos inteiros.
 * O back-end atual não simula: quando o serviço de Juros estiver disponível, troque
 * apenas esta função por uma chamada HTTP com o mesmo retorno.
 *
 * @param {{valorVeiculo:number, entrada:number, meses:number, taxaMensal:number, sistema:"PRICE"|"SAC"}} p
 *   taxaMensal em percentual (1.8 = 1,8% a.m.)
 * @returns {null | {valorFinanciado:number, primeiraParcela:number, ultimaParcela:number, totalPago:number, totalJuros:number,
 *   parcelas:{numero:number,valor:number,juros:number,amortizacao:number,saldoDevedor:number}[]}}
 */
export function simular({ valorVeiculo, entrada, meses, taxaMensal, sistema }) {
  const pv = Math.round(valorVeiculo * 100) - Math.round(entrada * 100);
  if (pv <= 0 || meses < 1 || taxaMensal < 0) return null;

  const i = taxaMensal / 100;
  const pmt = i === 0 ? Math.round(pv / meses) : Math.round((pv * i) / (1 - Math.pow(1 + i, -meses)));
  const amortSac = Math.floor(pv / meses);

  let saldo = pv, totalPago = 0, totalJuros = 0;
  const parcelas = [];
  for (let n = 1; n <= meses; n++) {
    const juros = Math.round(saldo * i);
    let amort = sistema === "SAC" ? amortSac : pmt - juros;
    if (n === meses) amort = saldo; // a última parcela zera o saldo ao centavo
    saldo -= amort;
    totalPago += amort + juros;
    totalJuros += juros;
    parcelas.push({ numero: n, valor: (amort + juros) / 100, juros: juros / 100, amortizacao: amort / 100, saldoDevedor: saldo / 100 });
  }
  return {
    valorFinanciado: pv / 100, primeiraParcela: parcelas[0].valor, ultimaParcela: parcelas[meses - 1].valor,
    totalPago: totalPago / 100, totalJuros: totalJuros / 100, parcelas,
  };
}
