-- AlterTable: o módulo passa a guardar o que a tela de gerenciamento edita (texto, ícone, rota, selo e quem alterou)
ALTER TABLE "system_modules_config" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "route" TEXT,
ADD COLUMN     "updated_by" TEXT;

-- CreateTable
CREATE TABLE "system_module_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT 'indigo',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_module_categories_pkey" PRIMARY KEY ("id")
);

-- Os módulos existentes já apontam para estas 4 categorias (coluna "category"); a tabela nasce com elas
-- para o gerenciamento funcionar sem depender do seed. Os textos, ícones e rotas dos módulos vêm do seed.
INSERT INTO "system_module_categories" ("id", "label", "description", "color", "sort_order", "updated_at") VALUES
  ('suprimentos', 'Suprimentos & Estoque', 'Gestão de suprimentos, compras, cotações e estoque', 'orange', 1, CURRENT_TIMESTAMP),
  ('servicos', 'Serviços & Chamados', 'Gestão predial e abertura de chamados', 'blue', 2, CURRENT_TIMESTAMP),
  ('comunicacao', 'Comunicação & Equipe', 'Feed corporativo, contatos e avisos gerais', 'teal', 3, CURRENT_TIMESTAMP),
  ('inteligencia', 'Inteligência Artificial', 'Assistente IA Bridget e automações', 'purple', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
