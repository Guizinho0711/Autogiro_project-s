// Único ponto de leitura de variáveis de ambiente.
const e = import.meta.env ?? {}; // fora do Vite (testes no Node) não há import.meta.env

/** Valores que vêm do .env (ou o padrão). A tela Conexões pode trocar alguns deles sem reiniciar o site. */
const BASE = {
  // Catálogo vem do Supabase. "true" usa só os dados de exemplo do próprio site.
  MOCK_VEHICLES: e.VITE_MOCK_VEHICLES === "true",
  // Chave publicável: pode ficar no navegador. Quem protege os dados são as regras (RLS) do banco.
  SUPABASE_URL: e.VITE_SUPABASE_URL ?? "https://kwnxwzrjrnpzhyuphktk.supabase.co",
  SUPABASE_KEY: e.VITE_SUPABASE_KEY ?? "sb_publishable_tBhVrhUNznfnOlFnFP0jsw_0iVgIcUk",
  // false = usa o serviço de operações (FinOps) de verdade
  MOCK_OPERACOES: e.VITE_MOCK_OPERACOES !== "false",
  // false = usa o serviço de juros de verdade (taxas por perfil e acompanhamento do pedido)
  MOCK_CREDITO: e.VITE_MOCK_CREDITO !== "false",
  // false = chama o Score Engine (Java, porta 8080) de verdade
  MOCK_SCORE: e.VITE_MOCK_SCORE !== "false",
  SCORE_URL: e.VITE_SCORE_URL ?? "http://localhost:8080",
  API_URL: e.VITE_API_URL ?? "http://localhost:8083",
  JUROS_URL: e.VITE_JUROS_URL ?? "http://localhost:3000",
  ESTEIRA_URL: e.VITE_ESTEIRA_URL ?? "https://credcasa-esteira-credito.onrender.com",
  // Quanto tempo esperar a operação aparecer no serviço de juros depois de enviar ao Score.
  ESPERA_PEDIDO_S: Number(e.VITE_ESPERA_PEDIDO_S ?? 120),
  REQUEST_TIMEOUT_MS: 10000,
};

/** O que a tela Conexões pode mudar (e fica guardado neste navegador). */
export const AJUSTAVEIS = ["SCORE_URL", "JUROS_URL", "API_URL", "MOCK_SCORE", "MOCK_CREDITO", "MOCK_OPERACOES", "ESPERA_PEDIDO_S"];
const CHAVE = "autogiro:conexoes";

function lerAjustes() {
  try {
    const salvo = JSON.parse(globalThis.localStorage?.getItem(CHAVE) ?? "null");
    if (!salvo || typeof salvo !== "object") return {};
    return Object.fromEntries(Object.entries(salvo).filter(([k]) => AJUSTAVEIS.includes(k)));
  } catch { return {}; }
}

// Objeto único e mutável: os serviços leem env.X na hora de cada chamada, então uma troca
// na tela Conexões vale na próxima requisição, sem recarregar a página.
export const env = { ...BASE, ...lerAjustes() };
export const envPadrao = BASE;

export function salvarConexoes(ajustes) {
  const limpos = Object.fromEntries(Object.entries(ajustes).filter(([k]) => AJUSTAVEIS.includes(k)));
  Object.assign(env, limpos);
  try { globalThis.localStorage?.setItem(CHAVE, JSON.stringify({ ...lerAjustes(), ...limpos })); } catch { /* sem armazenamento */ }
}

export function restaurarConexoes() {
  Object.assign(env, Object.fromEntries(AJUSTAVEIS.map((k) => [k, BASE[k]])));
  try { globalThis.localStorage?.removeItem(CHAVE); } catch { /* sem armazenamento */ }
}

/** true quando algo foi mudado na tela Conexões (e não veio do .env). */
export const temAjustes = () => Object.keys(lerAjustes()).length > 0;
