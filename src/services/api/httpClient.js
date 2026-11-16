import { env } from "../../config/env.js";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "UNKNOWN" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Cliente HTTP único: timeout, JSON e erros padronizados. */
export async function http(path, { method = "GET", query, body, signal, baseUrl = env.API_URL, timeoutMs = env.REQUEST_TIMEOUT_MS } = {}) {
  const url = new URL(baseUrl + path, window.location.origin);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener("abort", () => controller.abort());

  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(data?.erro ?? data?.message ?? "Não foi possível concluir a solicitação.", {
        status: res.status,
        code: data?.code,
      });
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") throw new ApiError("A conexão demorou demais. Tente novamente.", { code: "TIMEOUT" });
    throw new ApiError("Sem conexão com o servidor. Verifique sua internet.", { code: "NETWORK" });
  } finally {
    clearTimeout(timer);
  }
}
