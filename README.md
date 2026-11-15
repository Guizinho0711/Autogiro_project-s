# AutoGiro Project's

# financial-operations-service: referência da API

Gerada a partir do `api/openapi.yaml` do repositório. Base local: `http://localhost:8083`. Documentação interativa: `/swagger`.

## Convenções

- **Dinheiro**: sempre número decimal exato (ex.: `936.91`), nunca texto.
- **Taxas**: entram em percentual (`1.85`) e **saem em fração** (`0.0185`).
- **Datas**: `YYYY-MM-DD`; data/hora sem fuso é interpretada como GMT-03:00 e as respostas saem em UTC.
- **Erros**: corpo `{ "erro": "mensagem" }` com status 400 (validação) ou 404 (não encontrado).
- **Sem autenticação**: CORS liberado por padrão. Não exponha à internet sem proteção.
- **Identificador da operação**: aceita `numeroOperacao` (ex.: `OP-2026-0001`) ou o `id` interno.
- **`dataReferencia`**: data (`YYYY-MM-DD`) usada para calcular atraso e encargos nas consultas.

## Índice

- `GET /health`: Verifica se o serviço está no ar
- `POST /operacoes`: Registra uma operação definida no serviço de juros
- `GET /operacoes`: Lista as operações
- `GET /operacoes/{identificador}`: Consulta a situação de uma operação
- `GET /operacoes/{identificador}/parcelas`: Consulta o cronograma de parcelas
- `GET /operacoes/{identificador}/amortizacoes/simulacao`: Simula a antecipação de parcelas
- `POST /operacoes/{identificador}/amortizacoes`: Registra a antecipação de parcelas
- `POST /operacoes/{identificador}/parcelas/{numero}/pagamentos`: Registra o pagamento de uma parcela
- `GET /operacoes/{identificador}/liquidacao`: Consulta o valor para quitar a operação
- `POST /operacoes/{identificador}/liquidacao`: Quita a operação antes do prazo
- `GET /operacoes/{identificador}/resumo`: Consulta o resumo financeiro da operação
- `GET /operacoes/{identificador}/historico`: Consulta o histórico de eventos da operação


---

## `GET /health`

**Verifica se o serviço está no ar**

**Resposta 200**: Serviço no ar.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `status` | string | sim | Ex.: `ok`. |


---

## `POST /operacoes`

**Registra uma operação definida no serviço de juros**

Payload enviado pelo serviço de juros, com a simulação que o cliente escolheu. A operação e todas as parcelas são gravadas na mesma transação.

O `operacao.identificador` é obrigatório: sem ele a resposta é `400`, e este serviço não gera número próprio.

**Idempotente pelo `operacao.identificador`:** se ele já existir, nada é gravado e a resposta é `200` com a confirmação da operação já registrada.

A resposta só confirma o registro; o juros já tem os dados que enviou. Para consultar a operação completa e o cronograma, use os `GET`. Campos enviados pelo juros que não são usados aqui (`operacao.id`, `operacao.criadoEm`, `condicoes.primeiroRelacionamento`, `demonstrativo`, `calendario[].diasCorridos`) são aceitos e ignorados.

**Corpo da requisição**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `operacao` | object | sim |  |
| `operacao.identificador` | string | sim | Identificador da operação em toda a esteira. Vira o `numeroOperacao`. Repetido = reenvio (`200`). Ex.: `OP-2026-0001`. |
| `operacao.estado` | enum | sim | Só operações definidas com o cliente são registradas. Aceito também em minúsculas. Valores: `DEFINIDA`. |
| `operacao.definidoEm` | string | sim | `YYYY-MM-DD HH:MM:SS`, interpretado como GMT-03:00, ou ISO-8601 com fuso (`2026-10-08T15:12:40-03:00`). Ex.: `2026-10-08 15:12:40`. |
| `cliente` | object | sim |  |
| `cliente.tipoPessoa` | enum | sim | Aceito também em minúsculas. Valores: `PF`, `PJ`. |
| `cliente.documento` | string | sim | CPF (11 dígitos, PF) ou CNPJ (14 dígitos, PJ), só números. Vira o `clienteId`. Ex.: `52998224725`. |
| `produto` | object | sim |  |
| `produto.codigo` | string | sim | Ex.: `CONSIGNADO_INSS`. |
| `produto.nome` | string | sim | Ex.: `Crédito pessoal consignado INSS`. |
| `produto.modalidadeBcb` | string | sim | Ex.: `Crédito pessoal consignado INSS - Prefixado`. |
| `condicoes` | object | sim |  |
| `condicoes.valor` | object | sim | Valor do crédito, maior que zero. Vira o `valorAprovado` e o `saldoDevedor` inicial. Ex.: `10000`. |
| `condicoes.prazoMeses` | integer | sim | Deve ser igual à quantidade de parcelas do `calendario`. Ex.: `12`. |
| `condicoes.dataLiberacao` | string:date | sim | O primeiro vencimento deve ser posterior a ela. Ex.: `2026-10-30`. |
| `taxa` | object | sim |  |
| `taxa.faixaRisco` | string | sim | Faixa de preço do juros (não é a faixa de risco do score). Ex.: `B`. |
| `taxa.taxaFinalMes` | object | sim | Ex.: `1.85`. |
| `taxa.taxaFinalAno` | object | sim | Ex.: `24.6`. |
| `taxa.tetoAplicado` | boolean | sim | Ex.: `True`. |
| `sistema` | enum | sim | Sistema que o cliente escolheu. Aceito também em minúsculas. Valores: `PRICE`, `SAC`. |
| `resumo` | object | sim | Não é gravado; só é conferido contra o `calendario`. |
| `resumo.totalJuros` | object | sim | Soma dos `juros` do calendário. Ex.: `1242.88`. |
| `resumo.totalPago` | object | sim | Soma dos `valor` do calendário. Ex.: `11242.88`. |
| `encargos` | object | sim | Descontados na liberação, não entram no saldo devedor. |
| `encargos.iof` | object | sim |  |
| `encargos.iof.diario` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `encargos.iof.adicional` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `encargos.iof.total` | object | sim | `diario + adicional`. |
| `encargos.tarifaCadastro` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `encargos.total` | object | sim | `iof.total + tarifaCadastro`. |
| `valorLiberado` | object | sim | `condicoes.valor - encargos.total`, maior que zero. Ex.: `9744.35`. |
| `cet` | object | sim |  |
| `cet.mensalPercentual` | object | sim | Ex.: `2.27`. |
| `cet.anualPercentual` | object | sim | Ex.: `30.89`. |
| `calendario` | array | sim | Gravado como veio, sem recálculo. Precisa fechar: `numero` de 1 a n, vencimentos crescentes (o primeiro depois da `dataLiberacao`), `valor = amortizacao + juros`, `saldoDevedor` encadeado a partir de `condicoes.valor` e `0` na última. |
| `calendario[].numero` | integer | sim | Ex.: `1`. |
| `calendario[].amortizacao` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `calendario[].juros` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `calendario[].valor` | object | sim | Vira o `valorParcela`. |
| `calendario[].saldoDevedor` | number | sim | Valor em reais, com no máximo 2 casas decimais. |
| `calendario[].vencimento` | string:date | sim | Ex.: `2026-11-30`. |

