import { env } from "../config/env.js";
import { http, ApiError } from "./api/httpClient.js";

/**
 * Integração com o Score Engine (repositório viniciusgm25/Score-Engine, Java/Spring, porta 8080).
 * Rota: POST /api/v1/score/evaluate. Depois de calcular, o próprio Score envia o resultado
 * para a Decisão (POST :8081/api/v1/decisao). Erros chegam como { status, error, message }.
 */
export const ENDPOINT_SCORE = "/api/v1/score/evaluate";

/** Monta o corpo que o Score espera, a partir do formulário do site. */
export function montarRequisicao(f) {
  return {
    tipoPessoa: "PF",
    forcarRecalculo: !!f.forcarRecalculo,
    perfilPF: {
      cpf: f.cpf,
      rendaMensal: f.rendaMensal,
      dividaTotal: f.dividaTotal,
      idade: f.idade,
      estadoCivil: f.estadoCivil,
      numeroDependentes: f.numeroDependentes,
      diasAtrasoUltimos12Meses: f.diasAtraso,
      limiteRotativoUtilizado: f.limiteUtilizado,
      limiteRotativoTotal: f.limiteTotal,
      mesesNoEmpregoAtual: f.mesesEmprego,
      mesesRelacionamentoBanco: f.mesesBanco,
    },
    // Dados da solicitação: o Score não usa no cálculo, só repassa para a Decisão e o Juros.
    identificador: f.identificador,
    valor: f.valorFinanciado,
    modalidade: "VEICULOS",
    prazoMeses: f.prazoMeses,
    dataLiberacao: f.dataLiberacao,
    primeiroRelacionamento: f.mesesBanco === 0,
    amortizacao: f.amortizacao,
  };
}

// ---- Cálculo local com as mesmas regras do Score Engine v1.1.0 (PFScoreCalculatorStrategy) ----
// As regras são do grupo do Score (viniciusgm25/Score-Engine). Esta é só uma reprodução para o modo demonstração.
// Usado no modo demonstração (site publicado), quando o Score não está acessível.
const comp = (nome, pontuacao, pesoPonderado, motivo) => ({ nome, pontuacao, pontuacaoMaxima: 1000, pesoPonderado, motivo });

function historico(dias) {
  if (dias > 60) return comp("Histórico de Pagamento", 150, 0.35, "Inadimplência severa registrada no histórico recente (>60 dias).");
  if (dias > 15) return comp("Histórico de Pagamento", 400, 0.35, "Atrasos operacionais recorrentes identificados nos últimos 12 meses.");
  if (dias > 0) return comp("Histórico de Pagamento", 650, 0.35, "Ocorrência de apontamentos de pequeno porte sem reincidência severa.");
  return comp("Histórico de Pagamento", 850, 0.35, "Pontualidade integral na liquidação dos compromissos financeiros.");
}
function capacidade(renda, divida, dependentes) {
  const nome = "Capacidade Financeira";
  if (renda - Math.max(0, dependentes) * 600 <= 0) return comp(nome, 200, 0.3, "Renda líquida familiar exaurida pela estrutura de subsistência de dependentes.");
  const c = renda > 0 ? Math.round((divida / renda) * 10000) / 10000 : 1;
  if (c <= 0.2) return comp(nome, 900, 0.3, "Excelente capacidade de pagamento com margem de renda livre superior a 80%.");
  if (c <= 0.5) return comp(nome, 650, 0.3, "Comprometimento financeiro compatível com a estabilidade de renda declarada.");
  return comp(nome, 300, 0.3, "Comprometimento crítico da renda com passivos pré-existentes (>50%).");
}
function endividamento(usado, total) {
  const nome = "Endividamento e Limites";
  if (!(total > 0)) return comp(nome, 500, 0.2, "Inexistência de linhas ativas de crédito rotativo concedidas.");
  const t = Math.round((usado / total) * 10000) / 10000;
  if (t <= 0.3) return comp(nome, 850, 0.2, "Gestão prudencial de linhas emergenciais, com uso inferior a 30% do teto.");
  if (t <= 0.7) return comp(nome, 600, 0.2, "Utilização regular das linhas concedidas de cartão e cheque especial.");
  return comp(nome, 250, 0.2, "Exposição elevada em instrumentos rotativos de alta taxa de juros.");
}
function estabilidade(emprego, banco) {
  const p = emprego >= 24 && banco >= 24 ? 900 : emprego >= 12 || banco >= 12 ? 700 : 400;
  return comp("Estabilidade e Relacionamento", p, 0.15, `Vínculo empregatício (${emprego} meses) e relacionamento bancário (${banco} meses).`);
}
// Arredondamento "do banqueiro" (HALF_EVEN), igual ao BigDecimal do Java.
const halfEven = (x) => { const f = Math.floor(x), d = x - f; return d > 0.5 + 1e-9 ? f + 1 : d < 0.5 - 1e-9 ? f : f % 2 === 0 ? f : f + 1; };
export const faixaDoScore = (s) => (s >= 701 ? "EXCELENTE" : s >= 501 ? "BOM" : s >= 301 ? "REGULAR" : "CRITICO");
const pd = (s) => Math.max(0.001, Math.round(((1000 - s) / 10000) * 10000) / 10000);

