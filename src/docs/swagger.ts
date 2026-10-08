import { env } from "../config/env.js";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "GPS Bridge — Corporate Enterprise API",
    version: "1.0.0",
    description: `
API REST Corporativa do ecossistema **GPS Bridge**.

### Principais Capacidades:
- **Gestão de Suprimentos & Pedidos Mensais**: Controle orçamentário por contrato, regras de aprovação e sincronização com ERP.
- **Módulo de Estoque Unificado**: Multi-regional, centros de custo por contrato, controle de saldos por lote, FIFO e confirmação automática de recebimento de pedidos do Bridge.
- **Central de Chamados de Serviços**: Atendimento, SLAs corporativos, histórico e anexos.
- **Governança & Trilha de Auditoria (SOX / LGPD)**: Registro imutável de todas as mutações e acessos com IP, User-Agent e diff de alterações.
- **Segurança RBAC de Nível Empresarial**: \`super_admin\`, \`admin\`, \`gestor\`, \`assistente\` e \`colaborador\`.
    `,
    contact: {
      name: "Engenharia de Software GPS SA",
      email: "ti.suporte@gpssa.com.br",
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 3000}/api/v1`,
      description: "Servidor de Desenvolvimento Local",
    },
    {
      url: "/api/v1",
      description: "Servidor Atual (Relativo)",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Insira seu token JWT obtido no endpoint de login no formato: Bearer <seu_token>",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 400 },
          message: { type: "string", example: "Dados de requisição inválidos" },
          error: { type: "string", example: "Bad Request" },
          details: { type: "array", items: { type: "object" } },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@gpssa.com.br" },
          password: { type: "string", format: "password", example: "admin123" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string" },
              nome: { type: "string" },
              role: { type: "string", enum: ["super_admin", "admin", "gestor", "assistente", "colaborador"] },
            },
          },
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "integer", example: 86400 },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          user_id: { type: "string", format: "uuid", nullable: true },
          user_email: { type: "string", nullable: true },
          action: { type: "string", example: "LOGIN" },
          entity: { type: "string", example: "Auth" },
          entity_id: { type: "string", nullable: true },
          details: { type: "string" },
          diff_before: { type: "object", nullable: true },
          diff_after: { type: "object", nullable: true },
          ip_address: { type: "string", nullable: true },
          user_agent: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AuditLogResponse: {
        type: "object",
        properties: {
          total: { type: "integer", example: 42 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 50 },
          logs: {
            type: "array",
            items: { $ref: "#/components/schemas/AuditLog" },
          },
        },
      },
      StockDashboardResponse: {
        type: "object",
        properties: {
          totalProdutos: { type: "integer", example: 120 },
          itensAbaixoMinimo: { type: "integer", example: 4 },
          valorTotalEstoque: { type: "number", example: 45890.5 },
          entradasMes: { type: "number", example: 12500.0 },
          saidasMes: { type: "number", example: 8400.0 },
        },
      },
      StockProdutoCreate: {
        type: "object",
        required: ["codigo", "nome", "categoria", "unidadeMedida", "regionalId", "contractId"],
        properties: {
          codigo: { type: "string", example: "ELEC-001" },
          nome: { type: "string", example: "Fita Isolante 3M 20m" },
          categoria: { type: "string", example: "Elétrica" },
          unidadeMedida: { type: "string", example: "UN" },
          estoqueMinimo: { type: "number", example: 10 },
          precoMedio: { type: "number", example: 14.5 },
          regionalId: { type: "string", format: "uuid" },
          contractId: { type: "string", format: "uuid" },
        },
      },
      StockEntradaCreate: {
        type: "object",
        required: ["produtoId", "localArmazenamentoId", "quantidade", "precoUnitario"],
        properties: {
          produtoId: { type: "string", format: "uuid" },
          localArmazenamentoId: { type: "string", format: "uuid" },
          quantidade: { type: "number", example: 50 },
          precoUnitario: { type: "number", example: 13.9 },
          numeroNotaFiscal: { type: "string", example: "NF-998811" },
          fornecedor: { type: "string", example: "Distribuidora Nacional de Materiais" },
          motivo: { type: "string", example: "Reposição de estoque" },
        },
      },
      StockSaidaCreate: {
        type: "object",
        required: ["produtoId", "localArmazenamentoId", "quantidade", "tipoSaida"],
        properties: {
          produtoId: { type: "string", format: "uuid" },
          localArmazenamentoId: { type: "string", format: "uuid" },
          quantidade: { type: "number", example: 5 },
          tipoSaida: { type: "string", enum: ["consumo", "transferencia", "descarte", "ajuste"], example: "consumo" },
          finalidade: { type: "string", example: "Manutenção do posto de trabalho" },
          solicitante: { type: "string", example: "João da Silva" },
        },
      },
      StockConfirmBridgeReceipt: {
        type: "object",
        required: ["orderId", "localArmazenamentoId"],
        properties: {
          orderId: { type: "string", format: "uuid" },
          localArmazenamentoId: { type: "string", format: "uuid" },
          notaFiscal: { type: "string", example: "NF-5544" },
          fornecedor: { type: "string", example: "Fornecedor Central" },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Efetuar login e obter tokens JWT",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Autenticação bem-sucedida",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          401: {
            description: "Credenciais inválidas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Obter perfil e regionais do usuário logado",
        responses: {
          200: { description: "Perfil do usuário autenticado" },
          401: { description: "Não autorizado" },
        },
      },
    },
    "/system/audit-logs": {
      get: {
        tags: ["System"],
        summary: "Consultar trilha de auditoria corporativa (LGPD / SOX)",
        description: "Requer papel `super_admin` ou `admin`. Permite filtrar por entidade, ação, usuário ou período.",
        parameters: [
          { name: "entity", in: "query", schema: { type: "string" }, description: "Filtrar por entidade (ex: Auth, Order, Stock)" },
          { name: "action", in: "query", schema: { type: "string" }, description: "Filtrar por ação (ex: LOGIN, CREATE, APPROVE, SYNC)" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: {
          200: {
            description: "Lista paginada de logs de auditoria",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditLogResponse" },
              },
            },
          },
          403: { description: "Acesso restrito a administradores" },
        },
      },
    },
    "/stock/dashboard": {
      get: {
        tags: ["Stock"],
        summary: "Indicadores e KPIs executivos do estoque",
        parameters: [
          { name: "regional_id", in: "query", schema: { type: "string", format: "uuid" }, description: "Filtrar por regional" },
        ],
        responses: {
          200: {
            description: "Métricas consolidadas de inventário",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StockDashboardResponse" },
              },
            },
          },
        },
      },
    },
    "/stock/produtos": {
      get: {
        tags: ["Stock"],
        summary: "Listar catálogo de produtos em estoque com saldos",
        parameters: [
          { name: "regional_id", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "contract_id", in: "query", schema: { type: "string", format: "uuid" } },
        ],
        responses: { 200: { description: "Lista de produtos e quantidades" } },
      },
      post: {
        tags: ["Stock"],
        summary: "Cadastrar novo produto no estoque",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StockProdutoCreate" },
            },
          },
        },
        responses: { 201: { description: "Produto criado com sucesso" } },
      },
    },
    "/stock/entradas": {
      post: {
        tags: ["Stock"],
        summary: "Registrar entrada de materiais por Nota Fiscal / Compra",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StockEntradaCreate" },
            },
          },
        },
        responses: { 201: { description: "Entrada registrada e saldo atualizado" } },
      },
    },
    "/stock/saidas": {
      post: {
        tags: ["Stock"],
        summary: "Registrar saída simples de material (consumo / descarte)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StockSaidaCreate" },
            },
          },
        },
        responses: { 201: { description: "Saída computada via FIFO" } },
      },
    },
    "/stock/bridge-receipt": {
      post: {
        tags: ["Stock"],
        summary: "Sincronizar e dar entrada automática a partir de pedido do Bridge",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StockConfirmBridgeReceipt" },
            },
          },
        },
        responses: { 200: { description: "Itens do pedido convertidos em saldo de estoque" } },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "Listar pedidos mensais com filtros de escopo",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "contract_id", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "mes", in: "query", schema: { type: "integer" } },
          { name: "ano", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Lista de pedidos" } },
      },
    },
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "Listar chamados da Central de Serviços",
        responses: { 200: { description: "Lista de chamados" } },
      },
    },
  },
};
