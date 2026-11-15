// crypto.randomUUID só existe em contexto seguro (https/localhost); este fallback cobre acesso por IP.
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
