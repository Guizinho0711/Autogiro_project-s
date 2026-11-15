// Único ponto de leitura de variáveis de ambiente.
export const env = {
  MOCK_VEHICLES: import.meta.env.VITE_MOCK_VEHICLES !== "false",
  MOCK_OPERACOES: import.meta.env.VITE_MOCK_OPERACOES !== "false",
  API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:8083",
  REQUEST_TIMEOUT_MS: 10000,
};
