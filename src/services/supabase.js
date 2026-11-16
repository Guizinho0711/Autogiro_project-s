import { env } from "../config/env.js";

// Carregado só quando precisa (catálogo real ou área do lojista): a página inicial fica leve.
let cliente = null;
export async function supabase() {
  if (!cliente) {
    const { createClient } = await import("@supabase/supabase-js");
    cliente = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, { auth: { persistSession: true, storageKey: "autogiro-auth" } });
  }
  return cliente;
}
