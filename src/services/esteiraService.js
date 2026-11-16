import { env } from "../config/env.js";
import { http } from "./api/httpClient.js";

/**
 * API CredCasa (esteira de crédito), publicada no Render.
 * Contratos confirmados: GET /api/health, GET /api/esteira/:id e POST /api/esteira/iniciar.
 * O corpo do POST ainda não foi recebido, então ele não está implementado aqui.
 * O Render gratuito dorme: a primeira chamada pode levar até ~1 minuto.
 */
const opts = { baseUrl: env.ESTEIRA_URL, timeoutMs: 60000 };

export const esteiraService = {
  health: (signal) => http("/api/health", { ...opts, signal }),
  consultar: (id, signal) => http(`/api/esteira/${encodeURIComponent(id)}`, { ...opts, signal }),
};