**Resposta 201**: Operação registrada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Identificador técnico, sequencial, gerado por este serviço. Ex.: `1`. |
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `criadoEm` | string:date-time | sim | Ex.: `2026-10-10T17:32:14Z`. |

**Resposta 200**: O `identificador` já estava registrado (reenvio). Nada foi gravado; a resposta confirma a operação existente.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Identificador técnico, sequencial, gerado por este serviço. Ex.: `1`. |
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `criadoEm` | string:date-time | sim | Ex.: `2026-10-10T17:32:14Z`. |

**Resposta 400**: JSON malformado ou regra de validação violada.


---

## `GET /operacoes`

**Lista as operações**

Da mais recente para a mais antiga, sem as parcelas. Sem operações cadastradas, devolve `[]`.

O `status` e o `diasEmAtraso` de cada operação são calculados para a `dataReferencia`, com as mesmas regras do `GET /operacoes/{identificador}` (RN-11 e RN-12).

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Lista de operações, com a situação calculada para a `dataReferencia`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `[].id` | integer:int64 | sim | Identificador técnico, sequencial, gerado por este serviço. Ex.: `1`. |
| `[].numeroOperacao` | string | sim | O `identificador` enviado pelo serviço de juros, o mesmo em toda a esteira. Ex.: `OP-2026-0001`. |
| `[].clienteId` | string | sim | CPF ou CNPJ, só números. Ex.: `52998224725`. |
| `[].tipoPessoa` | enum | sim | Valores: `PF`, `PJ`. |
| `[].status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `[].diasEmAtraso` | integer | sim | Maior atraso, em dias corridos, entre as parcelas em aberto na `dataReferencia` (RN-10). É `0` quando não há parcela vencida e nas operações `LIQUIDADA`. Calculado na consulta, nunca gravado. Ex.: `0`. |
| `[].definidoEm` | string:date-time | sim | Quando a operação foi definida no juros, em UTC. Ex.: `2026-10-08T18:12:40Z`. |
| `[].dataLiberacao` | string:date | sim | Ex.: `2026-10-30`. |
| `[].saldoDevedor` | number | sim | Por enquanto é igual ao `valorAprovado`. Ex.: `10000`. |
| `[].produto` | object | sim |  |
| `[].produto.codigo` | string | sim | Ex.: `CONSIGNADO_INSS`. |
| `[].produto.nome` | string | sim | Ex.: `Crédito pessoal consignado INSS`. |
| `[].produto.modalidadeBcb` | string | sim | Ex.: `Crédito pessoal consignado INSS - Prefixado`. |
| `[].condicoesFinanceiras` | object | sim |  |
| `[].condicoesFinanceiras.valorAprovado` | number | sim | Ex.: `10000`. |
| `[].condicoesFinanceiras.prazoMeses` | integer | sim | Ex.: `12`. |
| `[].condicoesFinanceiras.quantidadeParcelas` | integer | sim | Ex.: `12`. |
| `[].condicoesFinanceiras.taxaJuros` | number | sim | Taxa mensal em fração (`0.0185` = 1,85% ao mês). Ex.: `0.0185`. |
| `[].condicoesFinanceiras.taxaJurosAnual` | number | sim | Taxa anual em fração. Ex.: `0.246`. |
| `[].condicoesFinanceiras.faixaRisco` | string | sim | Faixa de preço do juros. Ex.: `B`. |
| `[].condicoesFinanceiras.tetoAplicado` | boolean | sim | Ex.: `True`. |
| `[].condicoesFinanceiras.sistemaAmortizacao` | enum | sim | Valores: `PRICE`, `SAC`. |
| `[].condicoesFinanceiras.primeiroVencimento` | string:date | sim | Ex.: `2026-11-30`. |
| `[].encargos` | object | sim |  |
| `[].encargos.iof` | object | sim |  |
| `[].encargos.iof.diario` | number | sim | Ex.: `167.65`. |
| `[].encargos.iof.adicional` | number | sim | Ex.: `38`. |
| `[].encargos.iof.total` | number | sim | Ex.: `205.65`. |
| `[].encargos.tarifaCadastro` | number | sim | Ex.: `50`. |
| `[].encargos.total` | number | sim | Ex.: `255.65`. |
| `[].valorLiberado` | number | sim | Ex.: `9744.35`. |
| `[].cet` | object | sim | Custo efetivo total, em fração. |
| `[].cet.mensal` | number | sim | Ex.: `0.0227`. |
| `[].cet.anual` | number | sim | Ex.: `0.3089`. |
| `[].criadoEm` | string:date-time | sim | Momento do registro neste serviço, em UTC. Ex.: `2026-10-08T18:13:02Z`. |

**Resposta 400**: `dataReferencia` fora do formato `YYYY-MM-DD`. Falhas inesperadas, como erro de banco, também são devolvidas como `400` por enquanto (ver `ErroInterno`).


---

## `GET /operacoes/{identificador}`

**Consulta a situação de uma operação**

O `status` e o `diasEmAtraso` são calculados na consulta, para a `dataReferencia` (padrão: hoje, GMT-03:00), e nunca gravados (RN-11 e RN-12):

- `EM_ATRASO`: alguma parcela vencida em aberto, com 1 a 90 dias de atraso;
- `INADIMPLENTE`: alguma parcela com mais de 90 dias de atraso;
- `ATIVA`: nenhuma parcela vencida em aberto;
- `LIQUIDADA` continua `LIQUIDADA` em qualquer data de referência.

O `diasEmAtraso` é o maior atraso, em dias corridos, entre as parcelas em aberto (`0` sem atraso). Pagar as parcelas vencidas faz a operação voltar a `EM_ATRASO` ou `ATIVA` sozinha, sem nenhuma ação extra.

Por enquanto o `saldoDevedor` é igual ao `valorAprovado`, porque ainda não há pagamentos.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Operação encontrada, com a situação calculada para a `dataReferencia`.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Identificador técnico, sequencial, gerado por este serviço. Ex.: `1`. |
| `numeroOperacao` | string | sim | O `identificador` enviado pelo serviço de juros, o mesmo em toda a esteira. Ex.: `OP-2026-0001`. |
| `clienteId` | string | sim | CPF ou CNPJ, só números. Ex.: `52998224725`. |
| `tipoPessoa` | enum | sim | Valores: `PF`, `PJ`. |
| `status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `diasEmAtraso` | integer | sim | Maior atraso, em dias corridos, entre as parcelas em aberto na `dataReferencia` (RN-10). É `0` quando não há parcela vencida e nas operações `LIQUIDADA`. Calculado na consulta, nunca gravado. Ex.: `0`. |
| `definidoEm` | string:date-time | sim | Quando a operação foi definida no juros, em UTC. Ex.: `2026-10-08T18:12:40Z`. |
| `dataLiberacao` | string:date | sim | Ex.: `2026-10-30`. |
| `saldoDevedor` | number | sim | Por enquanto é igual ao `valorAprovado`. Ex.: `10000`. |
| `produto` | object | sim |  |
| `produto.codigo` | string | sim | Ex.: `CONSIGNADO_INSS`. |
| `produto.nome` | string | sim | Ex.: `Crédito pessoal consignado INSS`. |
| `produto.modalidadeBcb` | string | sim | Ex.: `Crédito pessoal consignado INSS - Prefixado`. |
| `condicoesFinanceiras` | object | sim |  |
| `condicoesFinanceiras.valorAprovado` | number | sim | Ex.: `10000`. |
| `condicoesFinanceiras.prazoMeses` | integer | sim | Ex.: `12`. |
| `condicoesFinanceiras.quantidadeParcelas` | integer | sim | Ex.: `12`. |
| `condicoesFinanceiras.taxaJuros` | number | sim | Taxa mensal em fração (`0.0185` = 1,85% ao mês). Ex.: `0.0185`. |
| `condicoesFinanceiras.taxaJurosAnual` | number | sim | Taxa anual em fração. Ex.: `0.246`. |
| `condicoesFinanceiras.faixaRisco` | string | sim | Faixa de preço do juros. Ex.: `B`. |
| `condicoesFinanceiras.tetoAplicado` | boolean | sim | Ex.: `True`. |
| `condicoesFinanceiras.sistemaAmortizacao` | enum | sim | Valores: `PRICE`, `SAC`. |
| `condicoesFinanceiras.primeiroVencimento` | string:date | sim | Ex.: `2026-11-30`. |
| `encargos` | object | sim |  |
| `encargos.iof` | object | sim |  |
| `encargos.iof.diario` | number | sim | Ex.: `167.65`. |
| `encargos.iof.adicional` | number | sim | Ex.: `38`. |
| `encargos.iof.total` | number | sim | Ex.: `205.65`. |
| `encargos.tarifaCadastro` | number | sim | Ex.: `50`. |
| `encargos.total` | number | sim | Ex.: `255.65`. |
| `valorLiberado` | number | sim | Ex.: `9744.35`. |
| `cet` | object | sim | Custo efetivo total, em fração. |
| `cet.mensal` | number | sim | Ex.: `0.0227`. |
| `cet.anual` | number | sim | Ex.: `0.3089`. |
| `criadoEm` | string:date-time | sim | Momento do registro neste serviço, em UTC. Ex.: `2026-10-08T18:13:02Z`. |

