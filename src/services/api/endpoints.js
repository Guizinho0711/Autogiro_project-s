// Endpoints do financial-operations-service (porta 8083) e do catálogo (ainda mock).
export const ENDPOINTS = {
  vehicles: { list: "/vehicles", detail: (id) => `/vehicles/${encodeURIComponent(id)}` }, // futuro
  operacoes: {
    list: "/operacoes",
    detail: (id) => `/operacoes/${encodeURIComponent(id)}`,
    parcelas: (id) => `/operacoes/${encodeURIComponent(id)}/parcelas`,
    resumo: (id) => `/operacoes/${encodeURIComponent(id)}/resumo`,
    historico: (id) => `/operacoes/${encodeURIComponent(id)}/historico`,
    pagamento: (id, n) => `/operacoes/${encodeURIComponent(id)}/parcelas/${n}/pagamentos`,
  },
};
