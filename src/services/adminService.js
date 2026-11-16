import { supabase } from "./supabase.js";
import { fromRow, toRow } from "./veiculoMapper.js";
import { limparCacheVeiculos } from "./vehicleService.js";
import { uid } from "../utils/id.js";

// Mensagens do Supabase em português, para quem está usando a área do lojista.
const TRADUZ = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme o seu e-mail pelo link que enviamos e tente de novo."],
  [/user already registered/i, "Já existe uma conta com esse e-mail. Use Entrar."],
  [/password should be at least/i, "A senha precisa ter pelo menos 6 caracteres."],
  [/row-level security|permission denied|violates row-level/i, "Sua conta não tem permissão de administrador."],
  [/payload too large|exceeded the maximum allowed size/i, "A foto passa de 5 MB. Escolha uma menor."],
  [/mime type|invalid_mime/i, "Formato de foto não aceito. Use JPG, PNG ou WebP."],
  [/foreign key/i, "Este veículo tem simulações ou propostas ligadas. Marque como vendido ou oculto em vez de excluir."],
  [/check constraint/i, "Algum valor está fora do permitido. Confira ano, preço e textos."],
  [/failed to fetch|network/i, "Sem conexão com o banco de dados. Verifique a internet."],
];
const erro = (e) => new Error(TRADUZ.find(([re]) => re.test(e?.message ?? ""))?.[1] ?? e?.message ?? "Não foi possível concluir.");
const ok = ({ data, error }) => { if (error) throw erro(error); return data; };

export const adminService = {
  async sessao() {
    const sb = await supabase();
    return ok(await sb.auth.getSession()).session;
  },
  async aoMudarSessao(fn) {
    const sb = await supabase();
    return sb.auth.onAuthStateChange((_e, s) => fn(s)).data.subscription;
  },
  async entrar(email, senha) {
    const sb = await supabase();
    return ok(await sb.auth.signInWithPassword({ email, password: senha }));
  },
  async criarConta(email, senha) {
    const sb = await supabase();
    return ok(await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: `${window.location.origin}/#/admin` } }));
  },
  async sair() {
    const sb = await supabase();
    await sb.auth.signOut();
  },
  /** A regra do banco só deixa cada pessoa ver a própria linha em administradores. */
  async ehAdmin(userId) {
    const sb = await supabase();
    const data = ok(await sb.from("administradores").select("user_id").eq("user_id", userId).maybeSingle());
    return !!data;
  },
  async listar() {
    const sb = await supabase();
    return ok(await sb.from("veiculos").select("*").order("created_at", { ascending: false })).map(fromRow);
  },
  async salvar(v) {
    const sb = await supabase();
    const row = toRow(v);
    const data = v.id
      ? ok(await sb.from("veiculos").update(row).eq("id", v.id).select().single())
      : ok(await sb.from("veiculos").insert(row).select().single());
    limparCacheVeiculos();
    return fromRow(data);
  },
  async mudarStatus(id, statusBanco) {
    const sb = await supabase();
    ok(await sb.from("veiculos").update({ status: statusBanco }).eq("id", id));
    limparCacheVeiculos();
  },
  async excluir(v) {
    const sb = await supabase();
    ok(await sb.from("veiculos").delete().eq("id", v.id));
    const caminho = caminhoNoBucket(v.photo?.url);
    if (caminho) await sb.storage.from("veiculos").remove([caminho]); // apaga a foto enviada junto
    limparCacheVeiculos();
  },
  /** Envia a foto para o Storage (bucket "veiculos") e devolve o endereço público. */
  async enviarFoto(arquivo) {
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("Formato de foto não aceito. Use JPG, PNG ou WebP.");
    if (arquivo.size > 5 * 1024 * 1024) throw new Error("A foto passa de 5 MB. Escolha uma menor.");
    const sb = await supabase();
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[arquivo.type];
    const caminho = `${new Date().getFullYear()}/${uid()}.${ext}`;
    ok(await sb.storage.from("veiculos").upload(caminho, arquivo, { contentType: arquivo.type, cacheControl: "31536000", upsert: false }));
    return sb.storage.from("veiculos").getPublicUrl(caminho).data.publicUrl;
  },
};

function caminhoNoBucket(url) {
  const m = url?.match(/\/storage\/v1\/object\/public\/veiculos\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
