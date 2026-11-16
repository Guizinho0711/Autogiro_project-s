// Único ponto de leitura de variáveis de ambiente.
const e = import.meta.env ?? {}; // fora do Vite (testes no Node) não há import.meta.env
export const env = {
  // Catálogo vem do Supabase. "true" usa só os dados de exemplo do próprio site.
  MOCK_VEHICLES: e.VITE_MOCK_VEHICLES === "true",
  // Chave publicável: pode ficar no navegador. Quem protege os dados são as regras (RLS) do banco.
  SUPABASE_URL: e.VITE_SUPABASE_URL ?? "https://kwnxwzrjrnpzhyuphktk.supabase.co",
  SUPABASE_KEY: e.VITE_SUPABASE_KEY ?? "sb_publishable_tBhVrhUNznfnOlFnFP0jsw_0iVgIcUk",
  MOCK_OPERACOES: e.VITE_MOCK_OPERACOES !== "false",
  // false = lê a política de crédito (taxas por faixa) do serviço de juros
  MOCK_CREDITO: e.VITE_MOCK_CREDITO !== "false",
  // false = chama o Score Engine (Java, porta 8080) de verdade
  MOCK_SCORE: e.VITE_MOCK_SCORE !== "false",
  SCORE_URL: e.VITE_SCORE_URL ?? "http://localhost:8080",
  API_URL: e.VITE_API_URL ?? "http://localhost:8083",
  JUROS_URL: e.VITE_JUROS_URL ?? "http://localhost:3000",
  ESTEIRA_URL: e.VITE_ESTEIRA_URL ?? "https://credcasa-esteira-credito.onrender.com",
  REQUEST_TIMEOUT_MS: 10000,
};