**Resposta 400**: O identificador não é um id nem um número de operação, ou a `dataReferencia` está fora do formato `YYYY-MM-DD`.

**Resposta 404**: Operação não encontrada.


---

## `GET /operacoes/{identificador}/parcelas`

**Consulta o cronograma de parcelas**

RN-09, RN-10, RN-11 e RN-13: parcelas ordenadas por numero, com situação calculada na data de referência.
Só há atraso depois do vencimento, em dias corridos, se a parcela não estiver paga por inteiro.
VENCIDA prevalece sobre PENDENTE e PARCIALMENTE_PAGA na resposta; PAGA permanece PAGA.
RN-13: multa de 2% da base do primeiro dia de atraso, fixada nesse dia; mora simples
de 1% ao mês pro rata die (divisor 30) sobre a base de cada trecho, reduzida na data do pagamento.
Não há juros sobre multa nem capitalização. Arredondar multa e mora acumuladas ao centavo,
meio para cima, somente no resultado, sem arredondar cada dia ou trecho; subtrair os respectivos encargos pagos.
encargos.total soma os componentes em aberto; totalParaQuitar é valorEmAberto + encargos.total.
Sem atraso ou PAGA: encargos zero. PAGA também tem totalParaQuitar zero, inclusive com desconto.
Os encargos são calculados a partir dos lançamentos e não são gravados.
O cálculo não altera os estados gravados. A data não pode anteceder a última movimentação financeira.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |

**Resposta 200**: Cronograma da operação.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `[].numero` | integer | sim | Ex.: `1`. |
| `[].vencimento` | string:date | sim | Ex.: `2026-11-30`. |
| `[].valorParcela` | number | sim | `amortizacao + juros`, como veio do juros. Ex.: `936.91`. |
| `[].amortizacao` | number | sim | Parte do principal paga na parcela. Ex.: `751.91`. |
| `[].juros` | number | sim | Juros do período. Ex.: `185`. |
| `[].saldoDevedor` | number | sim | Saldo após a parcela. É `0` na última. Ex.: `9248.09`. |
| `[].valorEmAberto` | number | sim | Juros + amortização menos juros pagos, amortização paga e desconto concedido (RN-13). Sem multa nem mora. PAGA sempre tem zero. Valor em reais, até duas casas decimais. Ex.: `936.91`. |
| `[].diasEmAtraso` | integer | sim | Dias corridos entre vencimento e dataReferencia quando vencida (RN-10). Zero no vencimento, antes dele ou se PAGA. Ex.: `10`. |
| `[].encargos` | object | sim | Encargos por atraso em aberto na dataReferencia (RN-13), em reais, até duas casas. Todos os campos sempre presentes, inclusive zerados. |
| `[].encargos.multa` | number | sim | Multa de 2% da base do primeiro dia de atraso, fixada e arredondada ao centavo, menos multa paga. Zero sem atraso ou para PAGA. Ex.: `18.74`. |
| `[].encargos.jurosMora` | number | sim | Mora simples acumulada (1% x base x dias / 30 por trecho), arredondada somente ao final, menos mora paga. Zero sem atraso ou para PAGA. Ex.: `3.12`. |
| `[].encargos.total` | number | sim | Soma de multa e jurosMora em aberto após os pagamentos de cada componente. Ex.: `21.86`. |
| `[].totalParaQuitar` | number | sim | Valor em aberto + encargos.total na dataReferencia (RN-13), em reais, até duas casas. Zero para PAGA. Não é a liquidação antecipada da operação (RN-18). Ex.: `958.77`. |
| `[].status` | enum | sim | VENCIDA quando não paga por inteiro e dataReferencia posterior ao vencimento (RN-10 e RN-11), prevalecendo sobre PENDENTE e PARCIALMENTE_PAGA na resposta. PAGA permanece PAGA. O estado calculado não é gravado. Valores: `PENDENTE`, `PAGA`, `PARCIALMENTE_PAGA`, `VENCIDA`. |

**Resposta 400**: O identificador não é um id nem um número de operação.

**Resposta 404**: Operação não encontrada.


---

## `GET /operacoes/{identificador}/amortizacoes/simulacao`

**Simula a antecipação de parcelas**

Calcula, sem gravar nada, quanto custa antecipar `quantidadeParcelas` parcelas em aberto na `dataReferencia` (RN-16 e RN-17). O `modo` escolhe quais: as **últimas** (`ULTIMAS`, o padrão, que reduz o prazo e dá mais desconto) ou as **próximas** a vencer (`PROXIMAS`, com bem menos desconto).

