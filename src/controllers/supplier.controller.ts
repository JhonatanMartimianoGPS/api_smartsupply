import type { Request, Response, NextFunction } from "express";
import { supplierService } from "../services/supplier.service.js";

export class SupplierController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const active = req.query.active !== undefined ? req.query.active === "true" : undefined;
      const search = req.query.search as string | undefined;
      const suppliers = await supplierService.listSuppliers({ active, search });
      res.json(suppliers);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.getSupplierById(req.params.id as string);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id as string, req.body);
      res.json(supplier);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.deleteSupplier(req.params.id as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async merge(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetSupplierId, duplicateSupplierIds } = req.body;
      const result = await supplierService.mergeSuppliers(targetSupplierId, duplicateSupplierIds || []);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getConsolidatedOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierId } = req.body;
      const result = await supplierService.getConsolidatedOrders(supplierId || (req.params.id as string));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const supplierController = new SupplierController();
