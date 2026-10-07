-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "rooms";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "stock";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "app_role" AS ENUM ('suprimentos', 'assistente', 'admin', 'super_admin', 'gestor', 'colaborador', 'comercial');

-- CreateEnum
CREATE TYPE "solicitation_status" AS ENUM ('pendente', 'aguardando_revisao', 'concluido', 'rejeitado');

-- CreateEnum
CREATE TYPE "solicitation_step" AS ENUM ('aguardando_aprovacao_gestor', 'aguardando_compra_suprimentos', 'aguardando_revisao_gestor', 'aguardando_finalizacao_suprimentos', 'concluido', 'rejeitado');

-- CreateEnum
CREATE TYPE "rooms"."access_request_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "rooms"."app_role" AS ENUM ('user', 'director', 'admin');

-- CreateEnum
CREATE TYPE "rooms"."booking_status" AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "stock"."app_role" AS ENUM ('admin', 'manager', 'user');

-- CreateEnum
CREATE TYPE "stock"."grupo_visualizacao" AS ENUM ('estoque', 'inventario', 'ambas', 'operacional');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "app_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_url" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_prospects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DF',
    "project_name" TEXT NOT NULL DEFAULT '',
    "segment" TEXT NOT NULL DEFAULT 'Geral',
    "investment_or_size" TEXT NOT NULL DEFAULT '',
    "demanded_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tier" TEXT NOT NULL DEFAULT 'Tier 2 (Médio Porte)',
    "fit_score" INTEGER NOT NULL DEFAULT 80,
    "estimated_monthly_ticket" DECIMAL NOT NULL DEFAULT 0,
    "pipeline_stage" TEXT NOT NULL DEFAULT 'novo_prospect',
    "sales_pitch" TEXT NOT NULL DEFAULT '',
    "suspect_lead" JSONB,
    "verified_contacts" JSONB NOT NULL DEFAULT '[]',
    "outsourcing_signal" JSONB,
    "company_details" JSONB,
    "ai_deep_investigation" JSONB,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prospect_id" UUID,
    "name" TEXT NOT NULL,
    "role_title" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prospect_id" UUID,
    "type" TEXT NOT NULL DEFAULT 'ligacao',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "interaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder_date" TIMESTAMPTZ(6),
    "is_reminder_done" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_simulations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DF',
    "segment" TEXT NOT NULL DEFAULT 'Geral',
    "postos" JSONB NOT NULL DEFAULT '[]',
    "encargos_pct" DECIMAL NOT NULL DEFAULT 78.5,
    "beneficios_por_colab" DECIMAL NOT NULL DEFAULT 650.0,
    "insumos_uniforme_mensal" DECIMAL NOT NULL DEFAULT 1800.0,
    "margem_lucro_pct" DECIMAL NOT NULL DEFAULT 14.0,
    "impostos_pct" DECIMAL NOT NULL DEFAULT 14.25,
    "total_headcount" INTEGER NOT NULL DEFAULT 0,
    "faturamento_mensal" DECIMAL NOT NULL DEFAULT 0,
    "faturamento_anual" DECIMAL NOT NULL DEFAULT 0,
    "calculation_details" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "external_key" CHAR(8),

    CONSTRAINT "regionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regional_id" UUID NOT NULL,
    "external_key" CHAR(8),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "contract_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "regional_id" UUID NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feed_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comment_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "comment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_comment_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "import_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regional_id" UUID NOT NULL,
    "external_key" CHAR(8),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_category_product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_category_id" UUID NOT NULL,
    "product_category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_category_product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID,
    "regional_id" UUID,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "product_codigo" TEXT,
    "product_name" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "contato_nome" TEXT,
    "observacoes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zip_code" CHAR(8),
    "state" CHAR(2),
    "city" CHAR(155),
    "neighborhood" CHAR(55),
    "address_number" CHAR(55),
    "address_complement" CHAR(155),
    "external_key" CHAR(8),

    CONSTRAINT "registered_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_flows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regional_id" UUID NOT NULL,
    "has_cost" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "service_ticket_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_flow_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "flow_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_ticket_flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regional_id" UUID NOT NULL,
    "sla_days" INTEGER,

    CONSTRAINT "service_ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_service_regionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "regional_id" UUID NOT NULL,
    "delivery_lead_time_days" INTEGER,
    "min_delivery_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freight_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_service_regionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_ai_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "system_prompt" TEXT NOT NULL,
    "active_model" TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    "temperature" DECIMAL NOT NULL DEFAULT 0.6,
    "max_tokens" INTEGER NOT NULL DEFAULT 1024,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "fallback_models" TEXT[] DEFAULT ARRAY['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash']::TEXT[],
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),
    "updated_by" UUID,

    CONSTRAINT "system_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_module_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT 'indigo',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "system_module_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_modules_config" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "badge" TEXT,
    "updated_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),
    "updated_by" UUID,

    CONSTRAINT "system_modules_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "regional_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "role_label" TEXT NOT NULL,
    "bio" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "user_id" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_regionals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "regional_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_regionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "app_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."profiles" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."user_roles" (
    "user_id" UUID NOT NULL,
    "role" "stock"."app_role" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "rooms"."profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role" "rooms"."app_role" NOT NULL DEFAULT 'user',

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category_id" UUID,
    "total_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budget_locked" BOOLEAN NOT NULL DEFAULT false,
    "regional_id" UUID NOT NULL,
    "allow_extra_order" BOOLEAN NOT NULL DEFAULT false,
    "allow_unlimited_items_solicitation" BOOLEAN NOT NULL DEFAULT false,
    "max_items_per_solicitation" INTEGER NOT NULL DEFAULT 10,
    "allow_custom_prices" BOOLEAN NOT NULL DEFAULT false,
    "unlimited_budget" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_budget_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "budget_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_product_category_budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "product_category_id" UUID NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMPTZ(6),

    CONSTRAINT "contract_product_category_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_product_category_budget_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_product_category_budget_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "product_category_id" UUID NOT NULL,
    "period_month" DATE NOT NULL,
    "monthly_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_product_category_budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_issue_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "competence_month" DATE NOT NULL DEFAULT (date_trunc('month'::text, (now() AT TIME ZONE 'America/Sao_Paulo'::text)))::date,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'blocker',
    "description" TEXT NOT NULL,
    "product_details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "catalog_product_count" INTEGER,
    "catalog_total_count" INTEGER,
    "catalog_result_state" TEXT,
    "search_term" TEXT,
    "category_filter" TEXT,
    "route" TEXT NOT NULL DEFAULT 'pedido_mensal',
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolution_note" TEXT,

    CONSTRAINT "order_issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competence_month" DATE NOT NULL DEFAULT (date_trunc('month'::text, timezone('America/Sao_Paulo'::text, now())))::date,
    "is_extra_order" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_delivery_divergences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "stock_grupo_id" UUID,
    "reported_by" UUID NOT NULL,
    "competence_month" DATE NOT NULL DEFAULT (date_trunc('month'::text, (now() AT TIME ZONE 'America/Sao_Paulo'::text)))::date,
    "status" TEXT NOT NULL DEFAULT 'open',
    "items_payload" JSONB NOT NULL DEFAULT '[]',
    "divergent_items_count" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "resolution_note" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_delivery_divergences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ticket_type_id" UUID,
    "flow_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priority" TEXT NOT NULL DEFAULT 'media',
    "final_cost" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "auto_sync_cost" BOOLEAN NOT NULL DEFAULT true,
    "supplier_id" UUID,
    "supplier_name_snapshot" TEXT,

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,

    CONSTRAINT "service_ticket_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contract_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "solicitation_status" NOT NULL DEFAULT 'pendente',
    "step" "solicitation_step" NOT NULL DEFAULT 'aguardando_aprovacao_gestor',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_step" "solicitation_step",

    CONSTRAINT "solicitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "allow_special_solicitation" BOOLEAN NOT NULL DEFAULT false,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMPTZ(6),
    "blocked_reason" TEXT,
    "blocked_by" UUID,
    "last_seen_at" TIMESTAMPTZ(6),
    "last_ip" TEXT,
    "last_city" TEXT,
    "last_region" TEXT,
    "last_country" TEXT,
    "last_user_agent" TEXT,
    "cpf_cnpj" CHAR(14),
    "external_key" CHAR(8),
    "external_integration_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitation_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "from_step" "solicitation_step",
    "to_step" "solicitation_step",
    "details" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."grupos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "visualizacao" "stock"."grupo_visualizacao" NOT NULL DEFAULT 'estoque',
    "bridge_regional_id" UUID,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."bridge_order_stock_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bridge_order_id" UUID NOT NULL,
    "bridge_contract_id" UUID NOT NULL,
    "stock_grupo_id" UUID NOT NULL,
    "status_recebimento" TEXT NOT NULL DEFAULT 'processado',
    "total_itens" INTEGER NOT NULL DEFAULT 0,
    "total_entradas" INTEGER NOT NULL DEFAULT 0,
    "total_produtos_criados" INTEGER NOT NULL DEFAULT 0,
    "detalhes" JSONB NOT NULL DEFAULT '{}',
    "processado_em" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processado_por_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_order_stock_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."centros_distribuicao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(200) NOT NULL,
    "endereco" VARCHAR(500),
    "responsavel" VARCHAR(200),
    "telefone" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "grupo_id" UUID NOT NULL,

    CONSTRAINT "centros_distribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."fornecedores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255),
    "telefone" VARCHAR(50),
    "observacoes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "grupo_id" UUID NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."locais_armazenamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(200) NOT NULL,
    "observacoes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "grupo_id" UUID NOT NULL,

    CONSTRAINT "locais_armazenamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."bridge_contract_stock_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bridge_contract_id" UUID NOT NULL,
    "stock_grupo_id" UUID NOT NULL,
    "default_local_armazenamento_id" UUID,
    "default_centro_distribuicao_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_contract_stock_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."produtos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(50) NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "custo_unitario_inicial" DECIMAL(10,2),
    "unidade_medida" VARCHAR(50) NOT NULL,
    "data_cadastro" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "foto_url" TEXT,
    "grupo_id" UUID NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."bridge_product_group_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bridge_product_id" UUID NOT NULL,
    "stock_grupo_id" UUID NOT NULL,
    "stock_produto_id" UUID NOT NULL,
    "origem_automatica" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_product_group_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."profissionais" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(200) NOT NULL,
    "email" VARCHAR(255),
    "telefone" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,
    "grupo_id" UUID NOT NULL,

    CONSTRAINT "profissionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."entradas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produto_id" UUID NOT NULL,
    "nota_fiscal" VARCHAR(100),
    "responsavel_id" UUID,
    "custo_unitario" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "fornecedor_id" UUID,
    "dias_entrega" INTEGER,
    "local_armazenamento_id" UUID,
    "centro_distribuicao_id" UUID,
    "total" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "registrado_por_user_id" UUID,
    "origem_sistema" TEXT,
    "origem_bridge_order_id" UUID,
    "origem_bridge_order_item_id" UUID,

    CONSTRAINT "entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."gastos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "entrada_id" UUID,
    "produto_id" UUID,
    "fornecedor_id" UUID,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."inventario_itens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grupo_id" UUID NOT NULL,
    "patrimonio" TEXT NOT NULL,
    "tipo_item" TEXT NOT NULL,
    "serial" TEXT,
    "descricao" TEXT,
    "profissional_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "foto_url" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "data_aquisicao" DATE,
    "sistema_operacional" TEXT,
    "valor_original" DECIMAL,

    CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."inventario_fluxos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventario_item_id" UUID NOT NULL,
    "tipo_fluxo" TEXT NOT NULL,
    "status_fluxo" TEXT NOT NULL DEFAULT 'ativo',
    "etapa_atual" TEXT,
    "motivo_inicial" TEXT,
    "observacoes" TEXT,
    "iniciado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrado_em" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_fluxos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."inventario_fluxo_eventos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fluxo_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "etapa_codigo" TEXT NOT NULL,
    "etapa_nome" TEXT NOT NULL,
    "status_evento" TEXT NOT NULL DEFAULT 'concluido',
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" TEXT,
    "observacao" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_fluxo_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."saidas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "data" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produto_id" UUID NOT NULL,
    "nota_fiscal" VARCHAR(100),
    "responsavel_id" UUID,
    "custo_unitario" DECIMAL(10,2) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "local_armazenamento_id" UUID,
    "centro_distribuicao_id" UUID,
    "total" DECIMAL(10,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "retirado_por_id" UUID,
    "registrado_por_user_id" UUID,

    CONSTRAINT "saidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."user_grupos" (
    "user_id" UUID NOT NULL,
    "grupo_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_grupos_pkey" PRIMARY KEY ("user_id","grupo_id")
);

