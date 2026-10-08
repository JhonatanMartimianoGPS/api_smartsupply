import type { Request, Response, NextFunction } from "express";
import { productService } from "../services/product.service.js";

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
      const { page, pageSize, regionalId, categoryId, supplierId, search } = req.query;
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const result = await productService.listPaginated({
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        regionalId: regionalId as string,
        categoryId: categoryId as string,
        supplierId: supplierId as string,
        search: search as string,
        active,
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
      const product = await productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.updateProduct(req.params.id as string, req.body);
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

  async getFilterOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const options = await productService.getFilterOptions();
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
