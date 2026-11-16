# Esteira de crédito para veículos (AutoGiro + CredCasa)

Proposta de contrato para usar a esteira do CredCasa (`POST /api/esteira/iniciar`) no financiamento de **veículos**.
Os JSONs desta pasta não foram escritos à mão: saíram de uma execução real da esteira do CredCasa, com a alteração do arquivo `credcasa-veiculos.patch` e os serviços de apoio descritos no fim.

| Arquivo | O que é |
|---|---|
| [`1-iniciar-requisicao.json`](1-iniciar-requisicao.json) | O que o AutoGiro envia para iniciar a análise |
| [`2-resposta-aprovado.json`](2-resposta-aprovado.json) | Resposta completa, aprovado (HTTP 200, `FINALIZADO`) |
| [`3-resposta-analise-manual.json`](3-resposta-analise-manual.json) | Resposta quando a Decisão pede análise manual (HTTP 202) |
| [`4-resposta-reprovado.json`](4-resposta-reprovado.json) | Resposta reprovada (HTTP 200, `REPROVADO`) |
| [`5-resposta-erro-400.json`](5-resposta-erro-400.json) | Dados inválidos (HTTP 400) |
| [`credcasa-veiculos.patch`](credcasa-veiculos.patch) | Alteração sugerida no `backend/server.js` do CredCasa |

## O que muda em relação ao imóvel

Só três coisas. O fluxo de imóvel continua igual e foi testado depois da alteração.

1. **`veiculo` no lugar de `imovel`.** A esteira aceita um dos dois. Com `veiculo`, também exige `marca`, `modelo` e `ano`.
2. **`modalidade: "VEICULOS"` para o Score.** Hoje a esteira manda sempre `OUTROS_BENS`. Com `veiculo`, manda `VEICULOS`, que é a modalidade que o Score aceita e o serviço de juros usa (prazo de 12 a 60 meses, taxa pela faixa do score).
3. **`amortizacao` para o Score.** A esteira passa a enviar `PRICE` ou `SAC`, tirado do produto escolhido. O Score já aceita esse campo e o repassa à Decisão e ao Juros. Sem ele, o Juros não sabe qual sistema calcular.

Também entram dois produtos no serviço de Produtos: `VEICULO-PRICE` e `VEICULO-SAC`.

## Requisição: `POST /api/esteira/iniciar`

```json
{
  "cliente": {
    "nome": "Cliente Teste",
    "tipoPessoa": "PF",
    "cpf": "52998224725",
    "rendaMensal": 8500,
    "dividaTotal": 1200,
    "idade": 34,
    "estadoCivil": "CASADO",
    "numeroDependentes": 1,
    "diasAtrasoUltimos12Meses": 0,
    "limiteRotativoUtilizado": 1500,
    "limiteRotativoTotal": 6000,
    "mesesNoEmpregoAtual": 36,
    "mesesRelacionamentoBanco": 48
  },
  "veiculo": {
    "id": "e4b8c1d2-0000-4000-8000-000000000003",
    "marca": "Toyota",
    "modelo": "Corolla",
    "versao": "2.0 XEi",
    "ano": 2020,
    "valor": 109900,
    "entrada": 21980
  },
  "produtoId": "VEICULO-PRICE",
  "prazoMeses": 48,
  "dataLiberacao": "2026-11-16",
  "primeiroRelacionamento": false
}
```

| Campo | Tipo | Regra |
|---|---|---|
| `cliente.*` | | Igual ao contrato atual do CredCasa (os mesmos campos do `perfilPF` do Score). CPF com 11 dígitos, sem pontuação |
| `veiculo.id` | texto | Opcional. Id do veículo no banco do AutoGiro, para ligar a proposta ao anúncio |
| `veiculo.marca`, `veiculo.modelo` | texto | Obrigatórios |
| `veiculo.versao` | texto | Opcional |
| `veiculo.ano` | inteiro | A partir de 1980 |
| `veiculo.valor` | número | Maior que zero, em reais |
| `veiculo.entrada` | número | Zero ou mais, menor que `valor` |
| `produtoId` | texto | `VEICULO-PRICE` ou `VEICULO-SAC` |
| `prazoMeses` | inteiro | De 12 a 60 (limite da modalidade `VEICULOS` no serviço de juros) |
| `dataLiberacao` | data | `AAAA-MM-DD`. Opcional, padrão hoje |
| `primeiroRelacionamento` | booleano | Opcional |