Cada parcela entra pelo valor presente, `valorParcela / (1 + i) ^ (k − f)`, em que `i` é a taxa mensal do contrato, `k` é a posição da parcela entre as que ainda vão vencer e `f` é a fração já decorrida do período atual. No meio de um período, o valor presente se divide em `amortizacao` (parte de principal) e `juros` (juros pro rata do período em curso); no dia de um vencimento, `juros` é `0`. A parcela que vence na própria `dataReferencia` entra pelo valor em aberto, sem desconto. O `desconto` é `valorParcela − valorPresente`. A diferença de centavos do arredondamento fica na última parcela da lista.

Responde `400` se houver parcela vencida em aberto ou `PARCIALMENTE_PAGA`, se a `quantidadeParcelas` for inválida ou se ela cobrir todas as parcelas em aberto, porque isso é liquidação total.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `quantidadeParcelas` | query | sim | Quantas parcelas em aberto antecipar. Maior que zero e menor que o total de parcelas em aberto. |
| `modo` | query | não | Quais parcelas antecipar. `ULTIMAS` (padrão) quita as últimas e reduz o prazo; `PROXIMAS` quita as primeiras em aberto, com menos desconto. Aceita minúsculas. |
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Simulação calculada. Nada foi gravado.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `modo` | enum | sim | Quais parcelas a amortização quita (RN-17). `ULTIMAS` quita o fim do calendário: reduz o prazo e dá mais desconto. `PROXIMAS` quita as primeiras em aberto: dá bem menos desconto, o que é melhor para o negócio. Valores: `ULTIMAS`, `PROXIMAS`. |
| `dataReferencia` | string:date | sim | Ex.: `2026-12-30`. |
| `quantidadeParcelas` | integer | sim | Ex.: `2`. |
| `parcelas` | array | sim | As parcelas que seriam antecipadas, da menor para a maior. |
| `parcelas[].numero` | integer | sim | Ex.: `11`. |
| `parcelas[].vencimento` | string:date | sim | Ex.: `2027-09-30`. |
| `parcelas[].valorParcela` | object | sim | Valor da parcela no calendário. Ex.: `936.91`. |
| `parcelas[].valorPresente` | object | sim | Quanto vale a parcela na data, a ser paga por ela. Ex.: `794.42`. |
| `parcelas[].desconto` | object | sim | `valorParcela − valorPresente`. Ex.: `142.49`. |
| `parcelas[].amortizacao` | object | sim | Parte de principal do valor presente. Ex.: `794.42`. |
| `parcelas[].juros` | object | sim | Juros pro rata do período em curso. É `0` no dia de um vencimento. Ex.: `0`. |
| `totais` | object | sim | Soma das parcelas antecipadas. |
| `totais.valorParcelas` | object | sim | Soma dos `valorParcela`. Ex.: `1873.78`. |
| `totais.desconto` | object | sim | Soma dos `desconto`. Ex.: `299.41`. |
| `totais.valorPresente` | object | sim | Soma dos `valorPresente`. Ex.: `1574.37`. |
| `totais.amortizacao` | object | sim | Soma das `amortizacao`. Ex.: `1574.37`. |
| `totais.juros` | object | sim | Soma dos `juros` pro rata. Ex.: `0`. |
| `totais.valorAPagar` | object | sim | Total a pagar pela antecipação, igual ao `valorPresente`. Ex.: `1574.37`. |
| `saldoDevedorAntes` | object | sim | Saldo devedor da operação antes da antecipação. Ex.: `8482.27`. |
| `saldoDevedorApos` | object | sim | Saldo devedor depois da antecipação: `saldoDevedorAntes − totais.amortizacao`. Ex.: `6907.9`. |
| `quantidadeParcelasRestantes` | integer | sim | Parcelas que continuam em aberto depois da antecipação. Ex.: `8`. |

**Resposta 400**: Parâmetro inválido, parcela vencida em aberto ou `PARCIALMENTE_PAGA`, ou pedido que cobre todas as parcelas em aberto (liquidação).

**Resposta 404**: Operação não encontrada.


---

## `POST /operacoes/{identificador}/amortizacoes`

**Registra a antecipação de parcelas**

Quita `quantidadeParcelas` parcelas em aberto pelo valor presente (RN-16 e RN-17), com as mesmas regras e a mesma conta da simulação. O `modo` escolhe quais: as **últimas** (`ULTIMAS`, o padrão) ou as **próximas** a vencer (`PROXIMAS`).

No modo `PROXIMAS`, as parcelas que continuam em aberto mantêm valor e vencimento. A primeira delas só vence depois dos períodos das que foram quitadas, então o `juros` dela é o de todos esses períodos sobre o saldo, e as demais seguem o calendário original, com diferença de centavos. O saldo ainda termina em `0` na última.

Grava o evento `AMORTIZACAO_ANTECIPADA` com **um lançamento por parcela quitada**, com `amortizacao`, `juros` (pro rata) e `desconto`, e recalcula a tabela das parcelas que restam, de modo que o saldo termine em `0` na última. A tabela atualizada sai em `GET /operacoes/{identificador}/parcelas`.

Sem `dataPagamento`, vale hoje (RN-09). O `identificadorPagamento` é opcional e serve de chave de idempotência: reenviar o mesmo identificador na mesma operação devolve `200` com o registro já gravado, sem gravar de novo. Se ele não for enviado, o campo não aparece na resposta.

Responde `400` se houver parcela vencida em aberto ou `PARCIALMENTE_PAGA`, se a `quantidadeParcelas` for inválida ou se ela cobrir todas as parcelas em aberto, porque isso é liquidação total.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |

**Corpo da requisição**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `quantidadeParcelas` | integer | sim | Quantas parcelas em aberto antecipar. Ex.: `2`. |
| `modo` | object | não | Quais parcelas antecipar. Sem o campo, vale `ULTIMAS`. Aceita minúsculas. Ex.: `PROXIMAS`. |
| `dataPagamento` | string:date | não | Dia do pagamento, `YYYY-MM-DD`. Sem o campo, vale hoje (RN-09). Não pode ser futura, nem anterior à `dataLiberacao` ou ao último pagamento. Ex.: `2026-12-30`. |
| `identificadorPagamento` | string | não | Opcional. Chave de idempotência por operação; reenviar o mesmo devolve o registro já gravado. Ex.: `PAG-2026-0003`. |