export function calcularScorePF(p) {
  const componentes = [
    historico(p.diasAtrasoUltimos12Meses),
    capacidade(p.rendaMensal, p.dividaTotal, p.numeroDependentes),
    endividamento(p.limiteRotativoUtilizado, p.limiteRotativoTotal),
    estabilidade(p.mesesNoEmpregoAtual, p.mesesRelacionamentoBanco),
  ];
  const bruto = componentes.reduce((s, c) => s + c.pontuacao * c.pesoPonderado, 0);
  const scoreFinal = Math.min(1000, Math.max(0, halfEven(Math.round(bruto * 100) / 100)));
  return { scoreFinal, componentes };
}

async function avaliarMock(req) {
  await new Promise((r) => setTimeout(r, 900));
  const { scoreFinal, componentes } = calcularScorePF(req.perfilPF);
  const { perfilPF, tipoPessoa, forcarRecalculo, ...solicitacao } = req;
  return {
    clienteId: perfilPF.cpf, tipoPessoa, scoreFinal, faixaRisco: faixaDoScore(scoreFinal), probabilidadeDefault: pd(scoreFinal),
    modelo: { codigo: "SCORE_PF", versao: "v1.1.0" }, calculatedAt: new Date().toISOString(), origem: "CALCULO",
    componentes, fatoresImpacto: componentes.map((c) => c.motivo), ...solicitacao,
  };
}

export const scoreService = {
  modoDemonstracao: env.MOCK_SCORE,
  /** Avalia o score. O corpo vem de montarRequisicao. */
  async avaliar(req, signal) {
    if (env.MOCK_SCORE) return avaliarMock(req);
    try {
      return await http(ENDPOINT_SCORE, { method: "POST", body: req, baseUrl: env.SCORE_URL, timeoutMs: 20000, signal });
    } catch (err) {
      // O Score devolve 500 quando calcula mas não consegue entregar à Decisão.
      if (err instanceof ApiError && err.status === 500 && /8081|decis|refused|I\/O error/i.test(err.message)) {
        throw new ApiError("O Score calculou, mas não conseguiu enviar o resultado para a Decisão (porta 8081). Suba a Decisão ou use DECISION_ENABLED=false no .env do Score.", { status: 502, code: "DECISAO_INDISPONIVEL" });
      }
      if (err instanceof ApiError && err.code === "NETWORK") {
        throw new ApiError(`Não consegui falar com o Score em ${env.SCORE_URL}. Ele está rodando? (mvn spring-boot:run)`, { code: "NETWORK" });
      }
      throw err;
    }
  },
};

/** Liga o score (0 a 1000) à faixa de juros do serviço de juros (A a E). */
export const faixaJuros = (politica, score) => politica?.faixas.find((f) => score >= f.scoreMin && score <= f.scoreMax) ?? null;

export const ROTULO_FAIXA_SCORE = { EXCELENTE: "Excelente", BOM: "Bom", REGULAR: "Regular", CRITICO: "Crítico" };
