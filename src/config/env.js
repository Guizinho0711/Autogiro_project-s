// Único ponto de leitura de variáveis de ambiente.
export const env = {
  MOCK_VEHICLES: import.meta.env.VITE_MOCK_VEHICLES !== "false",
  MOCK_OPERACOES: import.meta.env.VITE_MOCK_OPERACOES !== "false",
  // false = lê a política de crédito (taxas por faixa) do serviço de juros
  MOCK_CREDITO: import.meta.env.VITE_MOCK_CREDITO !== "false",
  API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:8083",
  JUROS_URL: import.meta.env.VITE_JUROS_URL ?? "http://localhost:3000",
  ESTEIRA_URL: import.meta.env.VITE_ESTEIRA_URL ?? "https://credcasa-esteira-credito.onrender.com",
  REQUEST_TIMEOUT_MS: 10000,
};
