import { useEffect, useMemo, useRef, useState } from "react";
import { adminService } from "../services/adminService.js";
import { CORES } from "../services/veiculoMapper.js";
import { VehiclePhoto } from "../components/vehicles/VehiclePhoto.jsx";
import { Skeleton } from "../components/ui/Skeleton.jsx";
import { CATEGORY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatBRL, formatKm, parseNum } from "../utils/format.js";

const STATUS = { available: "Disponível", reserved: "Reservado", sold: "Vendido", hidden: "Oculto" };
const STATUS_BANCO = { available: "disponivel", reserved: "reservado", sold: "vendido", hidden: "oculto" };
const ANO_MAX = new Date().getFullYear() + 1;
const VAZIO = { id: null, brand: "", model: "", version: "", year: "", mileageKm: "", priceBRL: "", category: "hatch", fuel: "flex", transmission: "manual", city: "", status: "available", cor: "", opcionais: "", description: "", fotoUrl: "", fotoCredito: "", fotoFonte: "" };

const paraForm = (v) => ({
  ...VAZIO, id: v.id, brand: v.brand, model: v.model, version: v.version, year: String(v.year), mileageKm: String(v.mileageKm), priceBRL: String(v.priceBRL),
  category: v.category, fuel: v.fuel, transmission: v.transmission, city: v.city, status: v.status, cor: v.color?.nome ?? "",
  opcionais: (v.opcionais ?? []).join(", "), description: v.description ?? "", fotoUrl: v.photo?.url ?? "", fotoCredito: v.photo?.credito ?? "", fotoFonte: v.photo?.fonte ?? "",
});

function validar(f) {
  const e = {};
  const ano = Number(f.year), km = parseNum(f.mileageKm), preco = parseNum(f.priceBRL);
  if (!f.brand.trim()) e.brand = "Informe a marca.";
  if (!f.model.trim()) e.model = "Informe o modelo.";
  if (!(Number.isInteger(ano) && ano >= 1980 && ano <= ANO_MAX)) e.year = `Ano entre 1980 e ${ANO_MAX}.`;
  if (!(Number.isInteger(km) && km >= 0)) e.mileageKm = "Quilometragem em número inteiro.";
  if (!(preco > 0)) e.priceBRL = "Informe o preço.";
  if (!f.city.trim()) e.city = "Informe a cidade.";
  if (f.fotoUrl && !/^https:\/\//.test(f.fotoUrl)) e.fotoUrl = "O endereço da foto deve começar com https://";
  if (f.fotoFonte && !/^https:\/\//.test(f.fotoFonte)) e.fotoFonte = "O link deve começar com https://";
  if (Object.keys(e).length) return { erros: e };
  return { veiculo: {
    id: f.id, brand: f.brand.trim(), model: f.model.trim(), version: f.version.trim(), year: ano, mileageKm: km, priceBRL: preco,
    category: f.category, fuel: f.fuel, transmission: f.transmission, city: f.city.trim(), status: f.status,
    color: f.cor ? { nome: f.cor } : null, opcionais: f.opcionais.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    description: f.description.trim(), photo: f.fotoUrl ? { url: f.fotoUrl.trim(), credito: f.fotoCredito.trim(), fonte: f.fotoFonte.trim() } : null,
  } };
}

/** Reduz a foto para no máximo 1600 px de largura em JPEG antes de enviar: carrega mais rápido no site. */
async function reduzirFoto(arquivo) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) return arquivo;
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1600 / bmp.width);
    if (escala === 1 && arquivo.size < 900_000) return arquivo;
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * escala), height: Math.round(bmp.height * escala) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : arquivo;
  } catch { return arquivo; }
}

