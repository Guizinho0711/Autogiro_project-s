/**
 * Contratos reais do financial-operations-service (extraídos do api/openapi.yaml).
 * Valores monetários são number (decimal). Taxas saem em fração (0.0185 = 1,85%). Datas: "YYYY-MM-DD".
 * Erros: { erro: string } com status 400 ou 404.
 *
 * @typedef {"ATIVA"|"EM_ATRASO"|"INADIMPLENTE"|"RENEGOCIADA"|"LIQUIDADA"} StatusOperacao
 * @typedef {"PENDENTE"|"PAGA"|"PARCIALMENTE_PAGA"|"VENCIDA"} StatusParcela
 *
 * @typedef {Object} Operacao   GET /operacoes e GET /operacoes/:id  (?dataReferencia=)
 * @property {number} id @property {string} numeroOperacao @property {string} clienteId
 * @property {"PF"|"PJ"} tipoPessoa @property {StatusOperacao} status @property {number} diasEmAtraso
 * @property {string} definidoEm @property {string} dataLiberacao @property {number} saldoDevedor
 * @property {{codigo:string,nome:string,modalidadeBcb:string}} produto
 * @property {{valorAprovado:number,prazoMeses:number,quantidadeParcelas:number,taxaJuros:number,taxaJurosAnual:number,
 *   faixaRisco:string,tetoAplicado:boolean,sistemaAmortizacao:"PRICE"|"SAC",primeiroVencimento:string}} condicoesFinanceiras
 * @property {{iof:{diario:number,adicional:number,total:number},tarifaCadastro:number,total:number}} encargos
 * @property {number} valorLiberado @property {{mensal:number,anual:number}} cet @property {string} criadoEm
 *
 * @typedef {Object} Parcela   GET /operacoes/:id/parcelas
 * @property {number} numero @property {string} vencimento @property {number} valorParcela @property {number} amortizacao
 * @property {number} juros @property {number} saldoDevedor @property {number} valorEmAberto @property {number} diasEmAtraso
 * @property {{multa:number,jurosMora:number,total:number}} encargos @property {number} totalParaQuitar @property {StatusParcela} status
 *
 * @typedef {Object} Resumo   GET /operacoes/:id/resumo
 * @property {string} numeroOperacao @property {string} dataReferencia @property {StatusOperacao} status @property {number} diasEmAtraso
 * @property {number} totalContratado @property {number} totalPrevisto @property {number} totalPago @property {number} valorAmortizado
 * @property {number} jurosPagos @property {number} encargosPagos @property {number} descontoAntecipacao @property {number} valorVencido
 * @property {number} encargosEmAberto @property {number} saldoDevedor @property {number} valorParaQuitar
 *
 * @typedef {Object} ItemHistorico   GET /operacoes/:id/historico
 * @property {number} [id] @property {"OPERACAO_REGISTRADA"|"PAGAMENTO"|"AMORTIZACAO_ANTECIPADA"|"LIQUIDACAO"|"PARCELA_VENCIDA"|"OPERACAO_INADIMPLENTE"} tipo
 * @property {"REGISTRADO"|"CALCULADO"} origem @property {string} dataEfeito @property {string} [registradoEm] @property {number} [valor]
 * @property {number} [numeroParcela] @property {string} [descricao]
 * @property {{numeroParcela:number,multa:number,jurosMora:number,juros:number,amortizacao:number,desconto:number}[]} lancamentos
 *
 * @typedef {Object} PagamentoRequest   POST /operacoes/:id/parcelas/:n/pagamentos
 * @property {number} valor @property {string} [dataPagamento] @property {string} [identificadorPagamento] @property {string} [origem]
 *
 * @typedef {Object} PagamentoRegistrado   201 (200 se o identificadorPagamento for reenviado)
 * @property {number} id @property {string} dataPagamento @property {number} valor
 * @property {{multa:number,jurosMora:number,juros:number,amortizacao:number}} distribuicao
 * @property {{numero:number,status:"PARCIALMENTE_PAGA"|"PAGA",valorEmAberto:number,encargosEmAberto:number}} parcela
 * @property {{numeroOperacao:string,status:StatusOperacao,saldoDevedor:number}} operacao @property {string} registradoEm
 */
export {};