-- CreateTable
CREATE TABLE "rooms"."organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."access_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "rooms"."access_request_status" NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "approved_role" "rooms"."app_role",
    "approved_organization_id" UUID,
    "auth_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."room_blocking_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_blocking_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."room_managers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_managers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "rooms"."booking_status" NOT NULL DEFAULT 'pending',
    "observation" TEXT,
    "responsible_name" TEXT,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms"."booking_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "changed_by" UUID,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "valor_unitario" DECIMAL(12,2) NOT NULL,
    "categoria" TEXT NOT NULL,
    "tabela" INTEGER NOT NULL DEFAULT 1,
    "fornecedor" TEXT,
    "cr_filial" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regional_id" UUID NOT NULL,
    "product_category_id" UUID NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_category_id_snapshot" UUID,
    "product_category_name_snapshot" TEXT,
    "product_category_import_key_snapshot" TEXT,
    "product_codigo_snapshot" TEXT,
    "product_name_snapshot" TEXT,
    "product_unidade_snapshot" TEXT,
    "product_fornecedor_snapshot" TEXT,
    "product_categoria_snapshot" TEXT,
    "product_tabela_snapshot" INTEGER,
    "product_image_url_snapshot" TEXT,
    "product_id_snapshot" UUID,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_category_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_contract_availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_contract_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_ticket_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "product_id" UUID,
    "product_name_snapshot" TEXT NOT NULL,
    "product_code_snapshot" TEXT NOT NULL,
    "product_unit_snapshot" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_price" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "product_fornecedor_snapshot" TEXT,
    "supplier_id" UUID,

    CONSTRAINT "service_ticket_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit_price" DECIMAL(12,2),

    CONSTRAINT "solicitation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_app_notifications_user_created" ON "app_notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_commercial_prospects_created" ON "commercial_prospects"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_commercial_prospects_stage" ON "commercial_prospects"("pipeline_stage");

