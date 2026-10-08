import { z } from "zod";

export const createGrupoSchema = z.object({
  nome: z.string({ required_error: "Nome do grupo é obrigatório." }).min(2, "Nome deve ter no mínimo 2 caracteres."),
  visualizacao: z.enum(["estoque", "inventario", "ambas", "operacional"]).optional(),
  regional_id: z.string().optional(),
  contract_id: z.string().optional(),
});

export const createCentroSchema = z.object({
  regional_id: z.string().optional().nullable(),
  contract_id: z.string().optional().nullable(),
  grupo_id: z.string().optional().nullable(),
  nome: z.string({ required_error: "Nome do centro é obrigatório." }).min(2),
  endereco: z.string().optional().nullable(),
  responsavel: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
});

export const createLocalSchema = z.object({
  centro_distribuicao_id: z.string().optional().nullable(),
  grupo_id: z.string().optional().nullable(),
  nome: z.string({ required_error: "Nome do local é obrigatório." }).min(2),
  observacoes: z.string().optional().nullable(),
  padrao: z.boolean().optional(),
});

export const createProdutoSchema = z.object({
  grupo_id: z.string({ required_error: "ID do grupo é obrigatório." }),
  nome: z.string({ required_error: "Nome do produto é obrigatório." }).min(2),
  estoque_minimo: z.number().int().nonnegative().default(0),
  custo_unitario_inicial: z.number().nonnegative().optional().nullable(),
  unidade_medida: z.string().default("UN"),
  foto_url: z.string().optional().nullable(),
  codigo: z.string().optional(),
  bridge_product_id: z.string().optional().nullable(),
});

export const createEntradaSchema = z.object({
  produto_id: z.string({ required_error: "ID do produto é obrigatório." }),
  quantidade: z.number().int().positive("A quantidade de entrada deve ser maior que zero."),
  custo_unitario: z.number().nonnegative("Custo unitário não pode ser negativo.").default(0),
  nota_fiscal: z.string().optional().nullable(),
  centro_distribuicao_id: z.string().optional().nullable(),
  local_armazenamento_id: z.string().optional().nullable(),
  fornecedor_id: z.string().optional().nullable(),
});

export const createSaidaSchema = z.object({
  produto_id: z.string({ required_error: "ID do produto é obrigatório." }),
  quantidade: z.number().int().positive("A quantidade de saída deve ser maior que zero."),
  custo_unitario: z.number().nonnegative().default(0),
  nota_fiscal: z.string().optional().nullable(),
  centro_distribuicao_id: z.string().optional().nullable(),
  local_armazenamento_id: z.string().optional().nullable(),
  retirado_por_id: z.string().optional().nullable(),
});

export const createSaidaLoteSchema = z.object({
  centro_distribuicao_id: z.string({ required_error: "Centro de distribuição é obrigatório." }),
  local_armazenamento_id: z.string().optional().nullable(),
  responsavel_id: z.string().optional().nullable(),
  retirado_por_id: z.string().optional().nullable(),
  nota_fiscal: z.string().optional().nullable(),
  itens: z
    .array(
      z.object({
        produto_id: z.string({ required_error: "ID do produto é obrigatório no item." }),
        quantidade: z.number().int().positive("A quantidade deve ser positiva."),
        custo_unitario: z.number().nonnegative().optional(),
      })
    )
    .min(1, "A saída em lote deve conter pelo menos 1 item."),
});

export const confirmBridgeReceiptSchema = z.object({
  items: z
    .array(
      z.object({
        order_item_id: z.string().optional(),
        product_id: z.string().optional(),
        quantidade: z.number().optional(),
        quantidade_recebida: z.number().optional(),
        local_armazenamento_id: z.string().optional().nullable(),
        centro_distribuicao_id: z.string().optional().nullable(),
      })
    )
    .min(1, "Deve conter pelo menos 1 item para confirmação de recebimento."),
  observacao: z.string().optional().nullable(),
});
