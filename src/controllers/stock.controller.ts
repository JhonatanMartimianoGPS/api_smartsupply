import type { Request, Response, NextFunction } from "express";
import { stockService } from "../services/stock.service.js";

export class StockController {
  private getUserScope(req: Request) {
    const user = (req as any).user;
    return {
      userId: user?.userId as string,
      role: (user?.role as string) || "user",
      regionals: (user?.regionals as string[]) || [],
      contracts: (user?.contracts as string[]) || [],
    };
  }

  // Grupos
  async listGrupos(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = this.getUserScope(req);
      const grupos = await stockService.listGrupos(scope);
      res.json(grupos);
    } catch (err) {
      next(err);
    }
  }

  async listBridgeRegionals(req: Request, res: Response, next: NextFunction) {
    try {
      const regionals = await stockService.listBridgeRegionals();
      res.json(regionals);
    } catch (err) {
      next(err);
    }
  }

  async createGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      const grupo = await stockService.createGrupo(req.body);
      res.status(201).json(grupo);
    } catch (err) {
      next(err);
    }
  }

  async updateGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      const grupo = await stockService.updateGrupo(req.params.id as string, req.body);
      res.json(grupo);
    } catch (err) {
      next(err);
    }
  }

  async deleteGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteGrupo(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Centros de Distribuição
  async listCentros(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = this.getUserScope(req);
      const grupoId = (req.query.grupo_id as string) || null;
      const centros = await stockService.listCentros(scope, grupoId);
      res.json(centros);
    } catch (err) {
      next(err);
    }
  }

  async getCentroById(req: Request, res: Response, next: NextFunction) {
    try {
      const centro = await stockService.getCentroById(req.params.id as string);
      res.json(centro);
    } catch (err) {
      next(err);
    }
  }

  async createCentro(req: Request, res: Response, next: NextFunction) {
    try {
      const centro = await stockService.createCentro(req.body);
      res.status(201).json(centro);
    } catch (err) {
      next(err);
    }
  }

  async updateCentro(req: Request, res: Response, next: NextFunction) {
    try {
      const centro = await stockService.updateCentro(req.params.id as string, req.body);
      res.json(centro);
    } catch (err) {
      next(err);
    }
  }

  async deleteCentro(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteCentro(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Locais
  async listLocais(req: Request, res: Response, next: NextFunction) {
    try {
      const centroDistribuicaoId = (req.query.centro_distribuicao_id as string) || (req.query.centro_id as string) || null;
      const grupoId = (req.query.grupo_id as string) || null;
      const regionalId = (req.query.regional_id as string) || null;
      const locais = await stockService.listLocais({
        centroDistribuicaoId,
        grupoId,
        regionalId,
      });
      res.json(locais);
    } catch (err) {
      next(err);
    }
  }

  async createLocal(req: Request, res: Response, next: NextFunction) {
    try {
      const local = await stockService.createLocal(req.body);
      res.status(201).json(local);
    } catch (err) {
      next(err);
    }
  }

  async updateLocal(req: Request, res: Response, next: NextFunction) {
    try {
      const local = await stockService.updateLocal(req.params.id as string, req.body);
      res.json(local);
    } catch (err) {
      next(err);
    }
  }

  async deleteLocal(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteLocal(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Produtos
  async listProdutos(req: Request, res: Response, next: NextFunction) {
    try {
      const grupoId = (req.query.grupo_id as string) || null;
      const produtos = await stockService.listProdutos(grupoId);
      res.json(produtos);
    } catch (err) {
      next(err);
    }
  }

  async getProdutoById(req: Request, res: Response, next: NextFunction) {
    try {
      const produto = await stockService.getProdutoById(req.params.id as string);
      res.json(produto);
    } catch (err) {
      next(err);
    }
  }

  async createProduto(req: Request, res: Response, next: NextFunction) {
    try {
      const produto = await stockService.createProduto(req.body);
      res.status(201).json(produto);
    } catch (err) {
      next(err);
    }
  }

  async updateProduto(req: Request, res: Response, next: NextFunction) {
    try {
      const produto = await stockService.updateProduto(req.params.id as string, req.body);
      res.json(produto);
    } catch (err) {
      next(err);
    }
  }

  async deleteProduto(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteProduto(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Fornecedores
  async listFornecedores(req: Request, res: Response, next: NextFunction) {
    try {
      const grupoId = (req.query.grupo_id as string) || null;
      const fornecedores = await stockService.listFornecedores(grupoId);
      res.json(fornecedores);
    } catch (err) {
      next(err);
    }
  }

  async createFornecedor(req: Request, res: Response, next: NextFunction) {
    try {
      const fornecedor = await stockService.createFornecedor(req.body);
      res.status(201).json(fornecedor);
    } catch (err) {
      next(err);
    }
  }

  async updateFornecedor(req: Request, res: Response, next: NextFunction) {
    try {
      const fornecedor = await stockService.updateFornecedor(req.params.id as string, req.body);
      res.json(fornecedor);
    } catch (err) {
      next(err);
    }
  }

  async deleteFornecedor(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteFornecedor(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Profissionais
  async listProfissionais(req: Request, res: Response, next: NextFunction) {
    try {
      const grupoId = (req.query.grupo_id as string) || null;
      const profissionais = await stockService.listProfissionais(grupoId);
      res.json(profissionais);
    } catch (err) {
      next(err);
    }
  }

  async getProfissionalByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const profissional = await stockService.getProfissionalByUserId(req.params.userId as string);
      res.json(profissional);
    } catch (err) {
      next(err);
    }
  }

  async lookupProfissional(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = (req.query.identifier as string) || "";
      const profissional = await stockService.lookupProfissional(identifier);
      res.json(profissional);
    } catch (err) {
      next(err);
    }
  }

  async createProfissional(req: Request, res: Response, next: NextFunction) {
    try {
      const profissional = await stockService.createProfissional(req.body);
      res.status(201).json(profissional);
    } catch (err) {
      next(err);
    }
  }

  async updateProfissional(req: Request, res: Response, next: NextFunction) {
    try {
      const profissional = await stockService.updateProfissional(req.params.id as string, req.body);
      res.json(profissional);
    } catch (err) {
      next(err);
    }
  }

  async deleteProfissional(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteProfissional(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  // Inventário & Movimentações
  async getInventario(req: Request, res: Response, next: NextFunction) {
    try {
      const grupoId = (req.query.grupo_id as string) || null;
      const inv = await stockService.getInventario(grupoId);
      res.json(inv);
    } catch (err) {
      next(err);
    }
  }

  async getInventarioDetalhes(req: Request, res: Response, next: NextFunction) {
    try {
      const detalhes = await stockService.getInventarioDetalhes(req.params.produtoId as string);
      res.json(detalhes);
    } catch (err) {
      next(err);
    }
  }

  async listEntradas(req: Request, res: Response, next: NextFunction) {
    try {
      const { dataInicio, dataFim, produtoId } = req.query;
      const entradas = await stockService.listEntradas({
        dataInicio: dataInicio as string,
        dataFim: dataFim as string,
        produtoId: produtoId as string,
      });
      res.json(entradas);
    } catch (err) {
      next(err);
    }
  }

  async listSaidas(req: Request, res: Response, next: NextFunction) {
    try {
      const { dataInicio, dataFim, produtoId } = req.query;
      const saidas = await stockService.listSaidas({
        dataInicio: dataInicio as string,
        dataFim: dataFim as string,
        produtoId: produtoId as string,
      });
      res.json(saidas);
    } catch (err) {
      next(err);
    }
  }

  async createEntrada(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const entrada = await stockService.createEntrada(req.body, userId);
      res.status(201).json(entrada);
    } catch (err) {
      next(err);
    }
  }

  async createSaida(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const saida = await stockService.createSaida(req.body, userId);
      res.status(201).json(saida);
    } catch (err) {
      next(err);
    }
  }

  async createSaidaLote(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const saidas = await stockService.createSaidaLote(req.body, userId);
      res.status(201).json(saidas);
    } catch (err) {
      next(err);
    }
  }

  // Patrimônio & Fluxos
  async listPatrimonioItens(req: Request, res: Response, next: NextFunction) {
    try {
      const grupoId = (req.query.grupo_id as string) || null;
      const itens = await stockService.listPatrimonioItens(grupoId);
      res.json(itens);
    } catch (err) {
      next(err);
    }
  }

  async createPatrimonioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await stockService.createPatrimonioItem(req.body);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }

  async updatePatrimonioItem(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await stockService.updatePatrimonioItem(req.params.id as string, req.body);
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async deletePatrimonioItem(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deletePatrimonioItem(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async listPatrimonioFluxos(req: Request, res: Response, next: NextFunction) {
    try {
      const itemId = (req.query.inventario_item_id as string) || null;
      const fluxos = await stockService.listPatrimonioFluxos(itemId || undefined);
      res.json(fluxos);
    } catch (err) {
      next(err);
    }
  }

  async createPatrimonioFluxo(req: Request, res: Response, next: NextFunction) {
    try {
      const fluxo = await stockService.createPatrimonioFluxo(req.body);
      res.status(201).json(fluxo);
    } catch (err) {
      next(err);
    }
  }

  async addPatrimonioFluxoEvento(req: Request, res: Response, next: NextFunction) {
    try {
      const ev = await stockService.addPatrimonioFluxoEvento(req.params.id as string, req.body);
      res.status(201).json(ev);
    } catch (err) {
      next(err);
    }
  }

  async encerrarPatrimonioFluxo(req: Request, res: Response, next: NextFunction) {
    try {
      const fluxo = await stockService.encerrarPatrimonioFluxo(req.params.id as string);
      res.json(fluxo);
    } catch (err) {
      next(err);
    }
  }

  // Dashboard & Usuários
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = this.getUserScope(req);
      const stats = await stockService.getDashboardStats(scope);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  async getUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await stockService.getUserRoles(req.params.userId as string);
      res.json(roles);
    } catch (err) {
      next(err);
    }
  }

  async getUserGroupViews(req: Request, res: Response, next: NextFunction) {
    try {
      const views = await stockService.getUserGroupViews(req.params.userId as string);
      res.json(views);
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await stockService.getProfile(req.params.userId as string);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await stockService.updateProfile(req.params.userId as string, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  // Usuários Administrativos WMS
  async listAdminUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await stockService.listAdminUsers();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async createAdminUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await stockService.createAdminUser(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  }

  async updateAdminUserProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await stockService.updateAdminUserProfile(req.params.userId as string, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  async setAdminUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.setAdminUserPassword(req.params.userId as string, req.body.password);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async deleteAdminUser(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.deleteAdminUser(req.params.userId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async addUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.addUserRole(req.params.userId as string, req.body.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async removeUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      await stockService.removeUserRole(req.params.userId as string, req.params.role as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async addUserGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await stockService.addUserGrupo(req.params.userId as string, req.body.grupo_id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async removeUserGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await stockService.removeUserGrupo(req.params.userId as string, req.params.grupoId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Integração com Pedidos do Bridge
  async getPendingBridgeOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = (req.params.orderId as string) || undefined;
      const orders = await stockService.getPendingBridgeOrders(orderId);
      res.json(orders);
    } catch (err) {
      next(err);
    }
  }

  async getPendingBridgeOrderDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await stockService.getPendingBridgeOrderDetails(req.params.orderId as string);
      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  async confirmBridgeOrderReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await stockService.confirmBridgeOrderReceipt(
        req.params.orderId as string,
        req.body.items,
        userId,
        req.body.observacao,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBridgeStockIntegrationAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const audit = await stockService.getBridgeStockIntegrationAudit();
      res.json(audit);
    } catch (err) {
      next(err);
    }
  }
}

export const stockController = new StockController();