## O que a esteira manda para o Score

Gerado pela própria esteira (campo `pedido.scoreSolicitacao` da resposta):

```json
{
  "tipoPessoa": "PF",
  "identificador": "FIN-1794847717769-84B9AE",
  "valor": 87920,
  "modalidade": "VEICULOS",
  "prazoMeses": 48,
  "amortizacao": "PRICE",
  "dataLiberacao": "2026-11-16",
  "primeiroRelacionamento": false,
  "perfilPF": { "cpf": "52998224725", "rendaMensal": 8500, "...": "demais campos do cliente" }
}
```

`valor` é o valor financiado: `veiculo.valor - veiculo.entrada`.

## Resposta aprovada (resumo)

A resposta completa está em `2-resposta-aprovado.json`. Os pontos que o AutoGiro usa:

| Caminho | Exemplo | Uso no AutoGiro |
|---|---|---|
| `idFinanciamento` | `FIN-1794847717769-84B9AE` | Guardar na proposta, para consultar depois (`GET /api/esteira/:id`) |
| `status` | `FINALIZADO`, `PENDENTE_ANALISE_MANUAL`, `REPROVADO` | Situação da proposta |
| `pedido.score.scoreFinal` | `872` | Exibido na análise |
| `pedido.score.faixaRisco` | `EXCELENTE` | Classificação do Score (não é a faixa de juros) |
| `pedido.score.componentes` | lista | O que pesou no score |
| `pedido.decisao.status` | `APROVADO` | Resultado |
| `pedido.integracaoJuros.faixaRisco` | `A` | Faixa de juros (A a D) |
| `pedido.integracaoJuros.taxaMensalPercentual` | `1.5` | Taxa ao mês |
| `pedido.integracaoJuros.parcelas.primeira` | `2582.65` | Parcela (PRICE: todas iguais) |
| `pedido.operacao.protocolo` | `OP-1794847717915` | Número da operação |

A parcela de R$ 2.582,65 é a mesma que o simulador do AutoGiro mostra para esse carro e esse perfil.

## Cenários testados

| Cenário | HTTP | `status` | Score | Decisão |
|---|---|---|---|---|
| Cliente sem atrasos e com pouca dívida | 200 | `FINALIZADO` | 872 | `APROVADO` |
| 20 dias de atraso, mais uso do limite | 202 | `PENDENTE_ANALISE_MANUAL` | 560 | `ANALISE_MANUAL` |
| 75 dias de atraso, limite quase todo usado | 200 | `REPROVADO` | 252 | `REPROVADO` |
| CPF com pontos, sem marca, prazo de 72 meses | 400 | | | `detalhes` lista os 3 erros |
| Imóvel, como antes da alteração | 200 | `FINALIZADO` | 872 | `APROVADO` |

## Como os testes foram feitos

- **CredCasa:** o `backend/server.js` do repositório, com o `credcasa-veiculos.patch` aplicado (o patch aplica sem conflito na versão atual).
- **Score:** as regras do Score Engine v1.1.0 (`viniciusgm25/Score-Engine`), comparadas com o código Java em 5.000 casos, sem diferença.
- **Decisão:** o mock de Decisão do próprio CredCasa (700 ou mais aprova, 550 a 699 vai para análise manual). O contrato da Decisão real ainda não chegou.
- **Juros:** taxa pela faixa da modalidade `VEICULOS` do serviço de juros (A 1,50%, B 2,00%, C 2,50%, D 3,00% ao mês) e parcelas PRICE ou SAC em centavos.
- **Operações:** o mock de Operações do próprio CredCasa.

Quando a Decisão real e o Juros real entrarem, os campos de `pedido.decisao` e `pedido.integracaoJuros` podem mudar de nome. O resto do contrato não depende deles.