**Resposta 201**: Amortização registrada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `eventoId` | integer:int64 | sim | Ex.: `4`. |
| `tipo` | enum | sim | Valores: `AMORTIZACAO_ANTECIPADA`. |
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `modo` | enum | sim | Quais parcelas a amortização quita (RN-17). `ULTIMAS` quita o fim do calendário: reduz o prazo e dá mais desconto. `PROXIMAS` quita as primeiras em aberto: dá bem menos desconto, o que é melhor para o negócio. Valores: `ULTIMAS`, `PROXIMAS`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado na requisição. Ex.: `PAG-2026-0003`. |
| `dataPagamento` | string:date | sim | Ex.: `2026-12-30`. |
| `quantidadeParcelas` | integer | sim | Ex.: `2`. |
| `lancamentos` | array | sim | Um lançamento por parcela quitada, da menor para a maior. |
| `lancamentos[].numero` | integer | sim | Ex.: `11`. |
| `lancamentos[].vencimento` | string:date | sim | Ex.: `2027-09-30`. |
| `lancamentos[].valorParcela` | object | sim | Valor da parcela no calendário. Ex.: `936.91`. |
| `lancamentos[].valorPresente` | object | sim | Quanto vale a parcela na data, a ser paga por ela. Ex.: `794.42`. |
| `lancamentos[].desconto` | object | sim | `valorParcela − valorPresente`. Ex.: `142.49`. |
| `lancamentos[].amortizacao` | object | sim | Parte de principal do valor presente. Ex.: `794.42`. |
| `lancamentos[].juros` | object | sim | Juros pro rata do período em curso. É `0` no dia de um vencimento. Ex.: `0`. |
| `totais` | object | sim | Soma das parcelas antecipadas. |
| `totais.valorParcelas` | object | sim | Soma dos `valorParcela`. Ex.: `1873.78`. |
| `totais.desconto` | object | sim | Soma dos `desconto`. Ex.: `299.41`. |
| `totais.valorPresente` | object | sim | Soma dos `valorPresente`. Ex.: `1574.37`. |
| `totais.amortizacao` | object | sim | Soma das `amortizacao`. Ex.: `1574.37`. |
| `totais.juros` | object | sim | Soma dos `juros` pro rata. Ex.: `0`. |
| `totais.valorAPagar` | object | sim | Total a pagar pela antecipação, igual ao `valorPresente`. Ex.: `1574.37`. |
| `saldoDevedorAntes` | object | sim | Saldo devedor da operação antes da antecipação. Ex.: `8482.27`. |
| `saldoDevedorApos` | object | sim | Saldo devedor depois da antecipação: `saldoDevedorAntes − totais.amortizacao`. Ex.: `6907.9`. |
| `quantidadeParcelasRestantes` | integer | sim | Parcelas que continuam em aberto. A tabela recalculada sai em `GET /operacoes/{identificador}/parcelas`. Ex.: `8`. |

**Resposta 200**: Reenvio do mesmo `identificadorPagamento`. Devolve o registro já gravado, sem gravar de novo.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `eventoId` | integer:int64 | sim | Ex.: `4`. |
| `tipo` | enum | sim | Valores: `AMORTIZACAO_ANTECIPADA`. |
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `modo` | enum | sim | Quais parcelas a amortização quita (RN-17). `ULTIMAS` quita o fim do calendário: reduz o prazo e dá mais desconto. `PROXIMAS` quita as primeiras em aberto: dá bem menos desconto, o que é melhor para o negócio. Valores: `ULTIMAS`, `PROXIMAS`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado na requisição. Ex.: `PAG-2026-0003`. |
| `dataPagamento` | string:date | sim | Ex.: `2026-12-30`. |
| `quantidadeParcelas` | integer | sim | Ex.: `2`. |
| `lancamentos` | array | sim | Um lançamento por parcela quitada, da menor para a maior. |
| `lancamentos[].numero` | integer | sim | Ex.: `11`. |
| `lancamentos[].vencimento` | string:date | sim | Ex.: `2027-09-30`. |
| `lancamentos[].valorParcela` | object | sim | Valor da parcela no calendário. Ex.: `936.91`. |
| `lancamentos[].valorPresente` | object | sim | Quanto vale a parcela na data, a ser paga por ela. Ex.: `794.42`. |
| `lancamentos[].desconto` | object | sim | `valorParcela − valorPresente`. Ex.: `142.49`. |
| `lancamentos[].amortizacao` | object | sim | Parte de principal do valor presente. Ex.: `794.42`. |
| `lancamentos[].juros` | object | sim | Juros pro rata do período em curso. É `0` no dia de um vencimento. Ex.: `0`. |
| `totais` | object | sim | Soma das parcelas antecipadas. |
| `totais.valorParcelas` | object | sim | Soma dos `valorParcela`. Ex.: `1873.78`. |
| `totais.desconto` | object | sim | Soma dos `desconto`. Ex.: `299.41`. |
| `totais.valorPresente` | object | sim | Soma dos `valorPresente`. Ex.: `1574.37`. |
| `totais.amortizacao` | object | sim | Soma das `amortizacao`. Ex.: `1574.37`. |
| `totais.juros` | object | sim | Soma dos `juros` pro rata. Ex.: `0`. |
| `totais.valorAPagar` | object | sim | Total a pagar pela antecipação, igual ao `valorPresente`. Ex.: `1574.37`. |
| `saldoDevedorAntes` | object | sim | Saldo devedor da operação antes da antecipação. Ex.: `8482.27`. |
| `saldoDevedorApos` | object | sim | Saldo devedor depois da antecipação: `saldoDevedorAntes − totais.amortizacao`. Ex.: `6907.9`. |
| `quantidadeParcelasRestantes` | integer | sim | Parcelas que continuam em aberto. A tabela recalculada sai em `GET /operacoes/{identificador}/parcelas`. Ex.: `8`. |

**Resposta 400**: JSON inválido, data fora das regras, parcela vencida em aberto ou `PARCIALMENTE_PAGA`, ou pedido que cobre todas as parcelas em aberto (liquidação).

**Resposta 404**: Operação não encontrada.


---

## `POST /operacoes/{identificador}/parcelas/{numero}/pagamentos`

**Registra o pagamento de uma parcela**

RN-14, RN-15 e RN-19. O pagamento é por parcela e só vale para as vencidas e a próxima a vencer.
Dentro da parcela o valor abate, nesta ordem: multa → juros de mora → juros → amortização (RN-13).
O saldo devedor cai só pela parte que foi para a amortização.
O valor não pode passar do total para quitar a parcela na `dataPagamento` (valor em aberto + encargos em aberto). Pagamento de parcela não dá desconto.

Quitar a última parcela em aberto liquida a operação (RN-19): `operacao.status` sai `LIQUIDADA` e um evento `LIQUIDACAO` sem valor é gravado junto.

Evento `PAGAMENTO`, lançamento, status da parcela e saldo são gravados numa transação só (ADR-012).

**Reenvio:** com um `identificadorPagamento` que já existe na operação, nada é gravado e a resposta é `200` com o pagamento já registrado. Essa conferência vem antes das validações, para o reenvio de um pagamento que quitou a parcela não virar `400`.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `numero` | path | sim | O `numero` da parcela no calendário (1, 2, 3…). |

**Corpo da requisição**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `valor` | number | sim | Maior que zero, até 2 casas. Não pode passar do total para quitar a parcela na `dataPagamento` (valor em aberto + encargos em aberto). Ex.: `500`. |
| `dataPagamento` | string:date | não | RN-09, dia em que o dinheiro entrou (GMT-03:00). Omitida, vale hoje. Não pode ser futura, anterior à `dataLiberacao` nem anterior à última movimentação financeira da operação. Ex.: `2026-12-10`. |
| `identificadorPagamento` | string | não | Opcional. Identificador de quem chama; repetido na mesma operação = reenvio (`200`, nada é gravado). Ex.: `app-7f3a91`. |
| `origem` | string | não | Opcional, texto livre (`CLIENTE`, `INSS`, `BOLETO`…). Só vai para o histórico. Ex.: `CLIENTE`. |