function Login() {
  const [modo, setModo] = useState("entrar");
  const [email, setEmail] = useState(""), [senha, setSenha] = useState("");
  const [st, setSt] = useState({ status: "idle" });
  const enviar = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setSt({ status: "error", msg: "Informe um e-mail válido." });
    if (senha.length < 6) return setSt({ status: "error", msg: "A senha precisa ter pelo menos 6 caracteres." });
    setSt({ status: "loading" });
    try {
      if (modo === "entrar") { await adminService.entrar(email, senha); setSt({ status: "idle" }); }
      else {
        const r = await adminService.criarConta(email, senha);
        setSt({ status: "ok", msg: r.session ? "Conta criada." : "Conta criada. Abra o link que enviamos para o seu e-mail e depois entre aqui." });
      }
    } catch (err) { setSt({ status: "error", msg: err.message }); }
  };
  return (
    <section className="panel auth" aria-labelledby="auth-t">
      <h2 id="auth-t" className="h2 h2--flush">{modo === "entrar" ? "Entrar na área do lojista" : "Criar conta de lojista"}</h2>
      <form className="auth__form" onSubmit={enviar} noValidate>
        <div className="field"><label htmlFor="a-email">E-mail</label><input id="a-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="a-senha">Senha</label><input id="a-senha" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
        <p className={st.status === "ok" ? "form-ok" : "form-error"} role="alert">{st.msg ?? ""}</p>
        <button className="btn" disabled={st.status === "loading"}>{st.status === "loading" ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}</button>
      </form>
      <p className="muted small">{modo === "entrar" ? "Ainda não tem conta?" : "Já tem conta?"} <button type="button" className="link-btn" onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setSt({ status: "idle" }); }}>{modo === "entrar" ? "Criar conta" : "Entrar"}</button></p>
    </section>
  );
}

function SemPermissao({ sessao }) {
  const sql = `insert into public.administradores (user_id) values ('${sessao.user.id}');`;
  const [copiado, setCopiado] = useState(false);
  return (
    <section className="panel" aria-labelledby="sp-t">
      <h2 id="sp-t" className="h2 h2--flush">Sua conta ainda não é de administrador</h2>
      <p className="muted">Você entrou como <strong>{sessao.user.email}</strong>. Para liberar o cadastro de veículos, rode este comando no Supabase (SQL Editor do projeto) e recarregue esta página:</p>
      <pre className="raw">{sql}</pre>
      <button type="button" className="btn btn--ghost btn--small" onClick={async () => { try { await navigator.clipboard.writeText(sql); setCopiado(true); } catch { /* sem permissão de cópia */ } }}>{copiado ? "Copiado" : "Copiar comando"}</button>
    </section>
  );
}

