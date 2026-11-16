// Gera a documentação da API a partir do contrato (docs/autogiro-api.openapi.yaml):
//  1) tabelas de rotas e campos dentro do README.md (entre os marcadores API:INICIO e API:FIM);
//  2) a página Swagger do site em public/contrato/ (publicada junto com o site).
// Roda sozinho antes de cada build (npm run build) e também com: npm run docs:api
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const raiz = join(dirname(new URL(import.meta.url).pathname), "..");
const ARQ = join(raiz, "docs", "autogiro-api.openapi.yaml");
const fonte = readFileSync(ARQ, "utf8");
const api = yaml.load(fonte);

// ---------- 1) Página Swagger no site ----------
const destino = join(raiz, "public", "contrato");
mkdirSync(destino, { recursive: true });
const swagger = dirname(createRequire(import.meta.url).resolve("swagger-ui-dist/package.json"));
for (const f of ["swagger-ui.css", "swagger-ui-bundle.js"]) copyFileSync(join(swagger, f), join(destino, f));
copyFileSync(ARQ, join(destino, "autogiro-api.openapi.yaml"));
writeFileSync(join(destino, "index.html"), `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato da API | AutoGiro</title>
  <link rel="stylesheet" href="./swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; font-family: system-ui, sans-serif; }
    .topo { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; padding: 12px 20px; background: #15121f; color: #f5f3ff; }
    .topo a { color: #c4b5fd; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div class="topo"><strong>AutoGiro: contrato da API ${api.info.version}</strong>
    <span><a href="./autogiro-api.openapi.yaml" download>Baixar o YAML</a> · <a href="../">Voltar ao site</a></span></div>
  <div id="swagger"></div>
  <script src="./swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: "./autogiro-api.openapi.yaml", dom_id: "#swagger", deepLinking: true, docExpansion: "list", defaultModelsExpandDepth: 0, tryItOutEnabled: false });
  </script>
</body>
</html>
`);

// ---------- 2) Tabelas no README ----------
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
const nomeRef = (r) => r?.split("/").pop();
const tipo = (s) => {
  if (!s) return "";
  if (s.$ref) return `\`${nomeRef(s.$ref)}\``;
  if (s.type === "array") return `lista de ${tipo(s.items)}`;
  if (s.enum) return s.enum.map((e) => `\`${e}\``).join(", ");
  return `${s.type ?? "objeto"}${s.format ? ` (${s.format})` : ""}`;
};
const corpo = (op) => {
  const s = op.requestBody?.content?.["application/json"]?.schema;
  return s ? tipo(s) : "";
};
const sucesso = (op) => {
  const [cod, r] = Object.entries(op.responses ?? {}).find(([c]) => c.startsWith("2")) ?? [];
  const s = r?.content?.["application/json"]?.schema;
  return cod ? `${cod}${s ? ` ${tipo(s)}` : ""}` : "";
};

const porTag = new Map();
for (const [caminho, item] of Object.entries(api.paths)) {
  for (const metodo of ["get", "post", "put", "patch", "delete"]) {
    const op = item[metodo];
    if (!op) continue;
    const tag = op.tags?.[0] ?? "Outros";
    if (!porTag.has(tag)) porTag.set(tag, []);
    const publico = Array.isArray(op.security) && op.security.length === 0;
    porTag.get(tag).push(`| \`${metodo.toUpperCase()}\` | \`${caminho}\` | ${esc(op.summary)}${op["x-pendente"] ? " *(pendente)*" : ""} | ${corpo(op)} | ${sucesso(op)} | ${publico ? "Pública" : "Login"} |`);
  }
}

let md = `> Gerado a partir de [\`docs/autogiro-api.openapi.yaml\`](docs/autogiro-api.openapi.yaml) pelo comando \`npm run docs:api\`. Não edite este trecho à mão: edite o YAML.\n\n`;
md += `**${api.info.title} ${api.info.version}** · Base: ${(api.servers ?? []).map((s) => `\`${s.url}\``).join(" ou ")}\n\n`;
for (const [tag, linhas] of porTag) {
  const desc = api.tags?.find((t) => t.name === tag)?.description;
  md += `#### ${tag}${desc ? `\n${esc(desc)}` : ""}\n\n| Método | Caminho | O que faz | Envia | Recebe | Acesso |\n|---|---|---|---|---|---|\n${linhas.join("\n")}\n\n`;
}
md += `<details>\n<summary><strong>Campos de cada objeto (${Object.keys(api.components.schemas).length} schemas)</strong></summary>\n\n`;
for (const [nome, s] of Object.entries(api.components.schemas)) {
  md += `##### \`${nome}\`${s["x-pendente"] ? " *(pendente)*" : ""}\n`;
  if (s.description) md += `${esc(s.description)}\n`;
  if (s.enum) { md += `\nValores: ${s.enum.map((e) => `\`${e}\``).join(", ")}\n\n`; continue; }
  const props = s.properties ?? Object.assign({}, ...(s.allOf ?? []).map((p) => p.properties ?? {}));
  if (!Object.keys(props).length) { md += "\n"; continue; }
  const obrig = new Set(s.required ?? []);
  md += `\n| Campo | Tipo | Obrigatório | Descrição |\n|---|---|---|---|\n`;
  for (const [c, p] of Object.entries(props)) {
    const ex = p.example !== undefined && typeof p.example !== "object" ? ` Ex.: \`${p.example}\`` : "";
    md += `| \`${c}\` | ${tipo(p)} | ${obrig.has(c) ? "sim" : ""} | ${esc(p.description)}${ex} |\n`;
  }
  md += "\n";
}
md += `</details>\n`;

const README = join(raiz, "README.md");
const atual = readFileSync(README, "utf8");
const ini = "<!-- API:INICIO -->", fim = "<!-- API:FIM -->";
if (!atual.includes(ini) || !atual.includes(fim)) throw new Error("README.md sem os marcadores <!-- API:INICIO --> e <!-- API:FIM -->");
const novo = atual.replace(new RegExp(`${ini}[\\s\\S]*?${fim}`), `${ini}\n${md}${fim}`);
if (novo !== atual) writeFileSync(README, novo);
console.log(`Documentação gerada: ${[...porTag.values()].flat().length} rotas, ${Object.keys(api.components.schemas).length} schemas.`);