**Resposta 201**: Pagamento registrado.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Id do evento `PAGAMENTO` no histórico. Ex.: `2`. |
| `dataPagamento` | string:date | sim | Ex.: `2026-12-10`. |
| `valor` | number | sim | Ex.: `500`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado no pedido. Ex.: `app-7f3a91`. |
| `origem` | string | não | Só aparece quando foi enviada no pedido. Ex.: `CLIENTE`. |
| `distribuicao` | object | sim | Para onde foi o dinheiro, na ordem de abatimento da RN-14. A soma é o `valor` pago. |
| `distribuicao.multa` | number | sim | Ex.: `18.74`. |
| `distribuicao.jurosMora` | number | sim | Ex.: `3.12`. |
| `distribuicao.juros` | number | sim | Ex.: `185`. |
| `distribuicao.amortizacao` | number | sim | Parte que abateu o saldo devedor. Ex.: `293.14`. |
| `parcela` | object | sim | Como a parcela ficou depois do pagamento, na `dataPagamento`. |
| `parcela.numero` | integer | sim | Ex.: `1`. |
| `parcela.status` | enum | sim | Status gravado. Na consulta de parcelas, uma PARCIALMENTE_PAGA ainda vencida aparece como VENCIDA (RN-11). Valores: `PARCIALMENTE_PAGA`, `PAGA`. |
| `parcela.valorEmAberto` | number | sim | Juros + amortização que ainda faltam, sem encargos (RN-13). Ex.: `458.77`. |
| `parcela.encargosEmAberto` | number | sim | Multa + mora que ainda faltam na `dataPagamento`. Para quitar a parcela nesse dia, faltam `valorEmAberto + encargosEmAberto`. Ex.: `0`. |
| `operacao` | object | sim |  |
| `operacao.numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `operacao.status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `operacao.saldoDevedor` | number | sim | Principal em aberto depois do pagamento (RN-15). Ex.: `9706.86`. |
| `registradoEm` | string:date-time | sim | Momento do registro, em UTC. Ex.: `2026-12-10T13:20:05Z`. |

**Resposta 200**: O `identificadorPagamento` já existia na operação (reenvio). Nada foi gravado; a resposta é o pagamento já registrado.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Id do evento `PAGAMENTO` no histórico. Ex.: `2`. |
| `dataPagamento` | string:date | sim | Ex.: `2026-12-10`. |
| `valor` | number | sim | Ex.: `500`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado no pedido. Ex.: `app-7f3a91`. |
| `origem` | string | não | Só aparece quando foi enviada no pedido. Ex.: `CLIENTE`. |
| `distribuicao` | object | sim | Para onde foi o dinheiro, na ordem de abatimento da RN-14. A soma é o `valor` pago. |
| `distribuicao.multa` | number | sim | Ex.: `18.74`. |
| `distribuicao.jurosMora` | number | sim | Ex.: `3.12`. |
| `distribuicao.juros` | number | sim | Ex.: `185`. |
| `distribuicao.amortizacao` | number | sim | Parte que abateu o saldo devedor. Ex.: `293.14`. |
| `parcela` | object | sim | Como a parcela ficou depois do pagamento, na `dataPagamento`. |
| `parcela.numero` | integer | sim | Ex.: `1`. |
| `parcela.status` | enum | sim | Status gravado. Na consulta de parcelas, uma PARCIALMENTE_PAGA ainda vencida aparece como VENCIDA (RN-11). Valores: `PARCIALMENTE_PAGA`, `PAGA`. |
| `parcela.valorEmAberto` | number | sim | Juros + amortização que ainda faltam, sem encargos (RN-13). Ex.: `458.77`. |
| `parcela.encargosEmAberto` | number | sim | Multa + mora que ainda faltam na `dataPagamento`. Para quitar a parcela nesse dia, faltam `valorEmAberto + encargosEmAberto`. Ex.: `0`. |
| `operacao` | object | sim |  |
| `operacao.numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `operacao.status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `operacao.saldoDevedor` | number | sim | Principal em aberto depois do pagamento (RN-15). Ex.: `9706.86`. |
| `registradoEm` | string:date-time | sim | Momento do registro, em UTC. Ex.: `2026-12-10T13:20:05Z`. |

**Resposta 400**: JSON malformado, identificador ou número de parcela inválido, ou regra de negócio violada.

**Resposta 404**: Operação ou parcela não encontrada.


---

## `GET /operacoes/{identificador}/liquidacao`

**Consulta o valor para quitar a operação**

RN-18 e RN-16. Valor para quitar na data de referência = parcelas vencidas em aberto com encargos (sem desconto) + parcelas a vencer pelo valor presente. Sem tarifa.
A parcela que vence no próprio dia entra em `aVencer` pelo valor em aberto, sem desconto nem encargos.
O valor presente de cada parcela é arredondado ao centavo e o total é a soma delas, como no exemplo da RN-17.
Operação `LIQUIDADA` não tem valor para quitar (`400`).

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Valor para quitar na data de referência.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `dataReferencia` | string:date | sim | Ex.: `2027-01-15`. |
| `valorParaQuitar` | number | sim | `vencidas.total + aVencer.valorPresente`. É o `valor` que o `POST` exige nessa data. Ex.: `8558`. |
| `saldoDevedor` | number | sim | Principal em aberto (RN-15), para comparação. Ex.: `8482.27`. |
| `vencidas` | object | sim |  |
| `vencidas.parcelas` | array | sim | Vencidas em aberto, com os encargos na data. Lista vazia sai como `[]`. |
| `vencidas.parcelas[].numero` | integer | sim |  |
| `vencidas.parcelas[].vencimento` | string:date | sim |  |
| `vencidas.parcelas[].diasEmAtraso` | integer | sim |  |
| `vencidas.parcelas[].valorEmAberto` | number | sim |  |
| `vencidas.parcelas[].multa` | number | sim | Multa em aberto. |
| `vencidas.parcelas[].jurosMora` | number | sim | Juros de mora em aberto. |
| `vencidas.parcelas[].total` | number | sim | `valorEmAberto + multa + jurosMora`. |
| `vencidas.total` | number | sim |  |
| `aVencer` | object | sim |  |
| `aVencer.parcelas` | array | sim |  |
| `aVencer.parcelas[].numero` | integer | sim |  |
| `aVencer.parcelas[].vencimento` | string:date | sim |  |
| `aVencer.parcelas[].valorEmAberto` | number | sim |  |
| `aVencer.parcelas[].valorPresente` | number | sim | RN-16, arredondado ao centavo. Igual ao `valorEmAberto` na parcela que vence no próprio dia. |
| `aVencer.parcelas[].desconto` | number | sim | `valorEmAberto - valorPresente`. |
| `aVencer.valorNominal` | number | sim | Soma dos `valorEmAberto`. |
| `aVencer.valorPresente` | number | sim | Soma dos `valorPresente`. |
| `aVencer.desconto` | number | sim | `valorNominal - valorPresente`. |
| `aVencer.amortizacao` | number | sim | Parte do valor presente que é principal (o saldo devedor dessas parcelas). |
| `aVencer.juros` | number | sim | Juros pro rata do período em curso (`valorPresente - amortizacao`). Zero no dia de um vencimento. |

