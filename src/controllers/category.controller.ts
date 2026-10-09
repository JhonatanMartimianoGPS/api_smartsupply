import type { Request, Response, NextFunction } from "express";
import { categoryService } from "../services/category.service.js";
import { productService } from "../services/product.service.js";

export class CategoryController {
  async listProductCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const categories = await categoryService.listProductCategories({ active });
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createProductCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.createProductCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateProductCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.updateProductCategory(req.params.id as string, req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteProductCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.deleteProductCategory(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async listContractCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const regionalId = req.query.regionalId as string | undefined;
      const categories = await categoryService.listContractCategories({ active, regionalId });
      res.json(categories);
    } catch (error) {
      next(error);
    }
  }

  async createContractCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.createContractCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  async updateContractCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.updateContractCategory(req.params.id as string, req.body);
      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  async deleteContractCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.deleteContractCategory(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async syncProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.syncProductsForCategory(req.user!, req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async syncContracts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.syncContracts(req.params.id as string, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
