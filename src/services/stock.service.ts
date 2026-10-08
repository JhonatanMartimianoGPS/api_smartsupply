import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error.middleware.js";
import { hashPassword } from "../utils/password.js";
import { auditService } from "./audit.service.js";

export interface UserScope {
  userId: string;
  role: string;
  regionals: string[];
  contracts: string[];
}

export class StockService {
  /**
   * Helper para filtrar grupos e centros com base no escopo de Regionais e Contratos do usuário
   */
  private buildScopeFilter(scope: UserScope) {
    if (scope.role === "super_admin") {
      return {};
    }
    if (scope.role === "admin") {
      return {
        OR: [
          { regionalId: { in: scope.regionals } },
          { contract: { regionalId: { in: scope.regionals } } },
        ],
      };
    }
    // Para gestores e assistentes: visão estrita baseada nos contratos atribuídos
    return {
      OR: [
        { contractId: { in: scope.contracts } },
        { regionalId: { in: scope.regionals } },
      ],
    };
  }

  // ─── 1. GRUPOS DE ESTOQUE (Baseados em Regionais & Contratos) ─────────────────
  async listGrupos(scope: UserScope) {
    const where = this.buildScopeFilter(scope);
    const grupos = await prisma.stockGrupo.findMany({
      where,
      include: {
        regional: { select: { id: true, name: true, code: true } },
        contract: { select: { id: true, name: true, code: true } },
      },
      orderBy: { nome: "asc" },
    });

    return grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      visualizacao: g.visualizacao,
      bridge_regional_id: g.regionalId,
      contract_id: g.contractId,
      regional: g.regional,
      contract: g.contract,
      created_at: g.createdAt.toISOString(),
      updated_at: g.updatedAt.toISOString(),
    }));
  }

  async listBridgeRegionals() {
    const regionals = await prisma.regional.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return regionals.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      active: r.active,
    }));
  }

  async createGrupo(data: { nome: string; visualizacao?: any; bridge_regional_id?: string | null; contract_id?: string | null }) {
    const grupo = await prisma.stockGrupo.create({
      data: {
        nome: data.nome,
        visualizacao: data.visualizacao || "ambas",
        regionalId: data.bridge_regional_id || null,
        contractId: data.contract_id || null,
      },
    });
    return {
      id: grupo.id,
      nome: grupo.nome,
      visualizacao: grupo.visualizacao,
      bridge_regional_id: grupo.regionalId,
      contract_id: grupo.contractId,
    };
  }

  async updateGrupo(id: string, data: { nome?: string; visualizacao?: any; bridge_regional_id?: string | null; contract_id?: string | null }) {
    const grupo = await prisma.stockGrupo.update({
      where: { id },
      data: {
        nome: data.nome,
        visualizacao: data.visualizacao,
        regionalId: data.bridge_regional_id,
        contractId: data.contract_id,
      },
    });
    return grupo;
  }

  async deleteGrupo(id: string) {
    return prisma.stockGrupo.delete({ where: { id } });
  }

  // ─── 2. CENTROS DE DISTRIBUIÇÃO ──────────────────────────────────────────────
  async listCentros(scope: UserScope, grupoId?: string | null) {
    const where: any = {};
    if (grupoId) where.grupoId = grupoId;

    // Filtra pelo escopo de contratos/regionais se não for super admin
    if (scope.role !== "super_admin") {
      if (scope.role === "admin") {
        where.OR = [
          { regionalId: { in: scope.regionals } },
          { grupo: { regionalId: { in: scope.regionals } } },
        ];
      } else {
        where.OR = [
          { contractId: { in: scope.contracts } },
          { grupo: { contractId: { in: scope.contracts } } },
          { regionalId: { in: scope.regionals } },
        ];
      }
    }

    const centros = await prisma.stockCentroDistribuicao.findMany({
      where,
      include: {
        grupo: { select: { id: true, nome: true, visualizacao: true } },
        regional: { select: { id: true, name: true } },
        contract: { select: { id: true, name: true } },
      },
      orderBy: { nome: "asc" },
    });

    return centros.map((c) => ({
      id: c.id,
      nome: c.nome,
      endereco: c.endereco,
      responsavel: c.responsavel,
      telefone: c.telefone,
      grupo_id: c.grupoId,
      regional_id: c.regionalId,
      contract_id: c.contractId,
      grupo: c.grupo,
      grupos: c.grupo,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    }));
  }

  async getCentroById(id: string) {
    const c = await prisma.stockCentroDistribuicao.findUnique({
      where: { id },
      include: { grupo: true, regional: true, contract: true },
    });
    if (!c) throw new AppError(404, "Centro de distribuição não encontrado.");
    return {
      id: c.id,
      nome: c.nome,
      endereco: c.endereco,
      responsavel: c.responsavel,
      telefone: c.telefone,
      grupo_id: c.grupoId,
      grupo: c.grupo,
      grupos: c.grupo,
    };
  }

  async createCentro(data: { nome: string; grupo_id?: string | null; endereco?: string | null; responsavel?: string | null; telefone?: string | null; regional_id?: string | null; contract_id?: string | null }) {
    let regionalId = data.regional_id;
    let contractId = data.contract_id;
    if (!regionalId && data.grupo_id) {
      const g = await prisma.stockGrupo.findUnique({ where: { id: data.grupo_id } });
      if (g) {
        regionalId = g.regionalId || undefined;
        if (!contractId) contractId = g.contractId || undefined;
      }
    }
    if (!regionalId) {
      const reg = await prisma.regional.findFirst({ where: { active: true } });
      regionalId = reg?.id || "";
    }

    const c = await prisma.stockCentroDistribuicao.create({
      data: {
        nome: data.nome,
        grupoId: data.grupo_id || null,
        regionalId,
        contractId: contractId || null,
        endereco: data.endereco || null,
        responsavel: data.responsavel || null,
        telefone: data.telefone || null,
      },
      include: { grupo: true, regional: true, contract: true },
    });
    return { ...c, grupo_id: c.grupoId, grupo: c.grupo, grupos: c.grupo };
  }

  async updateCentro(id: string, data: any) {
    const c = await prisma.stockCentroDistribuicao.update({
      where: { id },
      data: {
        nome: data.nome,
        endereco: data.endereco,
        responsavel: data.responsavel,
        telefone: data.telefone,
        grupoId: data.grupo_id !== undefined ? data.grupo_id : undefined,
        regionalId: data.regional_id !== undefined ? data.regional_id : undefined,
        contractId: data.contract_id !== undefined ? data.contract_id : undefined,
      },
      include: { grupo: true, regional: true, contract: true },
    });
    return { ...c, grupo_id: c.grupoId, grupo: c.grupo, grupos: c.grupo };
  }

  async deleteCentro(id: string) {
    return prisma.stockCentroDistribuicao.delete({ where: { id } });
  }

  // ─── 3. LOCAIS DE ARMAZENAMENTO ──────────────────────────────────────────────
  async listLocais(filters?: { grupoId?: string | null; centroDistribuicaoId?: string | null; regionalId?: string | null } | string | null) {
    const where: any = {};
    if (typeof filters === "string") {
      where.OR = [
        { grupoId: filters },
        { centroDistribuicaoId: filters },
      ];
    } else if (filters && typeof filters === "object") {
      if (filters.centroDistribuicaoId) where.centroDistribuicaoId = filters.centroDistribuicaoId;
      else if (filters.grupoId) where.grupoId = filters.grupoId;
      if (filters.regionalId) where.centroDistribuicao = { regionalId: filters.regionalId };
    }

    const locais = await prisma.stockLocalArmazenamento.findMany({
      where,
      include: {
        grupo: { select: { id: true, nome: true, visualizacao: true } },
        centroDistribuicao: { select: { id: true, nome: true, regionalId: true, contractId: true } },
      },
      orderBy: [{ padrao: "desc" }, { nome: "asc" }],
    });

    return locais.map((l) => ({
      id: l.id,
      nome: l.nome,
      observacoes: l.observacoes,
      padrao: l.padrao,
      grupo_id: l.grupoId,
      centro_distribuicao_id: l.centroDistribuicaoId,
      centro_distribuicao: l.centroDistribuicao,
      grupo: l.grupo,
      grupos: l.grupo,
      created_at: l.createdAt.toISOString(),
      updated_at: l.updatedAt.toISOString(),
    }));
  }

  async createLocal(data: { nome: string; grupo_id?: string | null; observacoes?: string | null; padrao?: boolean; centro_distribuicao_id?: string | null }) {
    let centroId = data.centro_distribuicao_id;
    if (!centroId && data.grupo_id) {
      const cd = await prisma.stockCentroDistribuicao.findFirst({ where: { grupoId: data.grupo_id } });
      if (cd) centroId = cd.id;
    }
    if (!centroId) {
      const cd = await prisma.stockCentroDistribuicao.findFirst();
      centroId = cd?.id || "";
    }

    if (data.padrao) {
      await prisma.stockLocalArmazenamento.updateMany({
        where: { centroDistribuicaoId: centroId },
        data: { padrao: false },
      });
    }

    const local = await prisma.stockLocalArmazenamento.create({
      data: {
        nome: data.nome,
        grupoId: data.grupo_id || null,
        centroDistribuicaoId: centroId,
        observacoes: data.observacoes || null,
        padrao: !!data.padrao,
      },
      include: { grupo: true, centroDistribuicao: true },
    });

    return { ...local, grupo_id: local.grupoId, grupo: local.grupo, grupos: local.grupo };
  }

  async updateLocal(id: string, data: any) {
    if (data.padrao) {
      const current = await prisma.stockLocalArmazenamento.findUnique({ where: { id }, select: { centroDistribuicaoId: true } });
      if (current) {
        await prisma.stockLocalArmazenamento.updateMany({
          where: { centroDistribuicaoId: current.centroDistribuicaoId, NOT: { id } },
          data: { padrao: false },
        });
      }
    }

    const local = await prisma.stockLocalArmazenamento.update({
      where: { id },
      data: {
        nome: data.nome,
        observacoes: data.observacoes,
        padrao: data.padrao,
        centroDistribuicaoId: data.centro_distribuicao_id,
      },
      include: { grupo: true },
    });

    return { ...local, grupo_id: local.grupoId, grupo: local.grupo, grupos: local.grupo };
  }

  async deleteLocal(id: string) {
    return prisma.stockLocalArmazenamento.delete({ where: { id } });
  }

  // ─── 4. PRODUTOS DO ESTOQUE (WMS) ────────────────────────────────────────────
  async listProdutos(grupoId?: string | null) {
    const where: any = {};
    if (grupoId) where.grupoId = grupoId;

    const produtos = await prisma.stockProduto.findMany({
      where,
      include: {
        grupo: { select: { id: true, nome: true } },
        bridgeProduct: { select: { id: true, name: true, codigo: true, tabela: true } },
      },
      orderBy: { nome: "asc" },
    });

    return produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      grupo_id: p.grupoId,
      estoque_minimo: p.estoqueMinimo,
      custo_unitario_inicial: p.custoUnitarioInicial ? Number(p.custoUnitarioInicial) : null,
      unidade_medida: p.unidadeMedida,
      foto_url: p.fotoUrl,
      bridge_product_id: p.bridgeProductId,
      grupos: { nome: p.grupo.nome },
      created_at: p.createdAt.toISOString(),
    }));
  }

  async getProdutoById(id: string) {
    const p = await prisma.stockProduto.findUnique({
      where: { id },
      include: { grupo: true, bridgeProduct: true },
    });
    if (!p) return null;
    return {
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      grupo_id: p.grupoId,
      estoque_minimo: p.estoqueMinimo,
      custo_unitario_inicial: p.custoUnitarioInicial ? Number(p.custoUnitarioInicial) : null,
      unidade_medida: p.unidadeMedida,
      foto_url: p.fotoUrl,
      grupos: { nome: p.grupo.nome },
    };
  }

  async createProduto(data: { nome: string; grupo_id: string; estoque_minimo?: number; custo_unitario_inicial?: number | null; unidade_medida: string; foto_url?: string | null; bridge_product_id?: string | null }) {
    // Gera código sequencial PRD001...
    const count = await prisma.stockProduto.count();
    const codigo = `PRD${String(count + 1).padStart(3, "0")}`;

    const produto = await prisma.stockProduto.create({
      data: {
        codigo,
        nome: data.nome,
        grupoId: data.grupo_id,
        estoqueMinimo: data.estoque_minimo || 0,
        custoUnitarioInicial: data.custo_unitario_inicial !== undefined && data.custo_unitario_inicial !== null ? data.custo_unitario_inicial : null,
        unidadeMedida: data.unidade_medida || "UN",
        fotoUrl: data.foto_url || null,
        bridgeProductId: data.bridge_product_id || null,
      },
      include: { grupo: true },
    });

    return {
      id: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      grupo_id: produto.grupoId,
      estoque_minimo: produto.estoqueMinimo,
      custo_unitario_inicial: produto.custoUnitarioInicial ? Number(produto.custoUnitarioInicial) : null,
      unidade_medida: produto.unidadeMedida,
      foto_url: produto.fotoUrl,
      grupos: { nome: produto.grupo.nome },
    };
  }

  async updateProduto(id: string, data: any) {
    const produto = await prisma.stockProduto.update({
      where: { id },
      data: {
        nome: data.nome,
        estoqueMinimo: data.estoque_minimo,
        custoUnitarioInicial: data.custo_unitario_inicial,
        unidadeMedida: data.unidade_medida,
        fotoUrl: data.foto_url,
      },
      include: { grupo: true },
    });
    return {
      ...produto,
      grupo_id: produto.grupoId,
      estoque_minimo: produto.estoqueMinimo,
      custo_unitario_inicial: produto.custoUnitarioInicial ? Number(produto.custoUnitarioInicial) : null,
      unidade_medida: produto.unidadeMedida,
      foto_url: produto.fotoUrl,
      grupos: { nome: produto.grupo.nome },
    };
  }

  async deleteProduto(id: string) {
    return prisma.stockProduto.delete({ where: { id } });
  }

  // ─── 5. FORNECEDORES WMS ─────────────────────────────────────────────────────
  async listFornecedores(_grupoId?: string | null) {
    const fornecedores = await prisma.registeredSupplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    return fornecedores.map((f) => ({
      id: f.id,
      nome: f.name,
      razao_social: f.razaoSocial,
      cnpj: f.cnpj,
      email: f.email,
      telefone: f.phone || f.telefone,
      contato_nome: f.contatoNome,
      observacoes: f.observacoes,
      grupo_id: _grupoId || null,
      created_at: f.createdAt.toISOString(),
      updated_at: f.updatedAt.toISOString(),
    }));
  }

  async createFornecedor(data: { nome: string; grupo_id?: string | null; email?: string | null; telefone?: string | null; observacoes?: string | null; cnpj?: string | null }) {
    const f = await prisma.registeredSupplier.create({
      data: {
        name: data.nome,
        cnpj: data.cnpj || null,
        email: data.email || null,
        phone: data.telefone || null,
        telefone: data.telefone || null,
        observacoes: data.observacoes || null,
      },
    });
    return {
      id: f.id,
      nome: f.name,
      email: f.email,
      telefone: f.phone || f.telefone,
      observacoes: f.observacoes,
      grupo_id: data.grupo_id || null,
      created_at: f.createdAt.toISOString(),
      updated_at: f.updatedAt.toISOString(),
    };
  }

  async updateFornecedor(id: string, data: any) {
    const f = await prisma.registeredSupplier.update({
      where: { id },
      data: {
        name: data.nome !== undefined ? data.nome : undefined,
        cnpj: data.cnpj !== undefined ? data.cnpj : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.telefone !== undefined ? data.telefone : undefined,
        telefone: data.telefone !== undefined ? data.telefone : undefined,
        observacoes: data.observacoes !== undefined ? data.observacoes : undefined,
      },
    });
    return {
      id: f.id,
      nome: f.name,
      email: f.email,
      telefone: f.phone || f.telefone,
      observacoes: f.observacoes,
      grupo_id: data.grupo_id || null,
      created_at: f.createdAt.toISOString(),
      updated_at: f.updatedAt.toISOString(),
    };
  }

  async deleteFornecedor(id: string) {
    return prisma.registeredSupplier.update({
      where: { id },
      data: { active: false },
    });
  }

  // ─── 6. PROFISSIONAIS WMS (Unificados com public.users) ──────────────────────
  async listProfissionais(_grupoId?: string | null) {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cargo: true,
        department: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return users.map((u) => ({
      id: u.id,
      nome: u.name,
      email: u.email,
      telefone: u.phone,
      cargo: u.cargo,
      department: u.department,
      user_id: u.id,
      grupo_id: _grupoId || null,
      avatar_url: u.avatarUrl,
      created_at: u.createdAt.toISOString(),
    }));
  }

  async getProfissionalByUserId(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!u) return null;
    return {
      id: u.id,
      nome: u.name,
      email: u.email,
      telefone: u.phone,
      cargo: u.cargo,
      department: u.department,
      user_id: u.id,
    };
  }

  async lookupProfissional(query: string) {
    const u = await prisma.user.findFirst({
      where: {
        OR: [
          { id: query },
          { email: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      nome: u.name,
      email: u.email,
      telefone: u.phone,
      cargo: u.cargo,
      user_id: u.id,
    };
  }

  async createProfissional(data: { nome: string; email?: string | null; telefone?: string | null; user_id?: string | null }) {
    if (data.user_id) {
      const existing = await prisma.user.findUnique({ where: { id: data.user_id } });
      if (existing) {
        return {
          id: existing.id,
          nome: existing.name,
          email: existing.email,
          telefone: existing.phone,
          user_id: existing.id,
        };
      }
    }
    const user = await prisma.user.create({
      data: {
        name: data.nome,
        email: data.email || `colaborador.${Date.now()}@gpssa.com.br`,
        passwordHash: "$2a$10$wT8hM8x15Z8/W.pW2Z0MHeYqO6H1b1dKqL6t7sJ9K8gM",
        phone: data.telefone || null,
        role: "colaborador",
      },
    });
    return {
      id: user.id,
      nome: user.name,
      email: user.email,
      telefone: user.phone,
      user_id: user.id,
    };
  }

  async updateProfissional(id: string, data: any) {
    const u = await prisma.user.update({
      where: { id },
      data: {
        name: data.nome !== undefined ? data.nome : undefined,
        email: data.email !== undefined ? data.email : undefined,
        phone: data.telefone !== undefined ? data.telefone : undefined,
      },
    });
    return {
      id: u.id,
      nome: u.name,
      email: u.email,
      telefone: u.phone,
      user_id: u.id,
    };
  }

  async deleteProfissional(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ─── 7. INVENTÁRIO & SALDO CONSOLIDADO ────────────────────────────────────────
  async getInventario(grupoId?: string | null) {
    const where: any = {};
    if (grupoId) where.grupoId = grupoId;

    const produtos = await prisma.stockProduto.findMany({
      where,
      include: {
        grupo: { select: { id: true, nome: true } },
        entradas: { select: { quantidade: true, total: true } },
        saidas: { select: { quantidade: true, total: true } },
      },
      orderBy: { nome: "asc" },
    });

    return produtos.map((p) => {
      const totalEntradas = p.entradas.reduce((acc, e) => acc + e.quantidade, 0);
      const totalSaidas = p.saidas.reduce((acc, s) => acc + s.quantidade, 0);
      const quantidadeAtual = totalEntradas - totalSaidas;

      let status = "normal";
      if (quantidadeAtual <= 0) {
        status = "esgotado";
      } else if (quantidadeAtual <= p.estoqueMinimo) {
        status = "alerta";
      }

      return {
        id: p.id,
        produto_id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        grupo_id: p.grupoId,
        grupo_nome: p.grupo.nome,
        unidade_medida: p.unidadeMedida,
        foto_url: p.fotoUrl,
        estoque_minimo: p.estoqueMinimo,
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        quantidade_atual: quantidadeAtual,
        status,
      };
    });
  }

  async getInventarioDetalhes(produtoId: string) {
    const produto = await prisma.stockProduto.findUnique({
      where: { id: produtoId },
      include: {
        grupo: true,
        entradas: {
          include: {
            localArmazenamento: true,
            centroDistribuicao: true,
            fornecedor: true,
            registradoPor: { select: { name: true } },
          },
          orderBy: { data: "desc" },
        },
        saidas: {
          include: {
            localArmazenamento: true,
            centroDistribuicao: true,
            retiradoPor: true,
            registradoPor: { select: { name: true } },
          },
          orderBy: { data: "desc" },
        },
      },
    });

    if (!produto) throw new AppError(404, "Produto não encontrado.");

    const totalEntradas = produto.entradas.reduce((acc, e) => acc + e.quantidade, 0);
    const totalSaidas = produto.saidas.reduce((acc, s) => acc + s.quantidade, 0);

    return {
      produto: {
        id: produto.id,
        nome: produto.nome,
        codigo: produto.codigo,
        estoque_minimo: produto.estoqueMinimo,
        unidade_medida: produto.unidadeMedida,
        quantidade_atual: totalEntradas - totalSaidas,
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
      },
      entradas: produto.entradas.map((e) => ({
        id: e.id,
        data: e.data.toISOString(),
        quantidade: e.quantidade,
        custo_unitario: Number(e.custoUnitario),
        total: Number(e.total),
        nota_fiscal: e.notaFiscal,
        local_nome: e.localArmazenamento?.nome,
        centro_nome: e.centroDistribuicao?.nome,
        fornecedor_nome: e.fornecedor?.name,
        registrado_por: e.registradoPor?.name,
      })),
      saidas: produto.saidas.map((s) => ({
        id: s.id,
        data: s.data.toISOString(),
        quantidade: s.quantidade,
        custo_unitario: Number(s.custoUnitario),
        total: Number(s.total),
        nota_fiscal: s.notaFiscal,
        local_nome: s.localArmazenamento?.nome,
        centro_nome: s.centroDistribuicao?.nome,
        retirado_por: s.retiradoPor?.name,
        registrado_por: s.registradoPor?.name,
      })),
    };
  }

  // ─── 8. MOVIMENTAÇÕES (Entradas e Saídas) ─────────────────────────────────────
  async listEntradas(filters: { dataInicio?: string; dataFim?: string; produtoId?: string }) {
    const where: any = {};
    if (filters.produtoId) where.produtoId = filters.produtoId;
    if (filters.dataInicio || filters.dataFim) {
      where.data = {};
      if (filters.dataInicio) where.data.gte = new Date(filters.dataInicio);
      if (filters.dataFim) where.data.lte = new Date(filters.dataFim);
    }

    const entradas = await prisma.stockEntrada.findMany({
      where,
      include: {
        produto: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } },
        localArmazenamento: { select: { id: true, nome: true } },
        centroDistribuicao: { select: { id: true, nome: true } },
        fornecedor: { select: { id: true, name: true } },
        registradoPor: { select: { id: true, name: true } },
      },
      orderBy: { data: "desc" },
    });

    return entradas.map((e) => ({
      id: e.id,
      data: e.data.toISOString(),
      produto_id: e.produtoId,
      quantidade: e.quantidade,
      custo_unitario: Number(e.custoUnitario),
      total: Number(e.total),
      nota_fiscal: e.notaFiscal,
      local_armazenamento_id: e.localArmazenamentoId,
      centro_distribuicao_id: e.centroDistribuicaoId,
      fornecedor_id: e.fornecedorId,
      produtos: e.produto,
      locais_armazenamento: e.localArmazenamento,
      centros_distribuicao: e.centroDistribuicao,
      fornecedores: e.fornecedor ? { id: e.fornecedor.id, nome: e.fornecedor.name } : null,
      registrado_por: e.registradoPor?.name,
    }));
  }

  async listSaidas(filters: { dataInicio?: string; dataFim?: string; produtoId?: string }) {
    const where: any = {};
    if (filters.produtoId) where.produtoId = filters.produtoId;
    if (filters.dataInicio || filters.dataFim) {
      where.data = {};
      if (filters.dataInicio) where.data.gte = new Date(filters.dataInicio);
      if (filters.dataFim) where.data.lte = new Date(filters.dataFim);
    }

    const saidas = await prisma.stockSaida.findMany({
      where,
      include: {
        produto: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } },
        localArmazenamento: { select: { id: true, nome: true } },
        centroDistribuicao: { select: { id: true, nome: true } },
        retiradoPor: { select: { id: true, name: true } },
        registradoPor: { select: { id: true, name: true } },
      },
      orderBy: { data: "desc" },
    });

    return saidas.map((s) => ({
      id: s.id,
      data: s.data.toISOString(),
      produto_id: s.produtoId,
      quantidade: s.quantidade,
      custo_unitario: Number(s.custoUnitario),
      total: Number(s.total),
      nota_fiscal: s.notaFiscal,
      local_armazenamento_id: s.localArmazenamentoId,
      centro_distribuicao_id: s.centroDistribuicaoId,
      retirado_por_id: s.retiradoPorId,
      retirado_por: s.retiradoPor?.name,
      produtos: s.produto,
      locais_armazenamento: s.localArmazenamento,
      centros_distribuicao: s.centroDistribuicao,
      profissionais: s.retiradoPor ? { id: s.retiradoPor.id, nome: s.retiradoPor.name } : null,
      registrado_por: s.registradoPor?.name,
    }));
  }

  async createEntrada(data: any, userId: string) {
    const custo = Number(data.custo_unitario || 0);
    const qtd = Number(data.quantidade || 1);
    const total = custo * qtd;

    const entrada = await prisma.stockEntrada.create({
      data: {
        produtoId: data.produto_id,
        quantidade: qtd,
        custoUnitario: custo,
        total,
        notaFiscal: data.nota_fiscal || null,
        localArmazenamentoId: data.local_armazenamento_id || null,
        centroDistribuicaoId: data.centro_distribuicao_id || null,
        fornecedorId: data.fornecedor_id || null,
        registradoPorUserId: userId,
        origemSistema: data.origem_sistema || "wms_manual",
      },
    });

    return { ...entrada, custo_unitario: Number(entrada.custoUnitario), total: Number(entrada.total) };
  }

  async createSaida(data: any, userId: string) {
    const custo = Number(data.custo_unitario || 0);
    const qtd = Number(data.quantidade || 1);
    const total = custo * qtd;

    const saida = await prisma.stockSaida.create({
      data: {
        produtoId: data.produto_id,
        quantidade: qtd,
        custoUnitario: custo,
        total,
        notaFiscal: data.nota_fiscal || null,
        localArmazenamentoId: data.local_armazenamento_id || null,
        centroDistribuicaoId: data.centro_distribuicao_id || null,
        retiradoPorId: data.retirado_por_id || null,
        registradoPorUserId: userId,
      },
    });

    return { ...saida, custo_unitario: Number(saida.custoUnitario), total: Number(saida.total) };
  }

  async createSaidaLote(data: { centro_distribuicao_id: string; itens: Array<{ produto_id: string; quantidade: number; custo_unitario?: number }>; responsavel_id?: string; retirado_por_id?: string; nota_fiscal?: string }, userId: string) {
    return prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of data.itens) {
        const custo = Number(item.custo_unitario || 0);
        const total = custo * item.quantidade;
        const res = await tx.stockSaida.create({
          data: {
            centroDistribuicaoId: data.centro_distribuicao_id,
            produtoId: item.produto_id,
            quantidade: item.quantidade,
            custoUnitario: custo,
            total,
            retiradoPorId: data.retirado_por_id || null,
            notaFiscal: data.nota_fiscal || null,
            registradoPorUserId: userId,
          },
        });
        created.push(res);
      }
      return created;
    });
  }

  // ─── 9. ATIVOS PATRIMONIAIS & FLUXOS ─────────────────────────────────────────
  async listPatrimonioItens(grupoId?: string | null) {
    const where: any = {};
    if (grupoId) where.grupoId = grupoId;

    const itens = await prisma.stockPatrimonioItem.findMany({
      where,
      include: {
        responsavelUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { patrimonio: "asc" },
    });

    return itens.map((i) => ({
      id: i.id,
      patrimonio: i.patrimonio,
      tipo_item: i.tipoItem,
      serial: i.serial,
      descricao: i.descricao,
      marca: i.marca,
      modelo: i.modelo,
      valor_original: i.valorOriginal ? Number(i.valorOriginal) : null,
      foto_url: i.fotoUrl,
      profissional_id: i.responsavelUserId,
      responsavel_user_id: i.responsavelUserId,
      profissional: i.responsavelUser ? { id: i.responsavelUser.id, nome: i.responsavelUser.name, email: i.responsavelUser.email } : null,
      responsavel: i.responsavelUser,
      created_at: i.createdAt.toISOString(),
    }));
  }

  async createPatrimonioItem(data: any) {
    const item = await prisma.stockPatrimonioItem.create({
      data: {
        grupoId: data.grupo_id,
        patrimonio: data.patrimonio,
        tipoItem: data.tipo_item || "equipamento",
        serial: data.serial || null,
        descricao: data.descricao || null,
        marca: data.marca || null,
        modelo: data.modelo || null,
        valorOriginal: data.valor_original ? Number(data.valor_original) : null,
        fotoUrl: data.foto_url || null,
        responsavelUserId: data.responsavel_user_id || data.profissional_id || null,
      },
    });
    return item;
  }

  async updatePatrimonioItem(id: string, data: any) {
    const item = await prisma.stockPatrimonioItem.update({
      where: { id },
      data: {
        patrimonio: data.patrimonio,
        tipoItem: data.tipo_item,
        serial: data.serial,
        descricao: data.descricao,
        marca: data.marca,
        modelo: data.modelo,
        valorOriginal: data.valor_original,
        fotoUrl: data.foto_url,
        responsavelUserId: data.responsavel_user_id !== undefined ? data.responsavel_user_id : (data.profissional_id !== undefined ? data.profissional_id : undefined),
      },
    });
    return item;
  }

  async deletePatrimonioItem(id: string) {
    return prisma.stockPatrimonioItem.delete({ where: { id } });
  }

  async listPatrimonioFluxos(itemId?: string) {
    const where: any = {};
    if (itemId) where.inventarioItemId = itemId;

    const fluxos = await prisma.stockPatrimonioFluxo.findMany({
      where,
      include: {
        eventos: { orderBy: { ordem: "asc" } },
        item: true,
      },
      orderBy: { iniciadoEm: "desc" },
    });

    return fluxos.map((f) => ({
      id: f.id,
      inventario_item_id: f.inventarioItemId,
      tipo_fluxo: f.tipoFluxo,
      status_fluxo: f.statusFluxo,
      etapa_atual: f.etapaAtual,
      motivo_inicial: f.motivoInicial,
      observacoes: f.observacoes,
      iniciado_em: f.iniciadoEm.toISOString(),
      encerrado_em: f.encerradoEm?.toISOString() || null,
      eventos: f.eventos.map((ev) => ({
        id: ev.id,
        ordem: ev.ordem,
        etapa_codigo: ev.etapaCodigo,
        etapa_nome: ev.etapaNome,
        status_evento: ev.statusEvento,
        ocorrido_em: ev.ocorridoEm.toISOString(),
        observacao: ev.observacao,
      })),
    }));
  }

  async createPatrimonioFluxo(data: { inventario_item_id: string; tipo_fluxo: string; motivo_inicial?: string; ocorrido_em?: string }) {
    const fluxo = await prisma.stockPatrimonioFluxo.create({
      data: {
        inventarioItemId: data.inventario_item_id,
        tipoFluxo: data.tipo_fluxo,
        motivoInicial: data.motivo_inicial || null,
        etapaAtual: "iniciado",
        eventos: {
          create: {
            ordem: 1,
            etapaCodigo: "inicio",
            etapaNome: "Fluxo Iniciado",
            statusEvento: "concluido",
            ocorridoEm: data.ocorrido_em ? new Date(data.ocorrido_em) : new Date(),
          },
        },
      },
      include: { eventos: true },
    });
    return fluxo;
  }

  async addPatrimonioFluxoEvento(fluxoId: string, data: any) {
    const count = await prisma.stockPatrimonioFluxoEvento.count({ where: { fluxoId } });
    const ev = await prisma.stockPatrimonioFluxoEvento.create({
      data: {
        fluxoId,
        ordem: count + 1,
        etapaCodigo: data.etapa_codigo || "evento",
        etapaNome: data.etapa_nome || "Nova Etapa",
        statusEvento: data.status_evento || "concluido",
        observacao: data.observacao || null,
      },
    });
    return ev;
  }

  async encerrarPatrimonioFluxo(fluxoId: string) {
    return prisma.stockPatrimonioFluxo.update({
      where: { id: fluxoId },
      data: {
        statusFluxo: "concluido",
        encerradoEm: new Date(),
      },
    });
  }

  // ─── 10. DASHBOARD STATS & ROLES ─────────────────────────────────────────────
  async getDashboardStats(scope: UserScope) {
    const [totalProdutos, totalCentros, totalLocais, totalItensPatrimonio] = await Promise.all([
      prisma.stockProduto.count(),
      prisma.stockCentroDistribuicao.count(),
      prisma.stockLocalArmazenamento.count(),
      prisma.stockPatrimonioItem.count(),
    ]);

    const entradas = await prisma.stockEntrada.aggregate({ _sum: { total: true, quantidade: true } });
    const saidas = await prisma.stockSaida.aggregate({ _sum: { total: true, quantidade: true } });

    return {
      totalProdutos,
      totalCentros,
      totalLocais,
      totalItensPatrimonio,
      totalEntradasQtd: entradas._sum.quantidade || 0,
      totalEntradasValor: Number(entradas._sum.total || 0),
      totalSaidasQtd: saidas._sum.quantidade || 0,
      totalSaidasValor: Number(saidas._sum.total || 0),
    };
  }

  async getUserRoles(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) return ["user"];

    if (user.role === "super_admin" || user.role === "admin") {
      return ["admin", "manager", "user"];
    }
    if (user.role === "suprimentos" || user.role === "gestor") {
      return ["manager", "user"];
    }
    return ["user"];
  }

  async getUserGroupViews(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return ["ambas"];

    if (["super_admin", "admin", "gestor", "suprimentos"].includes(user.role)) {
      return ["ambas"];
    }
    if (user.role === "assistente") {
      return ["estoque"];
    }
    if (user.role === "colaborador") {
      return ["operacional"];
    }
    return ["ambas"];
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true },
    });
    if (!user) throw new AppError(404, "Perfil de usuário não encontrado.");
    return {
      id: user.id,
      nome: user.name,
      email: user.email,
      telefone: user.phone,
      avatar_url: user.avatarUrl,
      role: user.role,
    };
  }

  async updateProfile(userId: string, data: { nome?: string; telefone?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.nome,
        phone: data.telefone,
      },
    });
    return {
      id: user.id,
      nome: user.name,
      email: user.email,
      telefone: user.phone,
    };
  }

  // ─── 11. GESTÃO ADMINISTRATIVA DE USUÁRIOS WMS (Unificados com public.users) ──
  async listAdminUsers() {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { name: "asc" },
    });

    const grupos = await prisma.stockGrupo.findMany({
      select: { id: true, nome: true, visualizacao: true, createdAt: true },
      orderBy: { nome: "asc" },
    });

    const roles: Array<{ user_id: string; role: string }> = [];
    for (const u of users) {
      roles.push({ user_id: u.id, role: "user" });
      if (["super_admin", "admin"].includes(u.role)) {
        roles.push({ user_id: u.id, role: "admin" });
        roles.push({ user_id: u.id, role: "manager" });
      } else if (["suprimentos", "gestor"].includes(u.role)) {
        roles.push({ user_id: u.id, role: "manager" });
      }
    }

    const userGrupos: Array<{ user_id: string; grupo_id: string; created_at: string | null }> = [];
    for (const u of users) {
      for (const g of grupos) {
        userGrupos.push({ user_id: u.id, grupo_id: g.id, created_at: u.createdAt.toISOString() });
      }
    }

    return {
      profiles: users.map((u) => ({
        id: u.id,
        nome: u.name,
        email: u.email,
        created_at: u.createdAt.toISOString(),
      })),
      roles,
      grupos: grupos.map((g) => ({
        id: g.id,
        nome: g.nome,
        visualizacao: (g.visualizacao as any) || "ambas",
        created_at: g.createdAt.toISOString(),
      })),
      userGrupos,
    };
  }

  async createAdminUser(data: { email: string; password?: string; nome: string }) {
    const password = data.password || "Mudar@123";
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: data.nome,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: "colaborador",
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  async updateAdminUserProfile(userId: string, data: { nome: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: data.nome },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  async setAdminUserPassword(userId: string, password: string) {
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async deleteAdminUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  async addUserRole(userId: string, role: string) {
    let bridgeRole = "colaborador";
    if (role === "admin") bridgeRole = "admin";
    else if (role === "manager") bridgeRole = "gestor";
    await prisma.user.update({
      where: { id: userId },
      data: { role: bridgeRole as any },
    });
  }

  async removeUserRole(userId: string, role: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "colaborador" as any },
    });
  }

  async addUserGrupo(userId: string, grupoId: string) {
    return { user_id: userId, grupo_id: grupoId };
  }

  async removeUserGrupo(userId: string, grupoId: string) {
    return { user_id: userId, grupo_id: grupoId };
  }

  // ─── 12. INTEGRAÇÃO DIRETA COM PEDIDOS DO BRIDGE ─────────────────────────────
  async getPendingBridgeOrders(orderId?: string) {
    const where: any = { status: { in: ["aprovado", "entregue"] } };
    if (orderId) where.id = orderId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        contract: { select: { id: true, name: true, regionalId: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return orders.map((o) => ({
      order_id: o.id,
      contract_id: o.contractId,
      contract_name: o.contract.name,
      regional_id: o.contract.regionalId,
      status: o.status,
      items: o.items.map((it) => ({
        item_id: it.id,
        product_id: it.productId,
        product_name: it.productNameSnapshot || it.product?.name,
        quantity: it.quantity,
        unit_price: Number(it.unitPrice),
      })),
    }));
  }

  async getPendingBridgeOrderDetails(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        contract: {
          include: {
            regional: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) throw new AppError(404, "Pedido não encontrado.");

    const grupo = await prisma.stockGrupo.findFirst({
      where: { regionalId: order.contract.regionalId },
      include: {
        centros: true,
        locais: true,
      },
    });

    const defaultCd = grupo?.centros[0] || await prisma.stockCentroDistribuicao.findFirst();
    const defaultLocal = grupo?.locais.find((l) => l.padrao) || grupo?.locais[0] || await prisma.stockLocalArmazenamento.findFirst();

    const results = [];
    for (const it of order.items) {
      const stockProd = await prisma.stockProduto.findFirst({
        where: {
          OR: [
            ...(it.productId ? [{ bridgeProductId: it.productId }] : []),
            { nome: it.productNameSnapshot || it.product?.name || "" },
          ],
        },
      });

      results.push({
        order_item_id: it.id,
        bridge_product_id: it.productId || "",
        bridge_product_name: it.productNameSnapshot || it.product?.name || "Produto",
        bridge_product_unidade: it.productUnidadeSnapshot || it.product?.unidade || "UN",
        bridge_product_valor_unitario: Number(it.unitPrice),
        bridge_product_image_url: it.productImageUrlSnapshot || it.product?.imageUrl || null,
        quantity_ordered: it.quantity,
        matched_stock_product_id: stockProd?.id || null,
        matched_stock_product_nome: stockProd?.nome || null,
        default_local_armazenamento_id: defaultLocal?.id || null,
        default_local_armazenamento_nome: defaultLocal?.nome || null,
        default_centro_distribuicao_id: defaultCd?.id || null,
        default_centro_distribuicao_nome: defaultCd?.nome || null,
      });
    }

    return results;
  }

  async confirmBridgeOrderReceipt(
    orderId: string,
    items: Array<{
      order_item_id?: string;
      product_id?: string;
      quantidade?: number;
      quantidade_recebida?: number;
      centro_distribuicao_id?: string;
      local_armazenamento_id?: string;
    }>,
    userId: string,
    observacao?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { contract: true },
      });
      if (!order) throw new AppError(404, "Pedido não encontrado.");

      const defaultCd = await tx.stockCentroDistribuicao.findFirst();
      const defaultLocal = await tx.stockLocalArmazenamento.findFirst();

      const createdEntradas = [];
      for (const it of items) {
        const qtd = Number(it.quantidade_recebida ?? it.quantidade ?? 0);
        if (qtd <= 0) continue;

        let productId = it.product_id;
        let unitPrice = 0;
        let productName = "";

        if (it.order_item_id) {
          const orderItem = await tx.orderItem.findUnique({
            where: { id: it.order_item_id },
            include: { product: true },
          });
          if (orderItem) {
            productId = orderItem.productId || undefined;
            unitPrice = Number(orderItem.unitPrice);
            productName = orderItem.productNameSnapshot || orderItem.product?.name || "";
          }
        }

        let stockProd = await tx.stockProduto.findFirst({
          where: {
            OR: [
              ...(productId ? [{ bridgeProductId: productId }] : []),
              ...(productName ? [{ nome: productName }] : []),
            ],
          },
        });

        if (!stockProd && productId) {
          const bridgeProd = await tx.product.findUnique({ where: { id: productId } });
          const defaultGrupo = await tx.stockGrupo.findFirst();
          if (bridgeProd && defaultGrupo) {
            stockProd = await tx.stockProduto.create({
              data: {
                codigo: bridgeProd.codigo || `PRD${Date.now().toString().slice(-4)}`,
                nome: bridgeProd.name,
                grupoId: defaultGrupo.id,
                unidadeMedida: bridgeProd.unidade,
                custoUnitarioInicial: bridgeProd.tabela,
                bridgeProductId: bridgeProd.id,
              },
            });
          }
        }

        if (stockProd) {
          const custo = unitPrice > 0 ? unitPrice : Number(stockProd.custoUnitarioInicial || 0);
          const cdId = it.centro_distribuicao_id || defaultCd?.id;
          if (!cdId) {
            throw new AppError(400, "Centro de Distribuição não encontrado para dar entrada no estoque.");
          }

          const entrada = await tx.stockEntrada.create({
            data: {
              produtoId: stockProd.id,
              quantidade: qtd,
              custoUnitario: custo,
              total: custo * qtd,
              centroDistribuicaoId: cdId,
              localArmazenamentoId: it.local_armazenamento_id || defaultLocal?.id || null,
              origemSistema: "bridge_order_sync",
              origemBridgeOrderId: order.id,
              origemBridgeOrderItemId: it.order_item_id || null,
              registradoPorUserId: userId,
            },
          });
          createdEntradas.push(entrada);
        }
      }

      const result = {
        orderId,
        status: "confirmado",
        entradasCriadas: createdEntradas.length,
      };

      void auditService.log({
        userId,
        action: "SYNC",
        entity: "Order",
        entityId: orderId,
        details: `Recebimento físico de ${createdEntradas.length} itens do Pedido ${orderId} confirmado no estoque`,
      });

      return result;
    });
  }

  async getBridgeStockIntegrationAudit() {
    const orders = await prisma.order.findMany({
      where: { status: { in: ["aprovado", "entregue"] } },
      include: {
        contract: { select: { id: true, name: true, regionalId: true } },
        items: true,
        stockEntradas: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const grupos = await prisma.stockGrupo.findMany({
      select: { id: true, nome: true, regionalId: true },
    });

    return orders.map((o) => {
      const grupo = grupos.find((g) => g.regionalId === o.contract.regionalId) || grupos[0];
      const totalEntradas = o.stockEntradas.length;
      const integrado = totalEntradas > 0;

      return {
        bridge_order_id: o.id,
        bridge_contract_id: o.contractId,
        bridge_contract_nome: o.contract.name,
        stock_grupo_id: grupo?.id || null,
        stock_grupo_nome: grupo?.nome || null,
        bridge_order_status: o.status,
        status_integracao: integrado ? "integrado" : "pendente",
        receipt_status_recebimento: integrado ? "recebido" : "pendente",
        total_itens: o.items.length,
        total_entradas: totalEntradas,
        total_produtos_criados: totalEntradas,
        order_created_at: o.createdAt.toISOString(),
        order_updated_at: o.updatedAt.toISOString(),
        processado_em: integrado && o.stockEntradas[0] ? o.stockEntradas[0].createdAt.toISOString() : null,
        detalhes: null,
      };
    });
  }
}

export const stockService = new StockService();
