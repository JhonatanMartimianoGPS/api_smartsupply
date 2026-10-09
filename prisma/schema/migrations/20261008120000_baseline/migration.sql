-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('super_admin', 'admin', 'gestor', 'suprimentos', 'assistente', 'colaborador');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pendente', 'aprovado', 'rejeitado', 'entregue', 'cancelado');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('aberto', 'em_atendimento', 'fluxo_definido', 'aguardando_terceiro', 'concluido', 'cancelado');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('baixa', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "GrupoVisualizacao" AS ENUM ('estoque', 'inventario', 'ambas', 'operacional');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "diff_before" JSONB,
    "diff_after" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "regional_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "external_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "regional_id" TEXT NOT NULL,
    "category_id" TEXT,
    "total_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unlimited_budget" BOOLEAN NOT NULL DEFAULT false,
    "allow_extra_order" BOOLEAN NOT NULL DEFAULT true,
    "allow_custom_prices" BOOLEAN NOT NULL DEFAULT false,
    "allow_unlimited_items_solicitation" BOOLEAN NOT NULL DEFAULT false,
    "max_items_per_solicitation" INTEGER,
    "budget_locked" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "external_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_budget_periods" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "period_month" TEXT NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budget_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_product_category_budgets" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "product_category_id" TEXT NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_product_category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_product_category_budget_periods" (
    "id" TEXT NOT NULL,
    "contract_product_category_budget_id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "period_month" TEXT NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_product_category_budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_category_product_category_links" (
    "id" TEXT NOT NULL,
    "contract_category_id" TEXT NOT NULL,
    "product_category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_category_product_category_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pendente',
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "is_extra_order" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "product_name_snapshot" TEXT,
    "product_codigo_snapshot" TEXT,
    "product_unidade_snapshot" TEXT,
    "product_categoria_snapshot" TEXT,
    "product_fornecedor_snapshot" TEXT,
    "product_tabela_snapshot" DECIMAL(10,2),
    "product_image_url_snapshot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "old_status" "OrderStatus",
    "new_status" "OrderStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_delivery_divergences" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_delivery_divergences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_issue_reports" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "reported_by_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "icon" TEXT,
    "description" TEXT,
    "external_key" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "codigo" TEXT,
    "descricao" TEXT,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "tabela" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "regional_id" TEXT,
    "supplier_id" TEXT,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_history" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "razao_social" TEXT,
    "trade_name" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "telefone" TEXT,
    "contato_nome" TEXT,
    "observacoes" TEXT,
    "zip_code" TEXT,
    "state" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "address_number" TEXT,
    "address_complement" TEXT,
    "external_key" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registered_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_service_regionals" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "regional_id" TEXT NOT NULL,
    "delivery_lead_time_days" INTEGER,
    "min_delivery_value" DECIMAL(12,2) DEFAULT 0,
    "freight_value" DECIMAL(12,2) DEFAULT 0,
    "min_order_value" DECIMAL(10,2),
    "free_shipping_threshold" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_service_regionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitations" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "step" TEXT NOT NULL DEFAULT 'gestor',
    "notes" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitation_items" (
    "id" TEXT NOT NULL,
    "solicitation_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitation_history" (
    "id" TEXT NOT NULL,
    "solicitation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "step" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_grupos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "visualizacao" "GrupoVisualizacao" NOT NULL DEFAULT 'ambas',
    "regional_id" TEXT,
    "contract_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_centros_distribuicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "responsavel" TEXT,
    "telefone" TEXT,
    "grupo_id" TEXT,
    "regional_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_centros_distribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locais_armazenamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "observacoes" TEXT,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "grupo_id" TEXT,
    "centro_distribuicao_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_locais_armazenamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_produtos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "custo_unitario_inicial" DECIMAL(10,2),
    "unidade_medida" TEXT NOT NULL,
    "foto_url" TEXT,
    "bridge_product_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_entradas" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custo_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "nota_fiscal" TEXT,
    "dias_entrega" INTEGER,
    "local_armazenamento_id" TEXT,
    "centro_distribuicao_id" TEXT,
    "fornecedor_id" TEXT,
    "registrado_por_user_id" TEXT,
    "origem_sistema" TEXT,
    "origem_bridge_order_id" TEXT,
    "origem_bridge_order_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_saidas" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custo_unitario" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "nota_fiscal" TEXT,
    "local_armazenamento_id" TEXT,
    "centro_distribuicao_id" TEXT,
    "retirado_por_id" TEXT,
    "registrado_por_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_saidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_patrimonio_itens" (
    "id" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,
    "patrimonio" TEXT NOT NULL,
    "tipo_item" TEXT NOT NULL,
    "serial" TEXT,
    "descricao" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "valor_original" DECIMAL(10,2),
    "foto_url" TEXT,
    "data_aquisicao" TIMESTAMP(3),
    "sistema_operacional" TEXT,
    "responsavel_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_patrimonio_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_inventario_fluxos" (
    "id" TEXT NOT NULL,
    "inventario_item_id" TEXT NOT NULL,
    "tipo_fluxo" TEXT NOT NULL,
    "status_fluxo" TEXT NOT NULL DEFAULT 'ativo',
    "etapa_atual" TEXT,
    "motivo_inicial" TEXT,
    "observacoes" TEXT,
    "iniciado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_inventario_fluxos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_inventario_fluxo_eventos" (
    "id" TEXT NOT NULL,
    "fluxo_id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "etapa_codigo" TEXT NOT NULL,
    "etapa_nome" TEXT NOT NULL,
    "status_evento" TEXT NOT NULL DEFAULT 'concluido',
    "ocorrido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "observacao" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_inventario_fluxo_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_modules_config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_modules_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "minimum_client_version" TEXT NOT NULL DEFAULT '1.0.0',
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "city" TEXT,
    "region" TEXT,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "regional_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sla_hours" INTEGER NOT NULL DEFAULT 48,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "regional_id" TEXT NOT NULL,
    "type_id" TEXT,
    "flow_id" TEXT,
    "supplier_id" TEXT,
    "supplier_name_snapshot" TEXT,
    "created_by" TEXT NOT NULL,
    "assigned_to" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'aberto',
    "priority" "TicketPriority" NOT NULL DEFAULT 'media',
    "sla_hours" INTEGER NOT NULL DEFAULT 48,
    "final_cost" DECIMAL(10,2),
    "auto_sync_cost" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_steps" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT,
    "file_size" INTEGER,
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_products" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name_snapshot" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AppRole" NOT NULL DEFAULT 'colaborador',
    "department" TEXT,
    "cargo" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "tax_id" TEXT,
    "external_key" TEXT,
    "external_integration_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regionals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "external_key" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_regionals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "regional_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_regionals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_contracts_user_id_contract_id_key" ON "user_contracts"("user_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_budget_periods_contract_id_period_month_key" ON "contract_budget_periods"("contract_id", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "contract_product_category_budgets_contract_id_product_categ_key" ON "contract_product_category_budgets"("contract_id", "product_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_product_category_budget_periods_contract_product_c_key" ON "contract_product_category_budget_periods"("contract_product_category_budget_id", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "contract_category_product_category_links_contract_category__key" ON "contract_category_product_category_links"("contract_category_id", "product_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_post_likes_post_id_user_id_key" ON "feed_post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "orders_contract_id_status_created_at_idx" ON "orders"("contract_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_mes_ano_idx" ON "orders"("status", "mes", "ano");

-- CreateIndex
CREATE INDEX "orders_created_by_idx" ON "orders"("created_by");

-- CreateIndex
CREATE INDEX "order_items_order_id_product_id_idx" ON "order_items"("order_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_code_key" ON "product_categories"("code");

-- CreateIndex
CREATE INDEX "products_regional_id_category_id_active_idx" ON "products"("regional_id", "category_id", "active");

-- CreateIndex
CREATE INDEX "products_codigo_idx" ON "products"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "registered_suppliers_cnpj_key" ON "registered_suppliers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_service_regionals_supplier_id_regional_id_key" ON "supplier_service_regionals"("supplier_id", "regional_id");

-- CreateIndex
CREATE INDEX "stock_centros_distribuicao_regional_id_contract_id_idx" ON "stock_centros_distribuicao"("regional_id", "contract_id");

-- CreateIndex
CREATE INDEX "stock_locais_armazenamento_centro_distribuicao_id_idx" ON "stock_locais_armazenamento"("centro_distribuicao_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_produtos_codigo_key" ON "stock_produtos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "stock_patrimonio_itens_patrimonio_key" ON "stock_patrimonio_itens"("patrimonio");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "service_tickets_regional_id_contract_id_status_idx" ON "service_tickets"("regional_id", "contract_id", "status");

-- CreateIndex
CREATE INDEX "service_tickets_created_by_idx" ON "service_tickets"("created_by");

-- CreateIndex
CREATE INDEX "service_tickets_assigned_to_idx" ON "service_tickets"("assigned_to");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "regionals_code_key" ON "regionals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_regionals_user_id_regional_id_key" ON "user_regionals"("user_id", "regional_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_categories" ADD CONSTRAINT "contract_categories_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "contract_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contracts" ADD CONSTRAINT "user_contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contracts" ADD CONSTRAINT "user_contracts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_budget_periods" ADD CONSTRAINT "contract_budget_periods_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_product_category_budgets" ADD CONSTRAINT "contract_product_category_budgets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_product_category_budgets" ADD CONSTRAINT "contract_product_category_budgets_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_product_category_budget_periods" ADD CONSTRAINT "contract_product_category_budget_periods_contract_product__fkey" FOREIGN KEY ("contract_product_category_budget_id") REFERENCES "contract_product_category_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_category_product_category_links" ADD CONSTRAINT "contract_category_product_category_links_contract_category_fkey" FOREIGN KEY ("contract_category_id") REFERENCES "contract_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_category_product_category_links" ADD CONSTRAINT "contract_category_product_category_links_product_category__fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_comments" ADD CONSTRAINT "feed_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_comments" ADD CONSTRAINT "feed_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_delivery_divergences" ADD CONSTRAINT "order_delivery_divergences_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_issue_reports" ADD CONSTRAINT "order_issue_reports_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_service_regionals" ADD CONSTRAINT "supplier_service_regionals_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_service_regionals" ADD CONSTRAINT "supplier_service_regionals_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitations" ADD CONSTRAINT "solicitations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitations" ADD CONSTRAINT "solicitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_items" ADD CONSTRAINT "solicitation_items_solicitation_id_fkey" FOREIGN KEY ("solicitation_id") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_items" ADD CONSTRAINT "solicitation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_history" ADD CONSTRAINT "solicitation_history_solicitation_id_fkey" FOREIGN KEY ("solicitation_id") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_history" ADD CONSTRAINT "solicitation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_grupos" ADD CONSTRAINT "stock_grupos_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_grupos" ADD CONSTRAINT "stock_grupos_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_centros_distribuicao" ADD CONSTRAINT "stock_centros_distribuicao_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_centros_distribuicao" ADD CONSTRAINT "stock_centros_distribuicao_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_centros_distribuicao" ADD CONSTRAINT "stock_centros_distribuicao_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_locais_armazenamento" ADD CONSTRAINT "stock_locais_armazenamento_centro_distribuicao_id_fkey" FOREIGN KEY ("centro_distribuicao_id") REFERENCES "stock_centros_distribuicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_locais_armazenamento" ADD CONSTRAINT "stock_locais_armazenamento_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock_grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_produtos" ADD CONSTRAINT "stock_produtos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_produtos" ADD CONSTRAINT "stock_produtos_bridge_product_id_fkey" FOREIGN KEY ("bridge_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "stock_produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_local_armazenamento_id_fkey" FOREIGN KEY ("local_armazenamento_id") REFERENCES "stock_locais_armazenamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_centro_distribuicao_id_fkey" FOREIGN KEY ("centro_distribuicao_id") REFERENCES "stock_centros_distribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entradas" ADD CONSTRAINT "stock_entradas_origem_bridge_order_id_fkey" FOREIGN KEY ("origem_bridge_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "stock_produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_local_armazenamento_id_fkey" FOREIGN KEY ("local_armazenamento_id") REFERENCES "stock_locais_armazenamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_centro_distribuicao_id_fkey" FOREIGN KEY ("centro_distribuicao_id") REFERENCES "stock_centros_distribuicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_retirado_por_id_fkey" FOREIGN KEY ("retirado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_saidas" ADD CONSTRAINT "stock_saidas_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_patrimonio_itens" ADD CONSTRAINT "stock_patrimonio_itens_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_patrimonio_itens" ADD CONSTRAINT "stock_patrimonio_itens_responsavel_user_id_fkey" FOREIGN KEY ("responsavel_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_inventario_fluxos" ADD CONSTRAINT "stock_inventario_fluxos_inventario_item_id_fkey" FOREIGN KEY ("inventario_item_id") REFERENCES "stock_patrimonio_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_inventario_fluxo_eventos" ADD CONSTRAINT "stock_inventario_fluxo_eventos_fluxo_id_fkey" FOREIGN KEY ("fluxo_id") REFERENCES "stock_inventario_fluxos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ticket_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "ticket_flows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_steps" ADD CONSTRAINT "ticket_steps_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_products" ADD CONSTRAINT "ticket_products_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_products" ADD CONSTRAINT "ticket_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_regionals" ADD CONSTRAINT "user_regionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_regionals" ADD CONSTRAINT "user_regionals_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