const chaveRascunho = (id) => `autogiro:rascunho-veiculo:${id ?? "novo"}`;
const lerRascunho = (id) => { try { return JSON.parse(localStorage.getItem(chaveRascunho(id))); } catch { return null; } };
const gravarRascunho = (id, f) => { try { localStorage.setItem(chaveRascunho(id), JSON.stringify(f)); } catch { /* sem armazenamento */ } };
const apagarRascunho = (id) => { try { localStorage.removeItem(chaveRascunho(id)); } catch { /* sem armazenamento */ } };
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function Formulario({ inicial, onSalvo, onCancelar }) {
  // Começa pelo rascunho guardado, se houver: nada se perde ao recarregar ou fechar a aba.
  const [f, setF] = useState(() => ({ ...inicial, ...(lerRascunho(inicial.id) ?? {}) }));
  const [recuperado, setRecuperado] = useState(() => !!lerRascunho(inicial.id));
  const primeira = useRef(true);
  const alterado = !iguais(f, inicial);
  const [erros, setErros] = useState({});
  const [st, setSt] = useState({ status: "idle" });
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const topo = useRef(null);
  // Trocou o veículo em edição (ou voltou para "novo"): carrega o rascunho dele, se existir.
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    const r = lerRascunho(inicial.id);
    setF({ ...inicial, ...(r ?? {}) }); setRecuperado(!!r); setErros({}); setSt({ status: "idle" });
    topo.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [inicial]);
  // Guarda o rascunho meio segundo depois da última tecla.
  useEffect(() => {
    const t = setTimeout(() => (alterado ? gravarRascunho(inicial.id, f) : apagarRascunho(inicial.id)), 500);
    return () => clearTimeout(t);
  }, [f, alterado, inicial.id]);
  // Pergunta antes de fechar a aba ou recarregar com alterações não salvas.
  useEffect(() => {
    if (!alterado) return;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [alterado]);
  const descartar = () => { apagarRascunho(inicial.id); setF(inicial); setRecuperado(false); setErros({}); };
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const previa = { brand: f.brand || "Marca", model: f.model || "Modelo", version: f.version, category: f.category, color: f.cor ? { hex: CORES[f.cor] } : null, photo: f.fotoUrl ? { url: f.fotoUrl } : null };

  const foto = async (e) => {
    const arq = e.target.files?.[0];
    e.target.value = "";
    if (!arq) return;
    setEnviandoFoto(true); setSt({ status: "idle" });
    try {
      const url = await adminService.enviarFoto(await reduzirFoto(arq));
      setF((s) => ({ ...s, fotoUrl: url, fotoCredito: "Foto da loja", fotoFonte: "" }));
    } catch (err) { setSt({ status: "error", msg: err.message }); }
    finally { setEnviandoFoto(false); }
  };

  const salvar = async (e) => {
    e.preventDefault();
    const v = validar(f);
    setErros(v.erros ?? {});
    if (v.erros) { document.getElementById(`v-${Object.keys(v.erros)[0]}`)?.focus(); return; }
    setSt({ status: "loading" });
    try {
      const salvo = await adminService.salvar(v.veiculo);
      apagarRascunho(inicial.id); setRecuperado(false); setF(inicial); setSt({ status: "ok" });
      onSalvo(salvo, !f.id);
    }
    catch (err) { setSt({ status: "error", msg: err.message }); }
  };

  const campo = (k, label, props = {}) => (
    <div className="field">
      <label htmlFor={`v-${k}`}>{label}</label>
      <input id={`v-${k}`} value={f[k]} onChange={set(k)} aria-invalid={!!erros[k]} aria-describedby={erros[k] ? `v-${k}-e` : undefined} {...props} />
      {erros[k] && <span id={`v-${k}-e`} className="field__error">{erros[k]}</span>}
    </div>
  );
  const select = (k, label, opcoes) => (
    <div className="field"><label htmlFor={`v-${k}`}>{label}</label>
      <select id={`v-${k}`} value={f[k]} onChange={set(k)}>{Object.entries(opcoes).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );

  return (
    <form className="panel credit-form" onSubmit={salvar} noValidate ref={topo} aria-labelledby="vf-t">
      <div className="credit-form__head">
        <h2 id="vf-t" className="h2 h2--flush">{f.id ? `Editar ${inicial.brand} ${inicial.model}` : "Cadastrar veículo"}</h2>
        <div className="form-head-actions">
          {alterado && <span className="draft-tag" title="Fica guardado neste navegador até você salvar">Rascunho guardado</span>}
          {alterado && <button type="button" className="link-btn" onClick={descartar}>Descartar</button>}
          {f.id && <button type="button" className="btn btn--ghost btn--small" onClick={onCancelar}>Cancelar edição</button>}
        </div>
      </div>
      {recuperado && alterado && <p className="alert alert--ok draft-note" role="status">Recuperamos o que você estava preenchendo. Continue de onde parou ou toque em Descartar.</p>}
      <div className="admin-form">
        <div className="admin-form__photo">
          <div className="card__media"><VehiclePhoto vehicle={previa} /></div>
          <label className={`btn btn--ghost upload${enviandoFoto ? " is-busy" : ""}`}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={foto} disabled={enviandoFoto} className="sr-only" />
            {enviandoFoto ? "Enviando foto…" : f.fotoUrl ? "Trocar foto" : "Enviar foto"}
          </label>
          <p className="muted small">JPG, PNG ou WebP. A foto é reduzida antes de enviar.</p>
          <details className="sched">
            <summary>Usar foto de um link</summary>
            <div className="form-grid form-grid--one">
              {campo("fotoUrl", "Endereço da foto (https://)", { inputMode: "url" })}
              {campo("fotoCredito", "Crédito (ex.: autor, Wikimedia Commons)")}
              {campo("fotoFonte", "Página de origem (autor e licença)", { inputMode: "url" })}
            </div>
          </details>
        </div>
        <div className="form-grid">
          {campo("brand", "Marca", { autoComplete: "off" })}
          {campo("model", "Modelo", { autoComplete: "off" })}
          {campo("version", "Versão", { autoComplete: "off" })}
          {campo("year", "Ano", { inputMode: "numeric" })}
          {campo("mileageKm", "Quilometragem", { inputMode: "numeric" })}
          {campo("priceBRL", "Preço (R$)", { inputMode: "decimal" })}
          {select("category", "Categoria", CATEGORY_LABELS)}
          {select("fuel", "Combustível", FUEL_LABELS)}
          {select("transmission", "Câmbio", TRANSMISSION_LABELS)}
          {select("cor", "Cor", { "": "Não informar", ...Object.fromEntries(Object.keys(CORES).map((c) => [c, c])) })}
          {campo("city", "Cidade")}
          {select("status", "Situação", STATUS)}
          <div className="field field--full">{campo("opcionais", "Itens e opcionais (separe por vírgula)", { placeholder: "Ar-condicionado, Câmera de ré" })}</div>
          <div className="field field--full"><label htmlFor="v-description">Descrição</label><textarea id="v-description" rows={3} maxLength={2000} value={f.description} onChange={set("description")} /></div>
        </div>
      </div>
      <p className={st.status === "ok" ? "form-ok" : "form-error"} role="alert">{st.status === "error" ? st.msg : Object.keys(erros).length ? "Confira os campos destacados." : ""}</p>
      <div className="credit-form__actions">
        <button className="btn" disabled={st.status === "loading" || enviandoFoto}>{st.status === "loading" ? "Salvando…" : f.id ? "Salvar alterações" : "Cadastrar veículo"}</button>
        <p className="muted small">Vendido e Oculto somem da vitrine, mas continuam guardados.</p>
      </div>
    </form>
  );
}

function Lista({ itens, onEditar, onMudou, aviso }) {
  const [confirmar, setConfirmar] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const q = busca.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtrados = itens.filter((v) => !q || `${v.brand} ${v.model} ${v.version}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q));
  const status = async (v, s) => { setErro(""); try { await adminService.mudarStatus(v.id, STATUS_BANCO[s]); onMudou(); } catch (e) { setErro(e.message); } };
  const excluir = async (v) => { setErro(""); try { await adminService.excluir(v); setConfirmar(null); onMudou(); } catch (e) { setErro(e.message); setConfirmar(null); } };
  return (
    <section className="panel" aria-labelledby="lst-t">
      <div className="credit-form__head">
        <h2 id="lst-t" className="h2 h2--flush">Estoque ({itens.length})</h2>
        <div className="field admin-search"><label htmlFor="adm-q" className="sr-only">Buscar no estoque</label><input id="adm-q" type="search" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
      </div>
      <p className="form-ok" role="status">{aviso}</p>
      <p className="form-error" role="alert">{erro}</p>
      <ul className="admin-list">
        {filtrados.map((v) => (
          <li key={v.id} className="admin-item">
            <div className="admin-item__img"><VehiclePhoto vehicle={v} /></div>
            <div className="admin-item__info">
              <strong>{v.brand} {v.model}</strong> <span className="muted">{v.version}</span>
              <p className="muted small">{v.year}, {formatKm(v.mileageKm)}, {v.city}</p>
              <p className="admin-item__price">{formatBRL(v.priceBRL)}</p>
            </div>
            <div className="admin-item__actions">
              <label className="sr-only" htmlFor={`st-${v.id}`}>Situação de {v.brand} {v.model}</label>
              <select id={`st-${v.id}`} value={v.status} onChange={(e) => status(v, e.target.value)}>{Object.entries(STATUS).map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => onEditar(v)}>Editar</button>
              {confirmar === v.id
                ? <><button type="button" className="btn btn--small btn--danger" onClick={() => excluir(v)}>Confirmar exclusão</button><button type="button" className="link-btn" onClick={() => setConfirmar(null)}>Cancelar</button></>
                : <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmar(v.id)}>Excluir</button>}
            </div>
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && <p className="muted">Nenhum veículo {busca ? "com essa busca" : "cadastrado ainda"}.</p>}
    </section>
  );
}

export default function AdminPage() {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando
  const [admin, setAdmin] = useState(null);
  const [itens, setItens] = useState(null);
  const [editando, setEditando] = useState(VAZIO);
  const [aviso, setAviso] = useState("");
  const [falha, setFalha] = useState("");
  const inicial = useMemo(() => (editando.id ? paraForm(editando) : VAZIO), [editando]);

  useEffect(() => {
    let sub;
    // O Supabase renova o token sozinho (por exemplo, quando você volta para a aba). Para a tela,
    // só importa se a PESSOA mudou: com o mesmo usuário, mantemos o objeto antigo e nada é recriado.
    const atualizar = (s) => setSessao((atual) => (s && atual && atual.user.id === s.user.id ? atual : s ?? null));
    adminService.sessao().then(atualizar, (e) => { setFalha(e.message); setSessao(null); });
    adminService.aoMudarSessao(atualizar).then((s) => { sub = s; }, () => {});
    return () => sub?.unsubscribe();
  }, []);
  const userId = sessao?.user?.id;
  useEffect(() => {
    setAdmin(null);
    if (userId) adminService.ehAdmin(userId).then(setAdmin, (e) => { setFalha(e.message); setAdmin(false); });
  }, [userId]);
  const carregar = () => adminService.listar().then(setItens, (e) => setFalha(e.message));
  useEffect(() => { if (admin) carregar(); }, [admin]);

  return (
    <main className="container">
      <section className="intro">
        <h1>Área do lojista</h1>
        <p>Cadastre, edite e tire veículos da vitrine. As mudanças aparecem no site em até 1 minuto.</p>
        {sessao && <p className="session">Conectado como <strong>{sessao.user.email}</strong> <button type="button" className="link-btn" onClick={() => adminService.sair()}>Sair</button></p>}
      </section>
      {falha && <p className="alert alert--bad" role="alert">{falha}</p>}
      {sessao === undefined && <div className="panel"><Skeleton style={{ height: 120, width: "100%" }} /></div>}
      {sessao === null && <Login />}
      {sessao && admin === null && <div className="panel"><Skeleton style={{ height: 80, width: "100%" }} /></div>}
      {sessao && admin === false && <SemPermissao sessao={sessao} />}
      {admin && (
        <>
          <Formulario
            inicial={inicial}
            onCancelar={() => setEditando(VAZIO)}
            onSalvo={(v, novo) => { setAviso(novo ? `${v.brand} ${v.model} cadastrado.` : `${v.brand} ${v.model} atualizado.`); setEditando(VAZIO); carregar(); }}
          />
          {itens === null ? <div className="panel"><Skeleton style={{ height: 200, width: "100%" }} /></div>
            : <Lista itens={itens} aviso={aviso} onEditar={setEditando} onMudou={() => { setAviso(""); carregar(); }} />}
        </>
      )}
    </main>
  );
}