-- CreateIndex
CREATE INDEX "idx_commercial_prospects_state" ON "commercial_prospects"("state");

-- CreateIndex
CREATE INDEX "idx_commercial_contacts_prospect" ON "commercial_contacts"("prospect_id");

-- CreateIndex
CREATE INDEX "idx_commercial_interactions_prospect" ON "commercial_interactions"("prospect_id");

-- CreateIndex
CREATE INDEX "idx_commercial_simulations_created" ON "commercial_simulations"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "regionals_name_key" ON "regionals"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regionals_code_key" ON "regionals"("code");

-- CreateIndex
CREATE INDEX "idx_contract_categories_regional_id" ON "contract_categories"("regional_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_categories_regional_id_name_key" ON "contract_categories"("regional_id", "name");

-- CreateIndex
CREATE INDEX "feed_posts_pinned_created_at_idx" ON "feed_posts"("is_pinned" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_feed_posts_regional_id" ON "feed_posts"("regional_id");

-- CreateIndex
CREATE INDEX "idx_feed_posts_user_id" ON "feed_posts"("user_id");

-- CreateIndex
CREATE INDEX "idx_feed_post_comments_post_id" ON "feed_post_comments"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_comment_likes_comment_user_unique" ON "feed_comment_likes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_product_categories_regional_id" ON "product_categories"("regional_id");

-- CreateIndex
CREATE INDEX "idx_product_categories_regional_name" ON "product_categories"("regional_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "idx_product_categories_regional_import_key" ON "product_categories"("regional_id", "import_key");

-- CreateIndex
CREATE INDEX "idx_contract_category_product_categories_contract_category" ON "contract_category_product_categories"("contract_category_id");

-- CreateIndex
CREATE INDEX "idx_contract_category_product_categories_product_category" ON "contract_category_product_categories"("product_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_category_product_cat_contract_category_id_product__key" ON "contract_category_product_categories"("contract_category_id", "product_category_id");

-- CreateIndex
CREATE INDEX "idx_product_history_created_at" ON "product_history"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_history_product_id" ON "product_history"("product_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_history_regional_id" ON "product_history"("regional_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_registered_suppliers_active" ON "registered_suppliers"("is_active");

-- CreateIndex
CREATE INDEX "idx_registered_suppliers_cnpj" ON "registered_suppliers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "service_ticket_flows_regional_name_key" ON "service_ticket_flows"("regional_id", "name");

-- CreateIndex
CREATE INDEX "idx_service_ticket_flow_steps_flow_order" ON "service_ticket_flow_steps"("flow_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_ticket_flow_steps_flow_id_step_order_key" ON "service_ticket_flow_steps"("flow_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_ticket_types_regional_name_key" ON "service_ticket_types"("regional_id", "name");

-- CreateIndex
CREATE INDEX "idx_supplier_service_regionals_regional_id" ON "supplier_service_regionals"("regional_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_service_regionals_supplier_id_regional_id_key" ON "supplier_service_regionals"("supplier_id", "regional_id");

-- CreateIndex
CREATE INDEX "team_members_display_order_idx" ON "team_members"("regional_id", "display_order", "created_at");

-- CreateIndex
CREATE INDEX "team_members_regional_id_idx" ON "team_members"("regional_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_regionals_regional_id" ON "user_regionals"("regional_id");

-- CreateIndex
CREATE INDEX "idx_user_regionals_regional_user" ON "user_regionals"("regional_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_user_regionals_user_regional" ON "user_regionals"("user_id", "regional_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_regionals_user_id_regional_id_key" ON "user_regionals"("user_id", "regional_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role" ON "user_roles"("role");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_role" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "feed_post_likes_post_user_unique" ON "feed_post_likes"("post_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "rooms"."user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "idx_contracts_category_id" ON "contracts"("category_id");

-- CreateIndex
CREATE INDEX "idx_contracts_id_regional" ON "contracts"("id", "regional_id");

-- CreateIndex
CREATE INDEX "idx_contracts_name" ON "contracts"("name");

-- CreateIndex
CREATE INDEX "idx_contracts_regional_id" ON "contracts"("regional_id");

-- CreateIndex
CREATE INDEX "idx_assistant_contracts_contract_id" ON "assistant_contracts"("contract_id");

-- CreateIndex
CREATE INDEX "idx_assistant_contracts_user_contract" ON "assistant_contracts"("user_id", "contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_contracts_user_id_contract_id_key" ON "assistant_contracts"("user_id", "contract_id");

-- CreateIndex
CREATE INDEX "idx_contract_budget_periods_composite" ON "contract_budget_periods"("contract_id", "period_month");

-- CreateIndex
CREATE INDEX "idx_contract_budget_periods_contract_period" ON "contract_budget_periods"("contract_id", "period_month" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contract_budget_periods_contract_id_period_month_key" ON "contract_budget_periods"("contract_id", "period_month");

-- CreateIndex
CREATE INDEX "idx_contract_product_category_budgets_active" ON "contract_product_category_budgets"("contract_id", "active");

-- CreateIndex
CREATE INDEX "idx_contract_product_category_budgets_contract" ON "contract_product_category_budgets"("contract_id");

-- CreateIndex
CREATE INDEX "idx_contract_product_category_budgets_product_category" ON "contract_product_category_budgets"("product_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_product_category_bud_contract_id_product_category__key" ON "contract_product_category_budgets"("contract_id", "product_category_id");

-- CreateIndex
CREATE INDEX "idx_contract_product_category_budget_periods_contract_period" ON "contract_product_category_budget_periods"("contract_id", "period_month" DESC);

-- CreateIndex
CREATE INDEX "idx_contract_product_category_budget_periods_product_category_p" ON "contract_product_category_budget_periods"("product_category_id", "period_month" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contract_product_category_bud_contract_product_category_bud_key" ON "contract_product_category_budget_periods"("contract_product_category_budget_id", "period_month");

-- CreateIndex
CREATE INDEX "idx_order_issue_reports_competence_status" ON "order_issue_reports"("competence_month" DESC, "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_issue_reports_contract_month" ON "order_issue_reports"("contract_id", "competence_month" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_issue_reports_contract_status" ON "order_issue_reports"("contract_id", "status");

-- CreateIndex
CREATE INDEX "idx_order_issue_reports_user_month" ON "order_issue_reports"("user_id", "competence_month" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_competence_month" ON "orders"("competence_month");

-- CreateIndex
CREATE INDEX "idx_orders_contract_id_status" ON "orders"("contract_id", "status");

-- CreateIndex
CREATE INDEX "idx_orders_created_at_desc" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_status_created_at" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_delivery_divergences_contract_created" ON "order_delivery_divergences"("contract_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_delivery_divergences_contract_month" ON "order_delivery_divergences"("contract_id", "competence_month" DESC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_delivery_divergences_order_id" ON "order_delivery_divergences"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_delivery_divergences_order_status" ON "order_delivery_divergences"("order_id", "status");

-- CreateIndex
CREATE INDEX "idx_order_delivery_divergences_status" ON "order_delivery_divergences"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_history_created_at" ON "order_history"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_order_history_order_id" ON "order_history"("order_id");

-- CreateIndex
CREATE INDEX "idx_service_tickets_contract_created" ON "service_tickets"("contract_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_service_tickets_flow_id" ON "service_tickets"("flow_id");

-- CreateIndex
CREATE INDEX "idx_service_tickets_status_created" ON "service_tickets"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_service_tickets_supplier_id" ON "service_tickets"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_service_tickets_ticket_type_id" ON "service_tickets"("ticket_type_id");

-- CreateIndex
CREATE INDEX "idx_service_tickets_user_created" ON "service_tickets"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_service_ticket_attachments_ticket_id" ON "service_ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_service_ticket_messages_ticket_created" ON "service_ticket_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_service_ticket_messages_user_id" ON "service_ticket_messages"("user_id");

-- CreateIndex
CREATE INDEX "idx_service_ticket_steps_ticket_order" ON "service_ticket_steps"("ticket_id", "step_order");

-- CreateIndex
CREATE UNIQUE INDEX "service_ticket_steps_ticket_id_step_order_key" ON "service_ticket_steps"("ticket_id", "step_order");

-- CreateIndex
CREATE INDEX "idx_solicitations_contract_created_at" ON "solicitations"("contract_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_solicitations_created_at_desc" ON "solicitations"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_solicitations_user_id" ON "solicitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profiles_full_name" ON "profiles"("full_name");

-- CreateIndex
CREATE INDEX "idx_profiles_is_blocked" ON "profiles"("is_blocked");

-- CreateIndex
CREATE INDEX "idx_profiles_last_seen_at" ON "profiles"("last_seen_at");

-- CreateIndex
CREATE INDEX "idx_profiles_user_id" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profiles_user_last_seen" ON "profiles"("user_id", "last_seen_at");

-- CreateIndex
CREATE INDEX "idx_solicitation_history_created_at" ON "solicitation_history"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_solicitation_history_solicitation_id" ON "solicitation_history"("solicitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupos_nome_key" ON "stock"."grupos"("nome");

-- CreateIndex
CREATE INDEX "grupos_bridge_regional_id_idx" ON "stock"."grupos"("bridge_regional_id");

-- CreateIndex
CREATE INDEX "grupos_visualizacao_idx" ON "stock"."grupos"("visualizacao");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_order_stock_receipts_bridge_order_id_key" ON "stock"."bridge_order_stock_receipts"("bridge_order_id");

-- CreateIndex
CREATE INDEX "bridge_order_stock_receipts_bridge_contract_id_idx" ON "stock"."bridge_order_stock_receipts"("bridge_contract_id");

-- CreateIndex
CREATE INDEX "bridge_order_stock_receipts_stock_grupo_id_idx" ON "stock"."bridge_order_stock_receipts"("stock_grupo_id");

-- CreateIndex
CREATE INDEX "centros_distribuicao_grupo_id_idx" ON "stock"."centros_distribuicao"("grupo_id");

-- CreateIndex
CREATE INDEX "fornecedores_grupo_id_idx" ON "stock"."fornecedores"("grupo_id");

-- CreateIndex
CREATE INDEX "locais_armazenamento_grupo_id_idx" ON "stock"."locais_armazenamento"("grupo_id");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_contract_stock_groups_bridge_contract_id_key" ON "stock"."bridge_contract_stock_groups"("bridge_contract_id");

-- CreateIndex
CREATE INDEX "bridge_contract_stock_groups_stock_grupo_id_idx" ON "stock"."bridge_contract_stock_groups"("stock_grupo_id");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_codigo_key" ON "stock"."produtos"("codigo");

-- CreateIndex
CREATE INDEX "idx_stock_produtos_grupo_id" ON "stock"."produtos"("grupo_id");

-- CreateIndex
CREATE INDEX "idx_stock_produtos_nome" ON "stock"."produtos"("nome");

-- CreateIndex
CREATE INDEX "produtos_grupo_id_idx" ON "stock"."produtos"("grupo_id");

-- CreateIndex
CREATE INDEX "bridge_product_group_products_stock_produto_id_idx" ON "stock"."bridge_product_group_products"("stock_produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "bridge_product_group_products_bridge_product_stock_group_key" ON "stock"."bridge_product_group_products"("bridge_product_id", "stock_grupo_id");

-- CreateIndex
CREATE INDEX "idx_stock_profissionais_nome" ON "stock"."profissionais"("nome");

-- CreateIndex
CREATE INDEX "profissionais_grupo_id_idx" ON "stock"."profissionais"("grupo_id");

-- CreateIndex
CREATE INDEX "entradas_origem_bridge_order_id_idx" ON "stock"."entradas"("origem_bridge_order_id");

-- CreateIndex
CREATE INDEX "entradas_origem_bridge_order_item_id_idx" ON "stock"."entradas"("origem_bridge_order_item_id");

-- CreateIndex
CREATE INDEX "entradas_registrado_por_user_id_idx" ON "stock"."entradas"("registrado_por_user_id");

-- CreateIndex
CREATE INDEX "idx_stock_entradas_data_desc" ON "stock"."entradas"("data" DESC);

-- CreateIndex
CREATE INDEX "idx_stock_entradas_produto_id" ON "stock"."entradas"("produto_id");

-- CreateIndex
CREATE INDEX "idx_gastos_data" ON "stock"."gastos"("data" DESC);

-- CreateIndex
CREATE INDEX "idx_gastos_entrada_id" ON "stock"."gastos"("entrada_id");

-- CreateIndex
CREATE INDEX "idx_gastos_fornecedor_id" ON "stock"."gastos"("fornecedor_id");

-- CreateIndex
CREATE INDEX "idx_gastos_produto_id" ON "stock"."gastos"("produto_id");

-- CreateIndex
CREATE INDEX "idx_gastos_tipo" ON "stock"."gastos"("tipo");

-- CreateIndex
CREATE INDEX "inventario_itens_grupo_id_idx" ON "stock"."inventario_itens"("grupo_id");

-- CreateIndex
CREATE INDEX "inventario_itens_profissional_id_idx" ON "stock"."inventario_itens"("profissional_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_itens_grupo_patrimonio_uq" ON "stock"."inventario_itens"("grupo_id", "patrimonio");

-- CreateIndex
CREATE INDEX "inventario_fluxos_inventario_item_id_idx" ON "stock"."inventario_fluxos"("inventario_item_id");

-- CreateIndex
CREATE INDEX "inventario_fluxos_status_fluxo_idx" ON "stock"."inventario_fluxos"("status_fluxo");

-- CreateIndex
CREATE INDEX "inventario_fluxo_eventos_fluxo_etapa_idx" ON "stock"."inventario_fluxo_eventos"("fluxo_id", "etapa_codigo");

-- CreateIndex
CREATE INDEX "inventario_fluxo_eventos_fluxo_id_idx" ON "stock"."inventario_fluxo_eventos"("fluxo_id");

-- CreateIndex
CREATE INDEX "idx_stock_saidas_produto_id" ON "stock"."saidas"("produto_id");

-- CreateIndex
CREATE INDEX "saidas_registrado_por_user_id_idx" ON "stock"."saidas"("registrado_por_user_id");

-- CreateIndex
CREATE INDEX "user_grupos_grupo_id_idx" ON "stock"."user_grupos"("grupo_id");

-- CreateIndex
CREATE INDEX "user_grupos_user_id_idx" ON "stock"."user_grupos"("user_id");

-- CreateIndex
CREATE INDEX "idx_access_requests_status_created_at" ON "rooms"."access_requests"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_organization_members_user_id" ON "rooms"."organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "rooms"."organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_rooms_organization_id" ON "rooms"."rooms"("organization_id");

-- CreateIndex
CREATE INDEX "idx_room_blocking_rules_room_weekday" ON "rooms"."room_blocking_rules"("room_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "room_blocking_rules_room_id_weekday_key" ON "rooms"."room_blocking_rules"("room_id", "weekday");

-- CreateIndex
CREATE INDEX "idx_room_managers_user_room" ON "rooms"."room_managers"("user_id", "room_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_managers_room_id_user_id_key" ON "rooms"."room_managers"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_bookings_room_date" ON "rooms"."bookings"("room_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "idx_bookings_user_date" ON "rooms"."bookings"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_booking_history_booking_id_created_at" ON "rooms"."booking_history"("booking_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_products_categoria_name" ON "products"("categoria", "name");

-- CreateIndex
CREATE INDEX "idx_products_codigo_trgm" ON "products" USING GIN ("codigo" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_products_fornecedor" ON "products"("fornecedor");

-- CreateIndex
CREATE INDEX "idx_products_name_asc" ON "products"("name");

-- CreateIndex
CREATE INDEX "idx_products_name_trgm" ON "products" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_products_product_category_id" ON "products"("product_category_id");

-- CreateIndex
CREATE INDEX "idx_products_regional_active" ON "products"("regional_id");

-- CreateIndex
CREATE INDEX "idx_products_regional_id" ON "products"("regional_id");

-- CreateIndex
CREATE INDEX "idx_products_regional_name" ON "products"("regional_id", "name");

-- CreateIndex
CREATE INDEX "idx_order_items_order_created_at" ON "order_items"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_product_category_availability_cat_prod" ON "product_category_availability"("category_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_product_category_availability_category_product" ON "product_category_availability"("category_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_product_category_availability_product" ON "product_category_availability"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_availability_product_id_category_id_key" ON "product_category_availability"("product_id", "category_id");

-- CreateIndex
CREATE INDEX "idx_product_contract_availability_cont_prod" ON "product_contract_availability"("contract_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_product_contract_availability_contract_product" ON "product_contract_availability"("contract_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_contract_availability_product_id_contract_id_key" ON "product_contract_availability"("product_id", "contract_id");

-- CreateIndex
CREATE INDEX "idx_service_ticket_products_fornecedor_snapshot" ON "service_ticket_products"("product_fornecedor_snapshot");

-- CreateIndex
CREATE INDEX "idx_service_ticket_products_product_id" ON "service_ticket_products"("product_id");

-- CreateIndex
CREATE INDEX "idx_service_ticket_products_supplier_id" ON "service_ticket_products"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_service_ticket_products_ticket_id" ON "service_ticket_products"("ticket_id");

-- CreateIndex
CREATE INDEX "idx_solicitation_items_product_id" ON "solicitation_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_solicitation_items_solicitation_id" ON "solicitation_items"("solicitation_id");

-- AddForeignKey
ALTER TABLE "app_notifications" ADD CONSTRAINT "app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_prospects" ADD CONSTRAINT "commercial_prospects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_contacts" ADD CONSTRAINT "commercial_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_contacts" ADD CONSTRAINT "commercial_contacts_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "commercial_prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_interactions" ADD CONSTRAINT "commercial_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_interactions" ADD CONSTRAINT "commercial_interactions_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "commercial_prospects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "commercial_simulations" ADD CONSTRAINT "commercial_simulations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_categories" ADD CONSTRAINT "contract_categories_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_post_comments" ADD CONSTRAINT "feed_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_post_comments" ADD CONSTRAINT "feed_post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "feed_post_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_comment_likes" ADD CONSTRAINT "feed_comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_category_product_categories" ADD CONSTRAINT "contract_category_product_categories_contract_category_id_fkey" FOREIGN KEY ("contract_category_id") REFERENCES "contract_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_category_product_categories" ADD CONSTRAINT "contract_category_product_categories_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_flows" ADD CONSTRAINT "service_ticket_flows_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_flow_steps" ADD CONSTRAINT "service_ticket_flow_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "service_ticket_flows"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_types" ADD CONSTRAINT "service_ticket_types_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_service_regionals" ADD CONSTRAINT "supplier_service_regionals_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_service_regionals" ADD CONSTRAINT "supplier_service_regionals_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_ai_settings" ADD CONSTRAINT "system_ai_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_modules_config" ADD CONSTRAINT "system_modules_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_regionals" ADD CONSTRAINT "user_regionals_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_regionals" ADD CONSTRAINT "user_regionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feed_post_likes" ADD CONSTRAINT "feed_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "contract_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assistant_contracts" ADD CONSTRAINT "assistant_contracts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assistant_contracts" ADD CONSTRAINT "assistant_contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_budget_periods" ADD CONSTRAINT "contract_budget_periods_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_product_category_budgets" ADD CONSTRAINT "contract_product_category_budgets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_product_category_budgets" ADD CONSTRAINT "contract_product_category_budgets_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_product_category_budget_periods" ADD CONSTRAINT "contract_product_category_bud_contract_product_category_bu_fkey" FOREIGN KEY ("contract_product_category_budget_id") REFERENCES "contract_product_category_budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contract_product_category_budget_periods" ADD CONSTRAINT "contract_product_category_budget_periods_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_issue_reports" ADD CONSTRAINT "order_issue_reports_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_issue_reports" ADD CONSTRAINT "order_issue_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_issue_reports" ADD CONSTRAINT "order_issue_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_delivery_divergences" ADD CONSTRAINT "order_delivery_divergences_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_delivery_divergences" ADD CONSTRAINT "order_delivery_divergences_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_delivery_divergences" ADD CONSTRAINT "order_delivery_divergences_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_delivery_divergences" ADD CONSTRAINT "order_delivery_divergences_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "service_ticket_flows"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "service_ticket_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_attachments" ADD CONSTRAINT "service_ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_attachments" ADD CONSTRAINT "service_ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_messages" ADD CONSTRAINT "service_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_messages" ADD CONSTRAINT "service_ticket_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_steps" ADD CONSTRAINT "service_ticket_steps_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_steps" ADD CONSTRAINT "service_ticket_steps_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitations" ADD CONSTRAINT "solicitations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitations" ADD CONSTRAINT "solicitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_blocked_by_fkey" FOREIGN KEY ("blocked_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitation_history" ADD CONSTRAINT "solicitation_history_solicitation_id_fkey" FOREIGN KEY ("solicitation_id") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."grupos" ADD CONSTRAINT "grupos_bridge_regional_id_fkey" FOREIGN KEY ("bridge_regional_id") REFERENCES "regionals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_order_stock_receipts" ADD CONSTRAINT "bridge_order_stock_receipts_processado_por_user_id_fkey" FOREIGN KEY ("processado_por_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_order_stock_receipts" ADD CONSTRAINT "bridge_order_stock_receipts_stock_grupo_id_fkey" FOREIGN KEY ("stock_grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."centros_distribuicao" ADD CONSTRAINT "centros_distribuicao_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."fornecedores" ADD CONSTRAINT "fornecedores_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."locais_armazenamento" ADD CONSTRAINT "locais_armazenamento_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_contract_stock_groups" ADD CONSTRAINT "bridge_contract_stock_groups_default_centro_distribuicao_i_fkey" FOREIGN KEY ("default_centro_distribuicao_id") REFERENCES "stock"."centros_distribuicao"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_contract_stock_groups" ADD CONSTRAINT "bridge_contract_stock_groups_default_local_armazenamento_i_fkey" FOREIGN KEY ("default_local_armazenamento_id") REFERENCES "stock"."locais_armazenamento"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_contract_stock_groups" ADD CONSTRAINT "bridge_contract_stock_groups_stock_grupo_id_fkey" FOREIGN KEY ("stock_grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."produtos" ADD CONSTRAINT "produtos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_product_group_products" ADD CONSTRAINT "bridge_product_group_products_stock_grupo_id_fkey" FOREIGN KEY ("stock_grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."bridge_product_group_products" ADD CONSTRAINT "bridge_product_group_products_stock_produto_id_fkey" FOREIGN KEY ("stock_produto_id") REFERENCES "stock"."produtos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."profissionais" ADD CONSTRAINT "profissionais_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."profissionais" ADD CONSTRAINT "profissionais_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "stock"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_centro_distribuicao_id_fkey" FOREIGN KEY ("centro_distribuicao_id") REFERENCES "stock"."centros_distribuicao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "stock"."fornecedores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_local_armazenamento_id_fkey" FOREIGN KEY ("local_armazenamento_id") REFERENCES "stock"."locais_armazenamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "stock"."produtos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "stock"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."entradas" ADD CONSTRAINT "entradas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "stock"."profissionais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."gastos" ADD CONSTRAINT "gastos_entrada_id_fkey" FOREIGN KEY ("entrada_id") REFERENCES "stock"."entradas"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."gastos" ADD CONSTRAINT "gastos_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "stock"."fornecedores"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."gastos" ADD CONSTRAINT "gastos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "stock"."produtos"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."inventario_itens" ADD CONSTRAINT "inventario_itens_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."inventario_itens" ADD CONSTRAINT "inventario_itens_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "stock"."profissionais"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."inventario_fluxos" ADD CONSTRAINT "inventario_fluxos_inventario_item_id_fkey" FOREIGN KEY ("inventario_item_id") REFERENCES "stock"."inventario_itens"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."inventario_fluxo_eventos" ADD CONSTRAINT "inventario_fluxo_eventos_fluxo_id_fkey" FOREIGN KEY ("fluxo_id") REFERENCES "stock"."inventario_fluxos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_centro_distribuicao_id_fkey" FOREIGN KEY ("centro_distribuicao_id") REFERENCES "stock"."centros_distribuicao"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_local_armazenamento_id_fkey" FOREIGN KEY ("local_armazenamento_id") REFERENCES "stock"."locais_armazenamento"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "stock"."produtos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_registrado_por_user_id_fkey" FOREIGN KEY ("registrado_por_user_id") REFERENCES "stock"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "stock"."profissionais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."saidas" ADD CONSTRAINT "saidas_retirado_por_id_fkey" FOREIGN KEY ("retirado_por_id") REFERENCES "stock"."profissionais"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."user_grupos" ADD CONSTRAINT "user_grupos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "stock"."grupos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock"."user_grupos" ADD CONSTRAINT "user_grupos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."access_requests" ADD CONSTRAINT "access_requests_approved_organization_id_fkey" FOREIGN KEY ("approved_organization_id") REFERENCES "rooms"."organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."access_requests" ADD CONSTRAINT "access_requests_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."access_requests" ADD CONSTRAINT "access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "rooms"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "rooms"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "rooms"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."rooms" ADD CONSTRAINT "rooms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "rooms"."organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."room_blocking_rules" ADD CONSTRAINT "room_blocking_rules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."room_managers" ADD CONSTRAINT "room_managers_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."room_managers" ADD CONSTRAINT "room_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "rooms"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."bookings" ADD CONSTRAINT "bookings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "rooms"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."bookings" ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"."rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."bookings" ADD CONSTRAINT "bookings_user_id_profiles_fk" FOREIGN KEY ("user_id") REFERENCES "rooms"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."booking_history" ADD CONSTRAINT "booking_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "rooms"."bookings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms"."booking_history" ADD CONSTRAINT "booking_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "rooms"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_category_id_fkey" FOREIGN KEY ("product_category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "regionals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_category_availability" ADD CONSTRAINT "product_category_availability_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "contract_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_category_availability" ADD CONSTRAINT "product_category_availability_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_contract_availability" ADD CONSTRAINT "product_contract_availability_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_contract_availability" ADD CONSTRAINT "product_contract_availability_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_products" ADD CONSTRAINT "service_ticket_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_products" ADD CONSTRAINT "service_ticket_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_products" ADD CONSTRAINT "service_ticket_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "registered_suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_ticket_products" ADD CONSTRAINT "service_ticket_products_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitation_items" ADD CONSTRAINT "solicitation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "solicitation_items" ADD CONSTRAINT "solicitation_items_solicitation_id_fkey" FOREIGN KEY ("solicitation_id") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
