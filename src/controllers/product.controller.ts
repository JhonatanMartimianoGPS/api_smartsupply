import type { Request, Response, NextFunction } from "express";
import { productService } from "../services/product.service.js";
import { accessService } from "../services/access.service.js";

// Parâmetros de URL podem chegar como lista ou objeto (?a[b]=c): só aceitamos texto.
// O byte nulo (%00) é recusado porque o PostgreSQL não o aceita em texto.
const asString = (value: unknown) =>
  typeof value === "string" && value !== "" && !value.includes("\0") ? value : undefined;

/**
 * Normaliza o body de criação/edição de produto.
 *
 * O frontend envia `{ product: { ...snake_case }, categoryIds, contractIds }`
 * (herdado do contrato do Supabase), enquanto o service espera os campos
 * em camelCase no nível raiz. Aceita os dois formatos.
 *
 * Preço: no schema atual a coluna `tabela` guarda o valor unitário (é o que
 * as respostas expõem como `valor_unitario`). No formato do frontend, `tabela`
 * é o número da tabela de preço, então o preço vem de `valor_unitario`.
 */
function toProductInput(body: any) {
  const isEnvelope = body && typeof body.product === "object" && body.product !== null;
  const p = isEnvelope ? body.product : (body ?? {});

  const price = isEnvelope ? p.valor_unitario : (p.tabela ?? p.valor_unitario);

  return {
    name: p.name,
    codigo: p.codigo,
    descricao: p.descricao,
    unidade: p.unidade,
    tabela: price !== undefined && price !== null && price !== "" ? Number(price) : undefined,
    categoryId: p.categoryId ?? p.product_category_id ?? undefined,
    regionalId: p.regionalId ?? p.regional_id ?? undefined,
    supplierId: p.supplierId ?? p.supplier_id ?? undefined,
    imageUrl: p.imageUrl ?? p.image_url ?? undefined,
    active: p.active,
  };
}

export class ProductController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionalId, categoryId, search } = req.query;
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const products = await productService.listProducts({
        regionalId: regionalId as string,
        categoryId: categoryId as string,
        search: search as string,
        active,
      });
      res.json(products);
    } catch (error) {
      next(error);
    }
  }

  async listPaginated(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query;
      const page = asString(q.page);
      const pageSize = asString(q.pageSize);
      const tabela = asString(q.tabela);
      // O frontend manda a lista de ids separada por vírgula
      const productIds = asString(q.productIds)?.split(",").filter(Boolean).slice(0, 200);

      // Produtos do contrato: por enquanto só a regional dele (e os globais). A disponibilidade
      // produto a produto (contractCategoryId etc.) ainda não existe no modelo atual.
      const contractId = asString(q.contractId);
      const contract = contractId ? await accessService.assertContractAccess(req.user!, contractId) : undefined;

      const result = await productService.listPaginated({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        regionalId: contract?.regionalId ?? asString(q.regionalId),
        categoryId: asString(q.categoryId),
        supplierId: asString(q.supplierId),
        search: asString(q.search),
        active: q.active !== undefined ? q.active === "true" : undefined,
        category: asString(q.category),
        fornecedor: asString(q.fornecedor),
        tabela: tabela ? Number(tabela) : undefined,
        productIds,
        sort: asString(q.sort),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getProductById(req.params.id as string);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.createProduct(toProductInput(req.body));
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id as string, toProductInput(req.body));
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.deleteProduct(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getFilterOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const options = await productService.getFilterOptions({ regionalId: asString(req.query.regionalId) });
      res.json(options);
    } catch (error) {
      next(error);
    }
  }

  async getDuplicateIndex(_req: Request, res: Response, next: NextFunction) {
    try {
      const index = await productService.getDuplicateIndex();
      res.json(index);
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
