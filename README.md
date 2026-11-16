# AutoGiro

Plataforma web de **financiamento de veículos**: o cliente explora o estoque, simula as parcelas e acompanha as operações contratadas, com pagamentos, atrasos e encargos.

O foco desta etapa é um **front-end completo e organizado**, já ligado a um back-end real de operações e com o banco de dados relacional modelado.

## Veja funcionando

**Site publicado:** [autogiroproject-s.vercel.app](https://autogiroproject-s.vercel.app)

A versão publicada usa dados simulados (mock) para veículos e operações, porque o back-end de operações roda localmente. Para ver a integração real, siga o passo a passo de [Como rodar](#como-rodar).

## O que foi feito

### Veículos e simulador
- Vitrine com busca por marca ou modelo, categorias em um toque, preço máximo e ordenação.
- **Favoritos** (ficam salvos no navegador) e **comparador** de até 3 veículos lado a lado.
- Página de cada veículo com ficha técnica, opcionais, parcelas por prazo, veículos parecidos e botão de compartilhar.
- **Simulador de financiamento**: entrada (atalhos de 0% a 40%), prazo de 12 a 60 meses, **perfil de crédito A a D** e sistema **PRICE** ou **SAC**. A taxa de cada perfil é a mesma da modalidade `VEICULOS` do serviço de juros (1,50% a 3,00% ao mês).
- Seções de como funciona, tabela de taxas por perfil e perguntas frequentes.
- Resultado na hora: parcela, valor financiado, total pago, total de juros e cronograma completo. Os cálculos são feitos em centavos inteiros, e a última parcela zera o saldo ao centavo.

### Minhas operações (integrado ao back-end)
- Lista de operações com busca por número e filtro por situação (em dia, em atraso, inadimplente, liquidada).
- Detalhe da operação em três abas: **Resumo** (saldo devedor, valor para quitar, taxas e CET), **Parcelas** (situação, atraso e encargos) e **Histórico** (linha do tempo).
- **Pagamento de parcela** com confirmação e a divisão do valor entre multa, juros de mora, juros e amortização.
- **Data de referência** global: permite simular o atraso e os encargos em qualquer data.

### Qualidade da interface
- Estados de carregamento (skeletons), erro (com "Tentar de novo") e lista vazia em todas as telas.
- Responsivo, com modo claro e escuro automático, navegação por teclado e rótulos de acessibilidade.
- Reenvio seguro de pagamentos: cada tentativa leva um identificador próprio para evitar duplicidade.

### Banco de dados
Modelo relacional em PostgreSQL (Supabase) com 6 tabelas, restrições de integridade e segurança por linha (RLS):

| Tabela | Conteúdo |
|---|---|
| `veiculos` | Catálogo de veículos |
| `clientes` | Cadastro ligado ao login do Supabase |
| `simulacoes` | Simulações geradas (valores, prazo, taxa, sistema, totais) |
| `simulacao_parcelas` | Cronograma de cada simulação |
| `propostas` | Pedido do cliente, com vínculo à operação (`numero_operacao`) |
| `proposta_eventos` | Histórico de status, gerado automaticamente |

O cliente só enxerga os próprios dados e não consegue aprovar a própria proposta. O script completo está em [`docs/autogiro-schema.sql`](docs/autogiro-schema.sql).

## Arquitetura

O front não chama a API diretamente: tudo passa por uma camada de serviços, que escolhe entre dados simulados (mock) e API real por variável de ambiente. Assim, trocar de mock para back-end não exige mexer nas telas.

```
Tela (pages)  →  Hook (useAsync)  →  Serviço  →  mock  ou  httpClient  →  API
```

```
src/
├── App.jsx                     # navegação e data de referência
├── pages/                      # Veículos, Operações, Detalhe da operação
├── components/
│   ├── ui/                     # Skeleton, mensagens de erro e vazio
│   ├── vehicles/               # cartão, filtros e simulador
│   └── operacoes/              # situação, pagamento de parcela
├── hooks/                      # useAsync, useDebounce, useHashRoute
├── services/
│   ├── api/                    # contratos, endpoints e cliente HTTP
│   ├── mocks/                  # dados simulados no mesmo formato da API
│   ├── operacaoService.js      # operações (mock ou API real)
│   ├── vehicleService.js       # catálogo
│   └── simulacaoService.js     # cálculo PRICE e SAC
├── config/env.js               # variáveis de ambiente
├── utils/                      # formatação de moeda, datas e rótulos
└── styles/                     # tokens de design e estilos globais
```

## Tecnologias

- **Front-end:** React 18 e Vite (JavaScript), CSS próprio, sem bibliotecas de interface.
- **Back-end de operações:** [financial-operations-service](https://github.com/unicsul-finops/financial-operations-service) (Go, Gin e PostgreSQL), com contratos documentados em OpenAPI.
- **Banco do AutoGiro:** Supabase (PostgreSQL).
- **Publicação:** Vercel, a partir deste repositório. A cada atualização enviada ao GitHub, o site é publicado de novo.

## Como rodar

Pré-requisito: Node.js (versão LTS).

```bash
npm install
cp .env.example .env     # no Windows (PowerShell): Copy-Item .env.example .env
npm run dev
```

Abra `http://localhost:5173`. Com o `.env` padrão, tudo funciona com dados simulados.

### Usando o back-end real de operações

1. Suba o serviço com Docker: `docker compose up -d --build` na pasta do `financial-operations-service`.
2. Registre uma operação de exemplo pelo Swagger (`http://localhost:8083/swagger`, rota `POST /operacoes`).
3. No `.env` do AutoGiro, troque `VITE_MOCK_OPERACOES` para `false`.
4. Reinicie o `npm run dev`.

### Variáveis de ambiente

| Variável | Padrão | Função |
|---|---|---|
| `VITE_MOCK_VEHICLES` | `true` | Usa o catálogo simulado |
| `VITE_MOCK_OPERACOES` | `true` | `false` usa o serviço de operações real |
| `VITE_MOCK_CREDITO` | `true` | `false` lê as taxas por perfil do serviço de juros |
| `VITE_API_URL` | `http://localhost:8083` | Endereço do serviço de operações |
| `VITE_JUROS_URL` | `http://localhost:3000` | Endereço do serviço de juros |

## Integração com o serviço de operações

| Tela | Endpoint |
|---|---|
| Lista de operações | `GET /operacoes` |
| Resumo | `GET /operacoes/:id/resumo` |
| Parcelas | `GET /operacoes/:id/parcelas` |
| Histórico | `GET /operacoes/:id/historico` |
| Pagar parcela | `POST /operacoes/:id/parcelas/:numero/pagamentos` |

Referência completa dos campos, tipos e regras: [`docs/API.md`](docs/API.md).

## Contrato da API do AutoGiro

O contrato do nosso próprio back-end está em [`docs/autogiro-api.openapi.yaml`](docs/autogiro-api.openapi.yaml) (OpenAPI 3.0). Abra em [editor.swagger.io](https://editor.swagger.io) para ver as rotas, os campos e os exemplos. Ele cobre catálogo, simulação, política de crédito, cliente, propostas, análise de crédito e contratação, e já está alinhado ao serviço de juros. Os trechos de Score e Decisão estão marcados como pendentes até o outro grupo enviar o contrato deles.

## Decisões de projeto

- **Dinheiro sem erro de arredondamento:** o simulador calcula em centavos inteiros, e a API usa decimais exatos.
- **Uma fonte da verdade:** parcelas e pagamentos ficam no serviço de operações; o banco do AutoGiro guarda apenas o vínculo (`numero_operacao`).
- **Mock com o mesmo formato da API:** as telas foram validadas antes do back-end existir e continuaram iguais depois da integração.
- **Segurança no banco:** regras por linha (RLS) e privilégios mínimos, para que decisões como aprovar uma proposta fiquem só no back-end.

## Próximos passos

- Ligar o catálogo de veículos ao Supabase e salvar as simulações.
- Login de clientes e criação de propostas a partir de uma simulação.
- Telas de amortização antecipada e de liquidação da operação.
- Integração com a esteira de crédito (score, decisão e juros) para analisar o financiamento antes da contratação.

## Equipe

Preencha com os nomes dos integrantes e a instituição.
