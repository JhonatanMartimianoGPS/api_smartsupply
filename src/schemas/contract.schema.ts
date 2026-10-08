import { z } from "zod";

// A tela de contratos envia os nomes do Supabase (regional_id, total_budget...); os nomes do modelo
// (regionalId, totalBudget...) também valem. O controller normaliza para camelCase (toContractInput).
const money = z.number().min(0).max(999_999_999_999);
const maxItems = z.number().int().min(1).max(10_000).nullish();

const contractFields = {
  name: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().max(50).nullish(),
  regionalId: z.string().min(1).optional(),
  regional_id: z.string().min(1).optional(),
  categoryId: z.string().min(1).nullish(),
  category_id: z.string().min(1).nullish(),
  totalBudget: money.optional(),
  total_budget: money.optional(),
  unlimitedBudget: z.boolean().optional(),
  unlimited_budget: z.boolean().optional(),
  allowExtraOrder: z.boolean().optional(),
  allow_extra_order: z.boolean().optional(),
  allowCustomPrices: z.boolean().optional(),
  allow_custom_prices: z.boolean().optional(),
  allowUnlimitedItemsSolicitation: z.boolean().optional(),
  allow_unlimited_items_solicitation: z.boolean().optional(),
  maxItemsPerSolicitation: maxItems,
  max_items_per_solicitation: maxItems,
  budgetLocked: z.boolean().optional(),
  budget_locked: z.boolean().optional(),
  active: z.boolean().optional(),
};

export const createContractSchema = z
  .object(contractFields)
  .refine((data) => data.name, { message: "O nome do contrato é obrigatório." })
  .refine((data) => data.regionalId || data.regional_id, { message: "A regional do contrato é obrigatória." });

export const updateContractSchema = z.object(contractFields);

export type ContractBodyInput = z.infer<typeof updateContractSchema>;

/** Normaliza o corpo (snake_case ou camelCase) para os nomes do modelo. Transitório até o front migrar. */
export function toContractInput(body: ContractBodyInput) {
  return {
    name: body.name,
    code: body.code,
    regionalId: body.regionalId ?? body.regional_id,
    categoryId: body.categoryId !== undefined ? body.categoryId : body.category_id,
    totalBudget: body.totalBudget ?? body.total_budget,
    unlimitedBudget: body.unlimitedBudget ?? body.unlimited_budget,
    allowExtraOrder: body.allowExtraOrder ?? body.allow_extra_order,
    allowCustomPrices: body.allowCustomPrices ?? body.allow_custom_prices,
    allowUnlimitedItemsSolicitation: body.allowUnlimitedItemsSolicitation ?? body.allow_unlimited_items_solicitation,
    maxItemsPerSolicitation:
      body.maxItemsPerSolicitation !== undefined ? body.maxItemsPerSolicitation : body.max_items_per_solicitation,
    budgetLocked: body.budgetLocked ?? body.budget_locked,
    active: body.active,
  };
}

export type ContractInput = ReturnType<typeof toContractInput>;
