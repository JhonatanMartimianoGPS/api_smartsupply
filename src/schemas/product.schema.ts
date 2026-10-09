import { z } from "zod";

const id = z.string().min(1);
const idList = (max: number) => z.array(id).max(max);

// Import de planilha: a tela envia as linhas com índice, código, tabela e fornecedor
export const productImportLookupSchema = z.object({
  rows: z
    .array(
      z.object({
        lookupIndex: z.number().int().min(0),
        codigo: z.string().trim().min(1).max(100),
        tabela: z.number().optional(),
        fornecedor: z.string().max(200).nullish(),
      }),
    )
    .max(2000),
  regionalId: id.nullish(),
});

export const productImportDuplicateLookupSchema = z.object({
  codes: z.array(z.string().trim().min(1).max(100)).max(2000),
  regionalId: id.nullish(),
});

// Mapas de disponibilidade: sem productIds devolve o catálogo todo
export const productIdsSchema = z.object({
  productIds: idList(1000).optional(),
});

export const contractCategoryLinksSchema = z.object({
  contractCategoryIds: idList(500),
  productCategoryIds: idList(500),
});

export const bulkContractCategoryLinkSchema = z.object({
  contractCategoryId: id,
  productCategoryId: id,
});

export const syncProductsForCategorySchema = z.object({
  productIds: idList(5000),
  regionalId: id.nullish(),
  fallbackCategoryId: id.nullish(),
  // Chaves de importação do modelo antigo: aceitas e ignoradas (o produto só tem categoryId)
  categoryImportKey: z.string().nullish(),
  fallbackCategoryImportKey: z.string().nullish(),
});