**Resposta 400**: Identificador ou data inválidos (RN-09), ou operação já liquidada.

**Resposta 404**: Operação não encontrada.


---

## `POST /operacoes/{identificador}/liquidacao`

**Quita a operação antes do prazo**

RN-18 e RN-19. O `valor` precisa ser igual ao valor para quitar na `dataPagamento` (o mesmo do `GET`), para não quitar com um número velho.
Depois: todas as parcelas `PAGA`, saldo devedor `0`, operação `LIQUIDADA`, evento `LIQUIDACAO`.
As vencidas viram lançamentos por parcela (com encargos); as a vencer, um lançamento só da operação, sem parcela, com o desconto.
Tudo numa transação só (ADR-012).

**Reenvio:** com um `identificadorPagamento` que já existe na operação, nada é gravado e a resposta é `200` com a liquidação já registrada. Essa conferência vem antes das validações, para o reenvio não virar `400` por a operação já estar liquidada.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |

**Corpo da requisição**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `valor` | number | sim | Igual ao `valorParaQuitar` na `dataPagamento`. Ex.: `8558`. |
| `dataPagamento` | string:date | não | RN-09. Omitida, vale hoje. Não pode ser futura, anterior à `dataLiberacao` nem anterior à última movimentação financeira da operação. Ex.: `2027-01-15`. |
| `identificadorPagamento` | string | não | Opcional. Repetido na mesma operação = reenvio (`200`, nada é gravado). Ex.: `app-9c41d0`. |
| `origem` | string | não | Opcional, texto livre. Só vai para o histórico. Ex.: `CLIENTE`. |

**Resposta 201**: Operação liquidada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Id do evento `LIQUIDACAO` no histórico. Ex.: `4`. |
| `dataPagamento` | string:date | sim | Ex.: `2027-01-15`. |
| `valor` | number | sim | Ex.: `8558`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado no pedido. |
| `origem` | string | não | Só aparece quando foi enviada no pedido. |
| `vencidas` | array | sim | Um lançamento por parcela vencida, com a distribuição da RN-14. Lista vazia sai como `[]`. |
| `vencidas[].numero` | integer | sim |  |
| `vencidas[].distribuicao` | object | sim | Para onde foi o dinheiro, na ordem de abatimento da RN-14. A soma é o `valor` pago. |
| `vencidas[].distribuicao.multa` | number | sim | Ex.: `18.74`. |
| `vencidas[].distribuicao.jurosMora` | number | sim | Ex.: `3.12`. |
| `vencidas[].distribuicao.juros` | number | sim | Ex.: `185`. |
| `vencidas[].distribuicao.amortizacao` | number | sim | Parte que abateu o saldo devedor. Ex.: `293.14`. |
| `aVencer` | object | sim | O lançamento único da operação para as parcelas a vencer (RN-18). |
| `aVencer.parcelas` | array | sim | Números das parcelas quitadas por valor presente. |
| `aVencer.valorNominal` | number | sim |  |
| `aVencer.desconto` | number | sim |  |
| `aVencer.amortizacao` | number | sim | O saldo devedor que restava. |
| `aVencer.juros` | number | sim |  |
| `aVencer.valor` | number | sim | `amortizacao + juros`, o valor presente pago. |
| `operacao` | object | sim |  |
| `operacao.numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `operacao.status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `operacao.saldoDevedor` | number | sim | Ex.: `0`. |
| `registradoEm` | string:date-time | sim | Ex.: `2027-01-15T12:45:30Z`. |

**Resposta 200**: O `identificadorPagamento` já existia na operação (reenvio). Nada foi gravado; a resposta é a liquidação já registrada.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | integer:int64 | sim | Id do evento `LIQUIDACAO` no histórico. Ex.: `4`. |
| `dataPagamento` | string:date | sim | Ex.: `2027-01-15`. |
| `valor` | number | sim | Ex.: `8558`. |
| `identificadorPagamento` | string | não | Só aparece quando foi enviado no pedido. |
| `origem` | string | não | Só aparece quando foi enviada no pedido. |
| `vencidas` | array | sim | Um lançamento por parcela vencida, com a distribuição da RN-14. Lista vazia sai como `[]`. |
| `vencidas[].numero` | integer | sim |  |
| `vencidas[].distribuicao` | object | sim | Para onde foi o dinheiro, na ordem de abatimento da RN-14. A soma é o `valor` pago. |
| `vencidas[].distribuicao.multa` | number | sim | Ex.: `18.74`. |
| `vencidas[].distribuicao.jurosMora` | number | sim | Ex.: `3.12`. |
| `vencidas[].distribuicao.juros` | number | sim | Ex.: `185`. |
| `vencidas[].distribuicao.amortizacao` | number | sim | Parte que abateu o saldo devedor. Ex.: `293.14`. |
| `aVencer` | object | sim | O lançamento único da operação para as parcelas a vencer (RN-18). |
| `aVencer.parcelas` | array | sim | Números das parcelas quitadas por valor presente. |
| `aVencer.valorNominal` | number | sim |  |
| `aVencer.desconto` | number | sim |  |
| `aVencer.amortizacao` | number | sim | O saldo devedor que restava. |
| `aVencer.juros` | number | sim |  |
| `aVencer.valor` | number | sim | `amortizacao + juros`, o valor presente pago. |
| `operacao` | object | sim |  |
| `operacao.numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `operacao.status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `operacao.saldoDevedor` | number | sim | Ex.: `0`. |
| `registradoEm` | string:date-time | sim | Ex.: `2027-01-15T12:45:30Z`. |

**Resposta 400**: JSON malformado, identificador inválido ou regra de negócio violada.

**Resposta 404**: Operação não encontrada.


---

## `GET /operacoes/{identificador}/resumo`

**Consulta o resumo financeiro da operação**

RN-20. Totais da operação na data de referência, somados a partir dos lançamentos e das parcelas. Nada é gravado.

Conferência que vale sempre: `totalPago = valorAmortizado + jurosPagos + encargosPagos`. O `descontoAntecipacao` não entra no `totalPago`, porque não é dinheiro recebido.

`valorParaQuitar` é o mesmo valor do `GET /operacoes/{identificador}/liquidacao` na mesma data, e é `0` em operação `LIQUIDADA`.

