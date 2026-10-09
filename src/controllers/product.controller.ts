import type { Request, Response, NextFunction } from "express";
import { productService } from "../services/product.service.js";
import { accessService } from "../services/access.service.js";
import { AppError } from "../middlewares/error.middleware.js";

// Parâmetros de URL podem chegar como lista ou objeto (?a[b]=c): só aceitamos texto.
// O byte nulo (%00) é recusado porque o PostgreSQL não o aceita em texto.
const asString = (value: unknown) =>
  typeof value === "string" && value !== "" && !value.includes("\0") ? value : undefined;

/**
 * Corpo de criação/edição de produto (já em camelCase pelo apiConvention): só os campos do modelo.
 * `tabela` é o preço unitário; `fornecedor` (nome) é aceito e resolvido para o fornecedor cadastrado.
 */
function toProductInput(body: any) {
  const p = body ?? {};
  return {
    name: p.name,
    codigo: p.codigo,
    descricao: p.descricao,
    unidade: p.unidade,
    tabela: p.tabela !== undefined && p.tabela !== null && p.tabela !== "" ? Number(p.tabela) : undefined,
    categoryId: p.categoryId ?? undefined,
    regionalId: p.regionalId ?? undefined,
    supplierId: p.supplierId ?? undefined,
    fornecedor: typeof p.fornecedor === "string" ? p.fornecedor : undefined,
    imageUrl: p.imageUrl ?? undefined,
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

  async validateContractDraftItems(req: Request, res: Response, next: NextFunction) {
    try {
      const { contractId, productIds } = req.body ?? {};
      if (!Array.isArray(productIds) || productIds.length > 500 || !productIds.every((id) => typeof id === "string" && id !== "")) {
        throw new AppError(400, "Informe a lista de produtos (até 500 itens).");
      }
      const contract = await accessService.assertContractAccess(req.user!, contractId);
      const result = await productService.validateContractDraftItems(contract, productIds);
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
      const product = await productService.createProduct(req.user!, toProductInput(req.body));
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.user!, req.params.id as string, toProductInput(req.body));
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.deleteProduct(req.user!, req.params.id as string);
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

  async getDuplicateIndex(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = asString(req.query.mode) === "nome" ? "nome" : "codigo";
      const index = await productService.getDuplicateIndex(mode);
      res.json(index);
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = asString(req.query.limit);
      const history = await productService.getHistory({
        productId: asString(req.query.productId),
        regionalId: asString(req.query.regionalId),
        limit: limit ? Number(limit) : undefined,
      });
      res.json(history);
    } catch (error) {
      next(error);
    }
  }

  async importLookup(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.importLookup(req.body.rows, req.body.regionalId));
    } catch (error) {
      next(error);
    }
  }

  async importDuplicateLookup(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.importDuplicateLookup(req.body.codes, req.body.regionalId));
    } catch (error) {
      next(error);
    }
  }

  async getProductCategories(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.getProductContractCategoryIds(req.params.id as string));
    } catch (error) {
      next(error);
    }
  }

  async getCategoryMap(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.getCategoryMap(req.body.productIds));
    } catch (error) {
      next(error);
    }
  }

  async getContractMap(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.getContractMap(req.body.productIds));
    } catch (error) {
      next(error);
    }
  }

  async getContractCategoryLinks(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.getContractCategoryLinks(req.body.contractCategoryIds, req.body.productCategoryIds));
    } catch (error) {
      next(error);
    }
  }

  async bulkAssignContractCategory(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.bulkAssignContractCategory(req.body.contractCategoryId, req.body.productCategoryId));
    } catch (error) {
      next(error);
    }
  }

  async bulkRemoveContractCategory(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await productService.bulkRemoveContractCategory(req.body.contractCategoryId, req.body.productCategoryId));
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
