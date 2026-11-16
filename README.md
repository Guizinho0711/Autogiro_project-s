# AutoGiro

Plataforma web de **financiamento de veículos**: o cliente explora o estoque, simula as parcelas e acompanha as operações contratadas, com pagamentos, atrasos e encargos.

O foco desta etapa é um **front-end completo e organizado**, já ligado a um back-end real de operações e com o banco de dados relacional modelado.

## Veja funcionando

**Site publicado:** [autogiroproject-s.vercel.app](https://autogiroproject-s.vercel.app)

Na versão publicada, o catálogo de veículos vem do banco de dados (Supabase) e tem fotos reais. As operações usam dados simulados (mock), porque o back-end de operações roda localmente. Para ver a integração real, siga o passo a passo de [Como rodar](#como-rodar).

## O que foi feito

### Veículos e simulador
- Catálogo lido do banco de dados (Supabase), com **fotos reais** de cada modelo (Wikimedia Commons, licenças livres, com link para autor e licença). Se o banco não responder, o site mostra o catálogo de exemplo.
- Vitrine com busca por marca ou modelo, categorias em um toque, preço máximo e ordenação.
- **Favoritos** (ficam salvos no navegador) e **comparador** de até 3 veículos lado a lado.
- Página de cada veículo com ficha técnica, opcionais, parcelas por prazo, veículos parecidos e botão de compartilhar.
- **Simulador de financiamento**: entrada (atalhos de 0% a 40%), prazo de 12 a 60 meses, **perfil de crédito A a D** e sistema **PRICE** ou **SAC**. A taxa de cada perfil é a mesma da modalidade `VEICULOS` do serviço de juros (1,50% a 3,00% ao mês).
- Seções de como funciona, tabela de taxas por perfil e perguntas frequentes.
- Resultado na hora: parcela, valor financiado, total pago, total de juros e cronograma completo. Os cálculos são feitos em centavos inteiros, e a última parcela zera o saldo ao centavo.

### Área do lojista (cadastro de veículos)
- Página `#/admin`, com login do Supabase. Só contas da tabela `administradores` conseguem cadastrar; quem tenta sem permissão é barrado pelo próprio banco (RLS).
- Cadastro, edição e exclusão de veículos, com envio de foto (reduzida no navegador e guardada no Supabase Storage), cor, opcionais e descrição.
- Situação de cada veículo: disponível, reservado, vendido ou oculto. Vendido e oculto saem da vitrine, mas continuam no banco.

**Como liberar um administrador:** crie a conta em `#/admin`, confirme o e-mail e entre. A página mostra um comando `insert into public.administradores ...` com o seu ID. Rode esse comando no SQL Editor do Supabase e recarregue.

### Análise de crédito (integrada ao Score Engine)
- Formulário com cadastro, renda, dívidas e o financiamento desejado. Vindo da página de um veículo, o valor e a entrada já chegam preenchidos.
- Envia para o **Score Engine** (`POST /api/v1/score/evaluate`) e mostra o score de 0 a 1000, a classificação, a chance de inadimplência e o que pesou em cada um dos 4 componentes.
- Liga o score à faixa de juros (A a E) do serviço de juros e calcula a parcela real. O botão abre o simulador já com o perfil do cliente.
- Sem o Score rodando (como no site publicado), o cálculo é feito no navegador com as mesmas regras do modelo `SCORE_PF v1.1.0`. A conta foi comparada com o código Java do Score em 5.000 casos, sem nenhuma diferença.

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
Modelo relacional em PostgreSQL (Supabase) com 7 tabelas, restrições de integridade e segurança por linha (RLS):

| Tabela | Conteúdo |
|---|---|
| `veiculos` | Catálogo de veículos, com foto, cor, opcionais e descrição |
| `administradores` | Contas que podem cadastrar veículos |
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

### Usando o Score Engine real

1. Na pasta do [Score-Engine](https://github.com/viniciusgm25/Score-Engine), crie o `.env` a partir do `.env.exemplo` e preencha a senha do PostgreSQL.
2. Se a Decisão (porta 8081) não estiver rodando, coloque `DECISION_ENABLED=false` nesse `.env`. Sem isso, o Score responde erro ao tentar avisar a Decisão.
3. Rode `mvn spring-boot:run` na raiz do Score. Ele sobe na porta 8080 e já libera chamadas de `localhost`.
4. No `.env` do AutoGiro, troque `VITE_MOCK_SCORE` para `false` e reinicie o `npm run dev`.

### Variáveis de ambiente

| Variável | Padrão | Função |
|---|---|---|
| `VITE_MOCK_VEHICLES` | `false` | `true` usa só o catálogo de exemplo, sem o banco |
| `VITE_SUPABASE_URL` | URL do projeto | Endereço do Supabase |
| `VITE_SUPABASE_KEY` | chave publicável | Chave pública do Supabase (pode ficar no site; quem protege os dados são as regras do banco) |
| `VITE_MOCK_OPERACOES` | `true` | `false` usa o serviço de operações real |
| `VITE_MOCK_CREDITO` | `true` | `false` lê as taxas por perfil do serviço de juros |
| `VITE_MOCK_SCORE` | `true` | `false` usa o Score Engine real |
| `VITE_SCORE_URL` | `http://localhost:8080` | Endereço do Score Engine |
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

O contrato do nosso próprio back-end está em [`docs/autogiro-api.openapi.yaml`](docs/autogiro-api.openapi.yaml) (OpenAPI 3.0). Abra em [editor.swagger.io](https://editor.swagger.io) para ver as rotas, os campos e os exemplos. Ele cobre catálogo, simulação, política de crédito, cliente, propostas, análise de crédito e contratação, e já está alinhado ao serviço de juros. O Score já está documentado com os campos reais; só a Decisão continua marcada como pendente até o contrato dela chegar.

## Decisões de projeto

- **Dinheiro sem erro de arredondamento:** o simulador calcula em centavos inteiros, e a API usa decimais exatos.
- **Uma fonte da verdade:** parcelas e pagamentos ficam no serviço de operações; o banco do AutoGiro guarda apenas o vínculo (`numero_operacao`).
- **Mock com o mesmo formato da API:** as telas foram validadas antes do back-end existir e continuaram iguais depois da integração.
- **Segurança no banco:** regras por linha (RLS) e privilégios mínimos, para que decisões como aprovar uma proposta fiquem só no back-end.

## Próximos passos

- Salvar as simulações no Supabase.
- Login de clientes e criação de propostas a partir de uma simulação.
- Telas de amortização antecipada e de liquidação da operação.
- Integração com a Decisão, assim que o contrato dela chegar, e com o serviço de juros para contratar a operação.

## Equipe

Preencha com os nomes dos integrantes e a instituição.


openapi: 3.0.3
info:
  title: AutoGiro API
  version: 1.0.0
  description: |-
    Contrato da API do AutoGiro (financiamento de veículos). Fonte da verdade para o front-end e o back-end.

    **Convenções**
    - Dinheiro: número decimal com 2 casas (`58900.00`), nunca texto.
    - Taxas: sempre em percentual, na entrada e na saída (`1.8` = 1,8% ao mês). Os campos terminam em `Percentual`.
    - Datas e horas: ISO 8601 em UTC (`2026-11-16T12:00:00Z`).
    - Identificadores: UUID.
    - Erros: corpo `{ "erro", "codigo", "detalhes" }`.
    - Cadastro de veículos: só administradores (tabela `administradores`), pela área do lojista. Hoje o site grava direto no Supabase, protegido pelas regras de acesso (RLS) do banco.
    - Autenticação: `Authorization: Bearer <token>` (login do Supabase). Só o catálogo, a política de crédito e o `/health` são públicos.
    - Os nomes dos campos seguem as tabelas do banco (`autogiro-schema.sql`).

    **Fluxo completo**
    1. O cliente escolhe um veículo e simula (`POST /simulacoes`) com um perfil de crédito estimado (faixa A a D).
    2. Cria a proposta (`POST /propostas`) e envia (`POST /propostas/{id}/envio`).
    3. O back-end faz a análise de crédito (`POST /propostas/{id}/analise-credito`): Score, Decisão e, se aprovada, Juros.
    4. O cliente escolhe PRICE ou SAC (`POST /propostas/{id}/contratacao`). A operação nasce no serviço de operações e a proposta guarda o `numeroOperacao`.
    5. Parcelas, pagamentos, amortização e liquidação passam a ser consultados no serviço de operações.

    **Integrações** (só o back-end do AutoGiro as chama)
    - Serviço de juros (`calculo-juros-facul`, Express, porta 3000, CORS liberado): `POST /api/operacoes` simula PRICE e SAC com IOF e CET; `POST /api/operacoes/{id}/definicao` escolhe o sistema e envia a operação ao serviço de operações. Modalidade usada: `VEICULOS`, com prazo de 12 a 60 meses e taxa por faixa de score (tabela atual: 1,50% a 3,00% ao mês; a faixa E, score abaixo de 200, é recusada). O `identificador` da operação segue o formato `OP-AAAA-NNNN`.
    - Serviço de operações (`financial-operations-service`, Go, porta 8083): parcelas, pagamentos, amortização e liquidação, consultados pelo `numeroOperacao`.
    - Score Engine (`viniciusgm25/Score-Engine`, Java/Spring, porta 8080): `POST /api/v1/score/evaluate` calcula o score (0 a 1000) com 4 componentes e já envia o resultado à Decisão (`POST :8081/api/v1/decisao`). Erros: `{ status, error, message }`.
    - Decisão (porta 8081): contrato ainda não recebido.

    **Estado atual:** enquanto o back-end do AutoGiro não existe, o front chama direto o serviço de operações e o Score Engine, e usa a política de crédito de referência (a mesma tabela do serviço de juros).

    **Pendente:** o contrato da Decisão. Os trechos marcados com `x-pendente` podem mudar quando ele chegar.
servers:
- url: http://localhost:3001
  description: Desenvolvimento local
tags:
- name: Veículos
  description: Catálogo público
- name: Crédito
  description: 'Política de crédito: prazos e taxas por perfil'
- name: Simulações
  description: Cálculo PRICE e SAC
- name: Clientes
  description: Cadastro do usuário logado
- name: Propostas
  description: Pedido de financiamento e análise de crédito
- name: Sistema
paths:
  /health:
    get:
      tags:
      - Sistema
      summary: Verifica se a API está no ar
      security: []
      responses:
        '200':
          description: Serviço no ar.
          content:
            application/json:
              schema:
                type: object
                required:
                - status
                properties:
                  status:
                    type: string
                    example: ok
  /veiculos:
    get:
      tags:
      - Veículos
      summary: Lista veículos com filtros, ordenação e paginação
      security: []
      parameters:
      - name: busca
        in: query
        schema:
          type: string
        description: Marca, modelo ou versão.
      - name: categoria
        in: query
        schema:
          $ref: '#/components/schemas/CategoriaVeiculo'
      - name: precoMax
        in: query
        schema:
          type: number
          minimum: 0
      - name: ordenacao
        in: query
        schema:
          type: string
          enum:
          - menor_preco
          - maior_preco
          - mais_novo
          - menor_km
          default: menor_preco
      - name: pagina
        in: query
        schema:
          type: integer
          minimum: 1
          default: 1
      - name: tamanhoPagina
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 50
          default: 12
      responses:
        '200':
          description: Página de veículos (somente disponíveis e reservados).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListaVeiculos'
        '400':
          $ref: '#/components/responses/Invalido'
  /veiculos/{id}:
    get:
      tags:
      - Veículos
      summary: Detalhe de um veículo
      security: []
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Veículo.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Veiculo'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /simulacoes:
    post:
      tags:
      - Simulações
      summary: Calcula e registra uma simulação
      description: O servidor recalcula tudo. Valores enviados pelo cliente além dos campos abaixo são ignorados.
        A taxa vem da política de crédito (`GET /credito/politica`) para a faixa informada.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SimulacaoRequest'
      responses:
        '201':
          description: Simulação criada, com o cronograma completo.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Simulacao'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /simulacoes/{id}:
    get:
      tags:
      - Simulações
      summary: Consulta uma simulação do usuário logado
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Simulação com cronograma.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Simulacao'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /credito/politica:
    get:
      tags:
      - Crédito
      summary: Política de crédito para veículos (prazos e taxa por faixa de score)
      description: Repassa a modalidade `VEICULOS` do serviço de juros (`GET /api/modalidades/VEICULOS`). O simulador
        do site usa esta tabela.
      security: []
      responses:
        '200':
          description: Política vigente.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PoliticaCredito'
  /clientes/me:
    get:
      tags:
      - Clientes
      summary: Cadastro do usuário logado
      responses:
        '200':
          description: Cliente.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cliente'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
    put:
      tags:
      - Clientes
      summary: Cria ou atualiza o cadastro do usuário logado
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ClienteRequest'
      responses:
        '200':
          description: Cadastro salvo.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Cliente'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
  /propostas:
    get:
      tags:
      - Propostas
      summary: Lista as propostas do usuário logado
      parameters:
      - name: status
        in: query
        schema:
          $ref: '#/components/schemas/StatusProposta'
      responses:
        '200':
          description: Propostas, da mais recente para a mais antiga.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Proposta'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
    post:
      tags:
      - Propostas
      summary: Cria uma proposta em rascunho
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PropostaRequest'
      responses:
        '201':
          description: Proposta criada com status RASCUNHO.
          headers:
            Location:
              description: Caminho da proposta criada.
              schema:
                type: string
                example: /propostas/0b9d6c5e-1c3a-4e0b-9d11-2f4f5b6a7c88
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Proposta'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /propostas/{id}:
    get:
      tags:
      - Propostas
      summary: Consulta uma proposta
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Proposta.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Proposta'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /propostas/{id}/envio:
    post:
      tags:
      - Propostas
      summary: Envia o rascunho (RASCUNHO para ENVIADA)
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Proposta enviada.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Proposta'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /propostas/{id}/cancelamento:
    post:
      tags:
      - Propostas
      summary: Cancela uma proposta em rascunho ou enviada
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Proposta cancelada.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Proposta'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /propostas/{id}/contratacao:
    post:
      tags:
      - Propostas
      summary: Contrata a proposta aprovada, escolhendo PRICE ou SAC
      description: |-
        Só vale para proposta `APROVADA`, com a operação já simulada no serviço de juros.
        O back-end chama `POST /api/operacoes/{id}/definicao` no serviço de juros, que registra a operação no serviço de operações.
        Em caso de sucesso, a proposta vira `CONTRATADA` e recebe o `numeroOperacao`.
        Se o envio ao serviço de operações falhar, a definição continua valendo e `operacao.registroOperacoes` indica `FALHOU` ou `PENDENTE`; o reenvio é `POST /api/operacoes/{id}/finops` no serviço de juros.
      parameters:
      - $ref: '#/components/parameters/Id'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ContratacaoRequest'
      responses:
        '200':
          description: Proposta contratada.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Contratacao'
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
        '409':
          $ref: '#/components/responses/Conflito'
        '502':
          description: O serviço de juros não respondeu.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Erro'
  /propostas/{id}/eventos:
    get:
      tags:
      - Propostas
      summary: Histórico de status da proposta
      parameters:
      - $ref: '#/components/parameters/Id'
      responses:
        '200':
          description: Eventos em ordem cronológica.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/EventoProposta'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
  /propostas/{id}/analise-credito:
    post:
      tags:
      - Propostas
      summary: 'Analisa o crédito: Score, Decisão e Juros'
      description: |-
        1. O back-end chama o Score Engine: `POST /api/v1/score/evaluate` com `tipoPessoa: PF`, o bloco `perfilPF` (os campos abaixo) e os dados da solicitação (`identificador` no formato `OP-AAAA-NNNN`, `valor` financiado, `modalidade: VEICULOS`, `prazoMeses`, `dataLiberacao`, `primeiroRelacionamento`, `amortizacao`).
        2. O próprio Score envia o resultado à Decisão. Se a Decisão estiver fora, o Score responde 500 e aqui vira 502 com `codigo: DECISAO_INDISPONIVEL`.
        3. Aprovada, a operação é criada no serviço de juros com `POST /api/operacoes`. A taxa sai da faixa em que o `scoreFinal` cai (A: 800 a 1000, B: 600 a 799, C: 400 a 599, D: 200 a 399, E: recusado).
        O navegador nunca chama o Score, a Decisão ou o Juros por este fluxo.
        `x-pendente`: só a parte da Decisão, até o contrato dela chegar.
      x-pendente: true
      parameters:
      - $ref: '#/components/parameters/Id'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AnaliseCreditoRequest'
      responses:
        '400':
          $ref: '#/components/responses/Invalido'
        '401':
          $ref: '#/components/responses/NaoAutenticado'
        '404':
          $ref: '#/components/responses/NaoEncontrado'
        '502':
          description: O Score, a Decisão ou o serviço de juros não respondeu.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Erro'
        '200':
          description: Análise concluída.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AnaliseCredito'
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  parameters:
    Id:
      name: id
      in: path
      required: true
      schema:
        type: string
        format: uuid
  responses:
    Invalido:
      description: JSON malformado ou regra de validação violada.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Erro'
          example:
            erro: Dados inválidos
            codigo: VALIDACAO
            detalhes:
            - campo: entrada
              mensagem: A entrada deve ser menor que o valor do veículo.
    NaoAutenticado:
      description: Token ausente ou inválido.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Erro'
          example:
            erro: Faça login para continuar
            codigo: NAO_AUTENTICADO
    NaoEncontrado:
      description: Recurso inexistente ou de outro usuário.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Erro'
          example:
            erro: Veículo não encontrado
            codigo: NAO_ENCONTRADO
    Conflito:
      description: Estado incompatível (proposta não aprovada ou já contratada).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Erro'
          example:
            erro: A proposta não está aprovada
            codigo: ESTADO_INVALIDO
  schemas:
    Erro:
      type: object
      required:
      - erro
      - codigo
      properties:
        erro:
          type: string
          description: Mensagem legível para o usuário.
        codigo:
          type: string
          description: 'Código estável: VALIDACAO, NAO_AUTENTICADO, NAO_ENCONTRADO, ESTADO_INVALIDO, ESTEIRA_INDISPONIVEL.'
        detalhes:
          type: array
          items:
            type: object
            required:
            - campo
            - mensagem
            properties:
              campo:
                type: string
              mensagem:
                type: string
    CategoriaVeiculo:
      type: string
      enum:
      - hatch
      - sedan
      - suv
      - picape
      - moto
    StatusProposta:
      type: string
      enum:
      - RASCUNHO
      - ENVIADA
      - EM_ANALISE
      - APROVADA
      - REPROVADA
      - CONTRATADA
      - CANCELADA
    Veiculo:
      type: object
      required:
      - id
      - marca
      - modelo
      - ano
      - quilometragem
      - preco
      - categoria
      - combustivel
      - cambio
      - cidade
      - status
      properties:
        id:
          type: string
          format: uuid
        marca:
          type: string
          example: Fiat
        modelo:
          type: string
          example: Argo
        versao:
          type: string
          nullable: true
          example: 1.0 Drive
        ano:
          type: integer
          example: 2021
        quilometragem:
          type: integer
          minimum: 0
          example: 42000
        preco:
          type: number
          format: double
          example: 58900.0
        categoria:
          $ref: '#/components/schemas/CategoriaVeiculo'
        combustivel:
          type: string
          enum:
          - flex
          - gasolina
          - diesel
          - eletrico
        cambio:
          type: string
          enum:
          - manual
          - automatico
        cidade:
          type: string
          example: São Paulo
        status:
          type: string
          enum:
          - disponivel
          - reservado
        cor:
          type: string
          nullable: true
          example: Prata
        opcionais:
          type: array
          items:
            type: string
          example:
          - Bancos de couro
          - Piloto automático
        descricao:
          type: string
          nullable: true
          maxLength: 2000
        fotoUrl:
          type: string
          format: uri
          nullable: true
          description: Sempre https. Foto enviada pelo lojista (Supabase Storage, bucket `veiculos`) ou de uma fonte
            com licença livre.
          example: https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Corolla_2.0_XEi_2022.jpg?width=960
        fotoCredito:
          type: string
          nullable: true
          example: Wikimedia Commons
        fotoFonteUrl:
          type: string
          format: uri
          nullable: true
          description: Página com autor e licença da foto.
    ListaVeiculos:
      type: object
      required:
      - itens
      - total
      - pagina
      - tamanhoPagina
      properties:
        itens:
          type: array
          items:
            $ref: '#/components/schemas/Veiculo'
        total:
          type: integer
          description: Total de veículos que atendem aos filtros.
        pagina:
          type: integer
        tamanhoPagina:
          type: integer
    SimulacaoRequest:
      type: object
      required:
      - veiculoId
      - entrada
      - prazoMeses
      - sistema
      - faixaRisco
      properties:
        veiculoId:
          type: string
          format: uuid
        entrada:
          type: number
          minimum: 0
          description: Menor que o preço do veículo.
          example: 11780.0
        prazoMeses:
          type: integer
          minimum: 12
          maximum: 60
          example: 48
          description: Limites da modalidade VEICULOS; consulte `GET /credito/politica`.
        sistema:
          type: string
          enum:
          - PRICE
          - SAC
        faixaRisco:
          type: string
          enum:
          - A
          - B
          - C
          - D
          example: B
          description: Perfil de crédito estimado. A taxa vem da política. O score real, que define a taxa final,
            só é conhecido na análise de crédito. A faixa E é recusada e não é aceita aqui.
    Parcela:
      type: object
      required:
      - numero
      - valor
      - juros
      - amortizacao
      - saldoDevedor
      properties:
        numero:
          type: integer
          minimum: 1
        valor:
          type: number
          format: double
        juros:
          type: number
          format: double
        amortizacao:
          type: number
          format: double
        saldoDevedor:
          type: number
          format: double
    Simulacao:
      type: object
      required:
      - id
      - veiculoId
      - valorVeiculo
      - entrada
      - prazoMeses
      - taxaMensalPercentual
      - sistema
      - valorFinanciado
      - primeiraParcela
      - ultimaParcela
      - totalPago
      - totalJuros
      - criadaEm
      - parcelas
      - faixaRisco
      properties:
        id:
          type: string
          format: uuid
        veiculoId:
          type: string
          format: uuid
        valorVeiculo:
          type: number
          format: double
        entrada:
          type: number
          format: double
        prazoMeses:
          type: integer
        taxaMensalPercentual:
          type: number
          example: 1.8
        sistema:
          type: string
          enum:
          - PRICE
          - SAC
        valorFinanciado:
          type: number
          format: double
          description: valorVeiculo menos entrada.
        primeiraParcela:
          type: number
          format: double
        ultimaParcela:
          type: number
          format: double
        totalPago:
          type: number
          format: double
          description: Soma das parcelas, sem a entrada.
        totalJuros:
          type: number
          format: double
        criadaEm:
          type: string
          format: date-time
        parcelas:
          type: array
          items:
            $ref: '#/components/schemas/Parcela'
        faixaRisco:
          type: string
          enum:
          - A
          - B
          - C
          - D
          description: Perfil usado na simulação. O que fica gravado é a taxa (`taxaMensalPercentual`).
    ClienteRequest:
      type: object
      required:
      - nome
      - email
      properties:
        nome:
          type: string
          minLength: 2
        email:
          type: string
          format: email
        telefone:
          type: string
          nullable: true
          example: '11999998888'
    Cliente:
      allOf:
      - $ref: '#/components/schemas/ClienteRequest'
      - type: object
        required:
        - id
        - criadoEm
        properties:
          id:
            type: string
            format: uuid
          criadoEm:
            type: string
            format: date-time
    PropostaRequest:
      type: object
      required:
      - veiculoId
      properties:
        veiculoId:
          type: string
          format: uuid
        simulacaoId:
          type: string
          format: uuid
          nullable: true
        observacao:
          type: string
          nullable: true
    Proposta:
      type: object
      required:
      - id
      - clienteId
      - veiculoId
      - status
      - criadaEm
      - atualizadaEm
      properties:
        id:
          type: string
          format: uuid
        clienteId:
          type: string
          format: uuid
        veiculoId:
          type: string
          format: uuid
        simulacaoId:
          type: string
          format: uuid
          nullable: true
        status:
          $ref: '#/components/schemas/StatusProposta'
        numeroOperacao:
          type: string
          nullable: true
          example: OP-2026-0001
          description: Preenchido pelo back-end quando a operação é registrada no serviço de operações.
        observacao:
          type: string
          nullable: true
        criadaEm:
          type: string
          format: date-time
        atualizadaEm:
          type: string
          format: date-time
    EventoProposta:
      type: object
      required:
      - id
      - status
      - criadoEm
      properties:
        id:
          type: integer
          format: int64
        status:
          $ref: '#/components/schemas/StatusProposta'
        observacao:
          type: string
          nullable: true
        criadoEm:
          type: string
          format: date-time
    AnaliseCreditoRequest:
      type: object
      description: Dados que o Score Engine usa (bloco `perfilPF`). Os nomes seguem o contrato dele; o back-end
        só repassa.
      required:
      - cpf
      - rendaMensal
      - dividaTotal
      - idade
      - estadoCivil
      - numeroDependentes
      - diasAtrasoUltimos12Meses
      - limiteRotativoUtilizado
      - limiteRotativoTotal
      - mesesNoEmpregoAtual
      - mesesRelacionamentoBanco
      properties:
        cpf:
          type: string
          pattern: ^[0-9]{11}$
          example: '52998224725'
          description: 'Só dígitos, com dígitos verificadores válidos (o serviço de juros confere). Dado pessoal:
            nunca em log.'
        rendaMensal:
          type: number
          minimum: 0
          example: 8500
        dividaTotal:
          type: number
          minimum: 0
          example: 1200
          description: Soma das dívidas em aberto.
        idade:
          type: integer
          minimum: 18
          example: 34
          maximum: 120
        estadoCivil:
          type: string
          enum:
          - SOLTEIRO
          - CASADO
          - UNIAO_ESTAVEL
          - DIVORCIADO
          - VIUVO
          example: CASADO
        numeroDependentes:
          type: integer
          minimum: 0
          example: 1
          description: Cada dependente desconta R$ 600 da renda na capacidade financeira.
        diasAtrasoUltimos12Meses:
          type: integer
          minimum: 0
          example: 0
        limiteRotativoUtilizado:
          type: number
          minimum: 0
          example: 1500
          description: Cartão e cheque especial usados.
        limiteRotativoTotal:
          type: number
          minimum: 0
          example: 6000
        mesesNoEmpregoAtual:
          type: integer
          minimum: 0
          example: 36
        mesesRelacionamentoBanco:
          type: integer
          minimum: 0
          example: 48
          description: '0 envia `primeiroRelacionamento: true` ao Score.'
        forcarRecalculo:
          type: boolean
          default: false
          description: O Score reaproveita um resultado de até 30 dias para os mesmos dados; true força um cálculo
            novo.
    AnaliseCredito:
      type: object
      required:
      - identificadorOperacao
      - score
      - perfilJuros
      properties:
        identificadorOperacao:
          type: string
          example: OP-2026-0001
          description: Identificador da operação criada no serviço de juros, quando a análise é aprovada.
        score:
          type: object
          description: Resposta do Score Engine, sem os dados pessoais.
          required:
          - scoreFinal
          - faixaRisco
          - probabilidadeDefault
          - modelo
          - origem
          - componentes
          properties:
            scoreFinal:
              type: integer
              minimum: 0
              maximum: 1000
              example: 872
            faixaRisco:
              type: string
              enum:
              - EXCELENTE
              - BOM
              - REGULAR
              - CRITICO
              description: 'Classificação do Score: 701+, 501+, 301+ e abaixo. Não é a faixa de juros.'
            probabilidadeDefault:
              type: number
              example: 0.0128
              description: 'Fração: (1000 - score) / 10000, mínimo 0,001.'
            modelo:
              type: object
              properties:
                codigo:
                  type: string
                  example: SCORE_PF
                versao:
                  type: string
                  example: v1.1.0
            origem:
              type: string
              enum:
              - CALCULO
              - BANCO
              description: BANCO = resultado salvo dos últimos 30 dias.
            calculatedAt:
              type: string
              format: date-time
            componentes:
              type: array
              items:
                $ref: '#/components/schemas/ComponenteScore'
            fatoresImpacto:
              type: array
              items:
                type: string
        perfilJuros:
          type: object
          description: Faixa de juros (serviço de juros) em que o scoreFinal cai.
          properties:
            faixa:
              type: string
              enum:
              - A
              - B
              - C
              - D
              - E
            taxaMensalPercentual:
              type: number
              nullable: true
              example: 1.5
            permiteContratacao:
              type: boolean
        decisao:
          type: object
          properties:
            status:
              type: string
              enum:
              - APROVADO
              - REPROVADO
              - ANALISE_MANUAL
            motivo:
              type: string
          x-pendente: true
          description: Formato provisório até a Decisão enviar o contrato.
    FaixaCredito:
      type: object
      required:
      - faixa
      - scoreMin
      - scoreMax
      - taxaMensalPercentual
      - taxaAnualPercentual
      - descricao
      - permiteContratacao
      properties:
        faixa:
          type: string
          enum:
          - A
          - B
          - C
          - D
          - E
        scoreMin:
          type: integer
          example: 800
        scoreMax:
          type: integer
          example: 1000
        taxaMensalPercentual:
          type: number
          nullable: true
          example: 1.5
          description: Nulo na faixa E (contratação recusada).
        taxaAnualPercentual:
          type: number
          nullable: true
          example: 19.56
        descricao:
          type: string
          example: Risco muito baixo
        permiteContratacao:
          type: boolean
    PoliticaCredito:
      type: object
      required:
      - modalidade
      - prazoMinMeses
      - prazoMaxMeses
      - tetoTaxaMensalPercentual
      - faixas
      properties:
        modalidade:
          type: string
          example: VEICULOS
        prazoMinMeses:
          type: integer
          example: 12
        prazoMaxMeses:
          type: integer
          example: 60
        tetoTaxaMensalPercentual:
          type: number
          example: 3.0
        faixas:
          type: array
          items:
            $ref: '#/components/schemas/FaixaCredito'
    ContratacaoRequest:
      type: object
      required:
      - sistema
      properties:
        sistema:
          type: string
          enum:
          - PRICE
          - SAC
    Contratacao:
      type: object
      required:
      - proposta
      - operacao
      properties:
        proposta:
          $ref: '#/components/schemas/Proposta'
        operacao:
          type: object
          required:
          - numeroOperacao
          - estado
          - sistema
          - registroOperacoes
          properties:
            numeroOperacao:
              type: string
              example: OP-2026-0001
            estado:
              type: string
              enum:
              - DEFINIDA
            sistema:
              type: string
              enum:
              - PRICE
              - SAC
            registroOperacoes:
              type: string
              enum:
              - REGISTRADA
              - FALHOU
              - PENDENTE
              description: 'Situação do envio ao serviço de operações. FALHOU ou PENDENTE: a definição já vale e
                o reenvio é manual.'
    ComponenteScore:
      type: object
      required:
      - nome
      - pontuacao
      - pontuacaoMaxima
      - pesoPonderado
      - motivo
      properties:
        nome:
          type: string
          example: Histórico de Pagamento
        pontuacao:
          type: number
          example: 850
        pontuacaoMaxima:
          type: number
          example: 1000
        pesoPonderado:
          type: number
          example: 0.35
          description: 'Fração. Pesos do modelo PF: histórico 0,35, capacidade 0,30, endividamento 0,20, estabilidade
            0,15.'
        motivo:
          type: string
          example: Pontualidade integral na liquidação dos compromissos financeiros.
security:
- bearerAuth: []