`status` e `diasEmAtraso` seguem as regras da consulta da operação (RN-11 e RN-12).

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Resumo financeiro na data de referência.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `numeroOperacao` | string | sim | Ex.: `OP-2026-0001`. |
| `dataReferencia` | string:date | sim | Ex.: `2026-12-10`. |
| `status` | enum | sim | Calculado na consulta, para a `dataReferencia`, e nunca gravado (RN-11 e RN-12), exceto `LIQUIDADA`:  - `ATIVA`: nenhuma parcela vencida em aberto; - `EM_ATRASO`: alguma parcela vencida há 1 a 90 dias; - `INADIMPLENTE`: alguma parcela vencida há mais de 90 dias; - `LIQUIDADA`: quitada; continua `LIQUIDADA` em qualquer data de referência; - `RENEGOCIADA`: prevista, depende de outro grupo. Valores: `ATIVA`, `EM_ATRASO`, `INADIMPLENTE`, `RENEGOCIADA`, `LIQUIDADA`. |
| `diasEmAtraso` | integer | sim | Maior atraso, em dias corridos, entre as parcelas em aberto na data (RN-10). `0` sem atraso e em operação `LIQUIDADA`. Ex.: `10`. |
| `totalContratado` | object | sim | Valor da operação (`valorAprovado`). Ex.: `10000`. |
| `totalPrevisto` | object | sim | Soma das parcelas do calendário original. A amortização antecipada não muda esse total. Ex.: `11242.88`. |
| `totalPago` | object | sim | Tudo o que o cliente pagou (parcelas, encargos, amortizações e liquidação), sem o desconto. Ex.: `500`. |
| `valorAmortizado` | object | sim | Parte do `totalPago` que abateu principal. Ex.: `293.14`. |
| `jurosPagos` | object | sim | Parte do `totalPago` que foi para juros remuneratórios. Ex.: `185`. |
| `encargosPagos` | object | sim | Multa e juros de mora pagos. Ex.: `21.86`. |
| `descontoAntecipacao` | object | sim | Desconto concedido em amortizações e na liquidação (soma nominal − valor presente). Ex.: `0`. |
| `valorVencido` | object | sim | Valor em aberto das parcelas vencidas, sem encargos. Ex.: `458.77`. |
| `encargosEmAberto` | object | sim | Multa e mora das parcelas vencidas, na data de referência. Ex.: `0`. |
| `saldoDevedor` | object | sim | Principal em aberto (RN-15). Ex.: `9706.86`. |
| `valorParaQuitar` | object | sim | Valor da liquidação na data de referência (RN-18). `0` em operação `LIQUIDADA`. Ex.: `9763.54`. |

**Resposta 400**: Identificador ou data inválidos (RN-09).

**Resposta 404**: Operação não encontrada.


---

## `GET /operacoes/{identificador}/historico`

**Consulta o histórico de eventos da operação**

RN-21. Os eventos gravados da operação (registro, pagamentos, amortizações e liquidação) e, na data de referência, o atraso e a inadimplência calculados, em ordem cronológica. O mais antigo vem primeiro; no mesmo dia, o gravado vem antes do calculado.

Cada item tem `origem`: `REGISTRADO` para um evento gravado, que nunca é alterado, e `CALCULADO` para uma entrada que sai da situação na `dataReferencia` (RN-11) e não é gravada:

- `PARCELA_VENCIDA`: no dia seguinte ao vencimento de uma parcela que esteve em atraso na data (ainda em aberto ou quitada depois do vencimento);
- `OPERACAO_INADIMPLENTE`: no 91º dia de atraso de alguma parcela (RN-12).

Os itens gravados trazem `id`, `registradoEm` (UTC) e os lançamentos do evento, com `numeroParcela` nulo no lançamento da operação (parcelas a vencer na liquidação). `valor` só existe nos eventos que movimentam dinheiro; `identificadorPagamento` e `origemPagamento` só quando foram enviados. A `origem` do pagamento (`CLIENTE`, `INSS`…) sai em `origemPagamento` para não se confundir com a `origem` do item.

A data tem as regras da consulta da operação (RN-09): não pode ser anterior à última movimentação financeira.

**Parâmetros**

| Nome | Em | Obrigatório | Descrição |
|---|---|---|---|
| `identificador` | path | sim | O `numeroOperacao` (`OP-AAAA-NNNN`), que é o identificador do juros e o jeito normal de consultar. Aceito em maiúsculas ou minúsculas. O `id` interno (inteiro) também é aceito. |
| `dataReferencia` | query | não | Dia (`YYYY-MM-DD`, em GMT-03:00) para o qual o resultado é calculado (RN-09). Sem o parâmetro, vale hoje. Nada é gravado: é só a data usada na conta. |

**Resposta 200**: Itens do histórico, em ordem cronológica.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `[].id` | integer:int64 | não | Id do evento gravado. Ex.: `2`. |
| `[].tipo` | enum | sim | Valores: `OPERACAO_REGISTRADA`, `PAGAMENTO`, `AMORTIZACAO_ANTECIPADA`, `LIQUIDACAO`, `PARCELA_VENCIDA`, `OPERACAO_INADIMPLENTE`. Ex.: `PAGAMENTO`. |
| `[].origem` | enum | sim | `REGISTRADO` é um evento gravado e imutável; `CALCULADO` sai da situação na `dataReferencia` e não é gravado. Valores: `REGISTRADO`, `CALCULADO`. Ex.: `REGISTRADO`. |
| `[].dataEfeito` | string:date | sim | Dia em que o fato vale (a `dataPagamento`, nos pagamentos). Ex.: `2026-12-10`. |
| `[].registradoEm` | string:date-time | não | Momento do registro, em UTC. Só nos eventos gravados. Ex.: `2026-12-10T13:20:05Z`. |
| `[].valor` | object | não | Dinheiro recebido no evento. Não existe no registro da operação nem no encerramento automático (RN-19). Ex.: `500`. |
| `[].identificadorPagamento` | string | não | Só aparece quando foi enviado. Ex.: `app-7f3a91`. |
| `[].origemPagamento` | string | não | Quem pagou ou por onde (`CLIENTE`, `INSS`…). Só aparece quando foi enviada. Ex.: `CLIENTE`. |
| `[].numeroParcela` | integer | não | Parcela do item calculado `PARCELA_VENCIDA`. Ex.: `1`. |
| `[].lancamentos` | array | sim | Distribuição do dinheiro do evento. `[]` nos itens sem dinheiro. |
| `[].lancamentos[].numeroParcela` | integer | sim | Parcela atingida. Nulo no lançamento da operação, que reúne as parcelas a vencer na liquidação (RN-18). Ex.: `1`. |
| `[].lancamentos[].multa` | object | sim | Ex.: `18.74`. |
| `[].lancamentos[].jurosMora` | object | sim | Ex.: `3.12`. |
| `[].lancamentos[].juros` | object | sim | Ex.: `185`. |
| `[].lancamentos[].amortizacao` | object | sim | Ex.: `293.14`. |
| `[].lancamentos[].desconto` | object | sim | Desconto da antecipação. Não é dinheiro recebido. Ex.: `0`. |
| `[].descricao` | string | não | Texto do item calculado. Ex.: `parcela 1 vencida em 2026-12-01`. |

**Resposta 400**: Identificador ou data inválidos (RN-09).

**Resposta 404**: Operação não encontrada.
