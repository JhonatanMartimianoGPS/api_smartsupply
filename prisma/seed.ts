import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [Seed Rico] Iniciando carga de dados completa do GPS Bridge...");

  // ───────────────────────────────────────────────────────────────────────────
  // 1. REGIONAIS
  // ───────────────────────────────────────────────────────────────────────────
  const regionalsData = [
    { name: "São Paulo", code: "SP", externalKey: "REG_SP01" },
    { name: "Rio de Janeiro", code: "RJ", externalKey: "REG_RJ01" },
    { name: "Minas Gerais", code: "MG", externalKey: "REG_MG01" },
    { name: "Distrito Federal", code: "DF", externalKey: "REG_DF01" },
    { name: "Paraná", code: "PR", externalKey: "REG_PR01" },
  ];

  const regionalsMap = new Map<string, any>();
  for (const reg of regionalsData) {
    const regional = await prisma.regional.upsert({
      where: { code: reg.code },
      update: { name: reg.name, externalKey: reg.externalKey },
      create: reg,
    });
    regionalsMap.set(reg.code, regional);
  }
  console.log(`✅ [Seed] ${regionalsMap.size} regionais garantidas.`);

  const spRegional = regionalsMap.get("SP");
  const rjRegional = regionalsMap.get("RJ");
  const mgRegional = regionalsMap.get("MG");

  // ───────────────────────────────────────────────────────────────────────────
  // 2. USUÁRIOS DE DEMONSTRAÇÃO (Senha padrão: admin123)
  // ───────────────────────────────────────────────────────────────────────────
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash("admin123", salt);

  const usersData = [
    {
      email: "admin@gpssa.com.br",
      name: "Administrador Global",
      role: "super_admin" as const,
      department: "Tecnologia & Governança",
      cargo: "Diretor de TI",
      phone: "(11) 98765-4321",
      allRegionals: true,
    },
    {
      email: "admin.sp@gpssa.com.br",
      name: "Carlos Admin SP",
      role: "admin" as const,
      department: "Operações Sudeste",
      cargo: "Gerente Regional",
      phone: "(11) 97777-1111",
      regionals: ["SP"],
    },
    {
      email: "gestor@gpssa.com.br",
      name: "Mariana Gestora",
      role: "gestor" as const,
      department: "Gestão de Facilities",
      cargo: "Gestora de Contratos",
      phone: "(11) 98888-2222",
      regionals: ["SP", "RJ"],
    },
    {
      email: "suprimentos@gpssa.com.br",
      name: "Roberto Suprimentos",
      role: "suprimentos" as const,
      department: "Compras Corporativas",
      cargo: "Coordenador de Suprimentos",
      phone: "(11) 99999-3333",
      allRegionals: true,
    },
    {
      email: "assistente@gpssa.com.br",
      name: "Lucas Assistente",
      role: "assistente" as const,
      department: "Operações Hospitalares",
      cargo: "Assistente Operacional",
      phone: "(11) 96666-4444",
      regionals: ["SP"],
    },
    {
      email: "colaborador@gpssa.com.br",
      name: "Fernanda Colaboradora",
      role: "colaborador" as const,
      department: "Recepção e Serviços",
      cargo: "Líder de Atendimento",
      phone: "(11) 95555-5555",
      regionals: ["SP"],
    },
  ];

  const usersMap = new Map<string, any>();
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        department: u.department,
        cargo: u.cargo,
        phone: u.phone,
        isActive: true,
        isBlocked: false,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: defaultPasswordHash,
        role: u.role,
        department: u.department,
        cargo: u.cargo,
        phone: u.phone,
        isActive: true,
        isBlocked: false,
      },
    });
    usersMap.set(u.email, user);

    // Vínculo regional
    const targetRegs = u.allRegionals
      ? Array.from(regionalsMap.values())
      : (u.regionals || []).map((code) => regionalsMap.get(code)).filter(Boolean);

    for (const r of targetRegs) {
      await prisma.userRegional.upsert({
        where: { userId_regionalId: { userId: user.id, regionalId: r.id } },
        update: {},
        create: { userId: user.id, regionalId: r.id },
      });
    }
  }
  console.log(`✅ [Seed] ${usersMap.size} usuários de teste criados com senha 'admin123'.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CATEGORIAS DE PRODUTOS & CONTRATOS (Globais)
  // ───────────────────────────────────────────────────────────────────────────
  const prodCategoriesData = [
    { name: "Higiene & Limpeza", code: "HIG_LIMP", icon: "Sparkles", description: "Produtos químicos e materiais de asseio" },
    { name: "Descartáveis & Copa", code: "DESC_COPA", icon: "Coffee", description: "Copos, guardanapos e papéis descartáveis" },
    { name: "Equipamentos & Acessórios", code: "EQUIP_ACES", icon: "Wrench", description: "Mops, baldes, carros funcionais e rodos" },
    { name: "EPIs & Segurança", code: "EPI_SEG", icon: "Shield", description: "Equipamentos de proteção individual e uniformes" },
    { name: "Químicos Concentrados", code: "QUIM_CONC", icon: "FlaskConical", description: "Detergentes, desinfetantes e solventes industriais" },
  ];

  const prodCatMap = new Map<string, any>();
  for (const pc of prodCategoriesData) {
    const cat = await prisma.productCategory.upsert({
      where: { code: pc.code },
      update: { name: pc.name, icon: pc.icon, description: pc.description },
      create: pc,
    });
    prodCatMap.set(pc.code, cat);
  }

  const contractCategoriesData = [
    { name: "Hospitalar & Saúde", color: "#10B981" },
    { name: "Corporativo & Escritórios", color: "#3B82F6" },
    { name: "Industrial & Fábricas", color: "#F59E0B" },
    { name: "Educação & Universidades", color: "#8B5CF6" },
  ];

  const contractCatMap = new Map<string, any>();
  for (const cc of contractCategoriesData) {
    const existing = await prisma.contractCategory.findFirst({ where: { name: cc.name } });
    if (existing) {
      contractCatMap.set(cc.name, existing);
    } else {
      const created = await prisma.contractCategory.create({ data: cc });
      contractCatMap.set(cc.name, created);
    }
  }
  console.log("✅ [Seed] Categorias de produtos e contratos cadastradas.");

  // ───────────────────────────────────────────────────────────────────────────
  // 4. FORNECEDORES HOMOLOGADOS
  // ───────────────────────────────────────────────────────────────────────────
  const suppliersData = [
    {
      name: "CleanPro Distribuidora de Limpeza Ltda",
      tradeName: "CleanPro Distribuidora",
      razaoSocial: "CleanPro Distribuidora de Limpeza Ltda",
      cnpj: "12.345.678/0001-90",
      email: "pedidos@cleanpro.com.br",
      phone: "(11) 3214-5500",
      telefone: "(11) 3214-5500",
      contatoNome: "Eduardo Silveira",
      city: "São Paulo",
      state: "SP",
    },
    {
      name: "SulPack Descartáveis & Embalagens",
      tradeName: "SulPack Embalagens",
      razaoSocial: "SulPack Descartáveis Indústria e Comércio Ltda",
      cnpj: "23.456.789/0001-01",
      email: "vendas@sulpack.com.br",
      phone: "(11) 4002-8922",
      telefone: "(11) 4002-8922",
      contatoNome: "Juliana Mendes",
      city: "Guarulhos",
      state: "SP",
    },
    {
      name: "SafeTech Equipamentos de Proteção Individual",
      tradeName: "SafeTech EPIs",
      razaoSocial: "SafeTech Soluções em Segurança do Trabalho Ltda",
      cnpj: "34.567.890/0001-12",
      email: "corporativo@safetech.com.br",
      phone: "(21) 2555-9000",
      telefone: "(21) 2555-9000",
      contatoNome: "Marcos Vinicius",
      city: "Rio de Janeiro",
      state: "RJ",
    },
  ];

  const suppliersMap = new Map<string, any>();
  for (const s of suppliersData) {
    const supplier = await prisma.registeredSupplier.upsert({
      where: { cnpj: s.cnpj },
      update: s,
      create: s,
    });
    suppliersMap.set(s.tradeName, supplier);

    // Vínculo regional do fornecedor
    await prisma.supplierRegional.upsert({
      where: { supplierId_regionalId: { supplierId: supplier.id, regionalId: spRegional.id } },
      update: {},
      create: {
        supplierId: supplier.id,
        regionalId: spRegional.id,
        deliveryLeadTimeDays: 2,
        minOrderValue: 200,
        freeShippingThreshold: 500,
      },
    });
  }
  console.log("✅ [Seed] Fornecedores homologados e prazos por regional cadastrados.");

  const cleanPro = suppliersMap.get("CleanPro Distribuidora");
  const sulPack = suppliersMap.get("SulPack Embalagens");
  const safeTech = suppliersMap.get("SafeTech EPIs");

  // ───────────────────────────────────────────────────────────────────────────
  // 5. CONTRATOS OPERACIONAIS & TETO ORÇAMENTÁRIO
  // ───────────────────────────────────────────────────────────────────────────
  const contractsData = [
    {
      name: "Hospital Sírio-Libanês SP",
      code: "CTR-HOSP-001",
      regionalId: spRegional.id,
      categoryId: contractCatMap.get("Hospitalar & Saúde")?.id,
      totalBudget: 85000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
    },
    {
      name: "Torre Santander Faria Lima SP",
      code: "CTR-CORP-002",
      regionalId: spRegional.id,
      categoryId: contractCatMap.get("Corporativo & Escritórios")?.id,
      totalBudget: 60000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
    },
    {
      name: "Aeroporto Internacional Galeão RJ",
      code: "CTR-AERO-003",
      regionalId: rjRegional.id,
      categoryId: contractCatMap.get("Corporativo & Escritórios")?.id,
      totalBudget: 120000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
    },
    {
      name: "Complexo Industrial Betim MG",
      code: "CTR-IND-004",
      regionalId: mgRegional.id,
      categoryId: contractCatMap.get("Industrial & Fábricas")?.id,
      totalBudget: 95000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
    },
  ];

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const contractsMap = new Map<string, any>();
  for (const c of contractsData) {
    const existing = await prisma.contract.findFirst({ where: { code: c.code } });
    let contract;
    if (existing) {
      contract = await prisma.contract.update({
        where: { id: existing.id },
        data: c,
      });
    } else {
      contract = await prisma.contract.create({ data: c });
    }
    contractsMap.set(c.code, contract);

    // Cria período orçamentário do mês corrente
    await prisma.contractBudgetPeriod.upsert({
      where: { contractId_periodMonth: { contractId: contract.id, periodMonth: currentMonthKey } },
      update: { monthlyBudget: c.totalBudget },
      create: {
        contractId: contract.id,
        periodMonth: currentMonthKey,
        monthlyBudget: c.totalBudget,
        usedBudget: 0,
      },
    });

    // Vincula contratos aos usuários Gestor e Assistente
    const gestorUser = usersMap.get("gestor@gpssa.com.br");
    const assistenteUser = usersMap.get("assistente@gpssa.com.br");

    if (gestorUser) {
      await prisma.userContract.upsert({
        where: { userId_contractId: { userId: gestorUser.id, contractId: contract.id } },
        update: {},
        create: { userId: gestorUser.id, contractId: contract.id },
      });
    }

    if (assistenteUser && c.regionalId === spRegional.id) {
      await prisma.userContract.upsert({
        where: { userId_contractId: { userId: assistenteUser.id, contractId: contract.id } },
        update: {},
        create: { userId: assistenteUser.id, contractId: contract.id },
      });
    }
  }
  console.log("✅ [Seed] Contratos operacionais vinculados a gestores e assistentes.");

  const sirioLibanes = contractsMap.get("CTR-HOSP-001");
  const torreSantander = contractsMap.get("CTR-CORP-002");

  // ───────────────────────────────────────────────────────────────────────────
  // 6. CATÁLOGO DE PRODUTOS OPERACIONAIS
  // ───────────────────────────────────────────────────────────────────────────
  const productsData = [
    // Higiene & Limpeza
    { name: "Detergente Neutro Concentrado 5L", codigo: "LIMP-001", unidade: "GL", tabela: 28.5, categoryCode: "HIG_LIMP", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Desinfetante Hospitalar Quaternário 5L", codigo: "LIMP-002", unidade: "GL", tabela: 64.9, categoryCode: "QUIM_CONC", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Álcool em Gel 70% 500ml com Válvula Pump", codigo: "LIMP-003", unidade: "FR", tabela: 14.9, categoryCode: "HIG_LIMP", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Sabonete Líquido Erva Doce 5L", codigo: "LIMP-004", unidade: "GL", tabela: 38.0, categoryCode: "HIG_LIMP", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Cloro Ativo 5L 2.5%", codigo: "LIMP-005", unidade: "GL", tabela: 19.9, categoryCode: "QUIM_CONC", supplier: cleanPro, regionalId: spRegional.id },
    
    // Descartáveis & Copa
    { name: "Papel Toalha Interfolhado 2 Dobras 100% Celulose (cx 2000 fls)", codigo: "DESC-001", unidade: "CX", tabela: 45.9, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },
    { name: "Papel Higiênico Rolão Folha Dupla 300m (fardo 8 rolos)", codigo: "DESC-002", unidade: "FD", tabela: 72.0, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },
    { name: "Saco de Lixo Preto Reforçado 100L (pacote 100 un)", codigo: "DESC-003", unidade: "PC", tabela: 55.0, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },
    { name: "Saco de Lixo Branco Infectante 100L (pacote 100 un)", codigo: "DESC-004", unidade: "PC", tabela: 68.0, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },
    { name: "Copo Descartável 200ml Água (cx 2500 un)", codigo: "DESC-005", unidade: "CX", tabela: 89.0, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },
    { name: "Copo Descartável 50ml Café (cx 3000 un)", codigo: "DESC-006", unidade: "CX", tabela: 62.0, categoryCode: "DESC_COPA", supplier: sulPack, regionalId: spRegional.id },

    // EPIs & Segurança
    { name: "Luva Nitrílica Descartável Azul M (cx 100 un)", codigo: "EPI-001", unidade: "CX", tabela: 42.0, categoryCode: "EPI_SEG", supplier: safeTech, regionalId: spRegional.id },
    { name: "Luva Nitrílica Descartável Azul G (cx 100 un)", codigo: "EPI-002", unidade: "CX", tabela: 42.0, categoryCode: "EPI_SEG", supplier: safeTech, regionalId: spRegional.id },
    { name: "Óculos de Proteção Ampla Visão Antirrisco", codigo: "EPI-003", unidade: "UN", tabela: 18.5, categoryCode: "EPI_SEG", supplier: safeTech, regionalId: spRegional.id },
    { name: "Máscara Descartável Tripla com Elástico (cx 50 un)", codigo: "EPI-004", unidade: "CX", tabela: 16.0, categoryCode: "EPI_SEG", supplier: safeTech, regionalId: spRegional.id },
    { name: "Bota de PVC Branca de Segurança Cano Médio 40", codigo: "EPI-005", unidade: "PAR", tabela: 65.0, categoryCode: "EPI_SEG", supplier: safeTech, regionalId: spRegional.id },

    // Equipamentos & Acessórios
    { name: "Mop Giratório Profissional com Balde 15L", codigo: "EQP-001", unidade: "KIT", tabela: 145.0, categoryCode: "EQUIP_ACES", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Refil Mop Líquido Algodão Ponta Dobrada 340g", codigo: "EQP-002", unidade: "UN", tabela: 22.0, categoryCode: "EQUIP_ACES", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Rodo de Alumínio Reforçado Duplo 60cm", codigo: "EQP-003", unidade: "UN", tabela: 48.0, categoryCode: "EQUIP_ACES", supplier: cleanPro, regionalId: spRegional.id },
    { name: "Pano Multiuso Tipo Perflex Bobina 300m", codigo: "EQP-004", unidade: "RL", tabela: 79.0, categoryCode: "EQUIP_ACES", supplier: cleanPro, regionalId: spRegional.id },
  ];

  const productsMap = new Map<string, any>();
  for (const p of productsData) {
    const category = prodCatMap.get(p.categoryCode);
    const existing = await prisma.product.findFirst({ where: { codigo: p.codigo } });
    let prod;
    if (existing) {
      prod = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          unidade: p.unidade,
          tabela: p.tabela,
          categoryId: category?.id,
          supplierId: p.supplier?.id,
          regionalId: p.regionalId,
        },
      });
    } else {
      prod = await prisma.product.create({
        data: {
          codigo: p.codigo,
          name: p.name,
          unidade: p.unidade,
          tabela: p.tabela,
          categoryId: category?.id,
          supplierId: p.supplier?.id,
          regionalId: p.regionalId,
        },
      });
    }
    productsMap.set(p.codigo, prod);
  }
  console.log(`✅ [Seed] ${productsMap.size} produtos cadastrados no catálogo.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 7. PEDIDOS MENSAIS & EXTRAS DE DEMONSTRAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  const assistente = usersMap.get("assistente@gpssa.com.br");
  const gestor = usersMap.get("gestor@gpssa.com.br");

  if (assistente && sirioLibanes && torreSantander) {
    // Pedido 1: Mensal Aprovado para Sírio-Libanês
    const existingOrder1 = await prisma.order.findFirst({
      where: { contractId: sirioLibanes.id, isExtraOrder: false, mes: now.getMonth() + 1, ano: now.getFullYear() },
    });

    if (!existingOrder1) {
      const itemsP1 = [
        { prod: productsMap.get("LIMP-002"), qty: 15 }, // Desinfetante Hospitalar
        { prod: productsMap.get("DESC-004"), qty: 20 }, // Saco Infectante
        { prod: productsMap.get("EPI-001"), qty: 30 },  // Luva M
        { prod: productsMap.get("DESC-001"), qty: 25 }, // Papel toalha
      ];

      const totalP1 = itemsP1.reduce((acc, it) => acc + Number(it.prod.tabela) * it.qty, 0);

      await prisma.order.create({
        data: {
          contractId: sirioLibanes.id,
          createdById: assistente.id,
          status: "aprovado",
          mes: now.getMonth() + 1,
          ano: now.getFullYear(),
          isExtraOrder: false,
          notes: "Pedido mensal regular para suprimento das alas cirúrgicas e pronto atendimento.",
          totalAmount: totalP1,
          items: {
            create: itemsP1.map((it) => ({
              productId: it.prod.id,
              quantity: it.qty,
              unitPrice: it.prod.tabela,
              productNameSnapshot: it.prod.name,
              productCodigoSnapshot: it.prod.codigo,
              productUnidadeSnapshot: it.prod.unidade,
              productCategoriaSnapshot: "Hospitalar",
              productFornecedorSnapshot: "CleanPro Distribuidora",
            })),
          },
          history: {
            create: [
              { userId: assistente.id, action: "Criação do Pedido Mensal", details: "Lançamento inicial", newStatus: "pendente" },
              { userId: gestor?.id, action: "Aprovação pelo Gestor", details: "Orçamento dentro do limite contratual", oldStatus: "pendente", newStatus: "aprovado" },
            ],
          },
        },
      });

      // Atualiza o orçamento consumido do contrato
      await prisma.contract.update({
        where: { id: sirioLibanes.id },
        data: { usedBudget: totalP1 },
      });

      await prisma.contractBudgetPeriod.update({
        where: { contractId_periodMonth: { contractId: sirioLibanes.id, periodMonth: currentMonthKey } },
        data: { usedBudget: totalP1 },
      });
    }

    // Pedido 2: Mensal Pendente de Aprovação para Torre Santander
    const existingOrder2 = await prisma.order.findFirst({
      where: { contractId: torreSantander.id, isExtraOrder: false, mes: now.getMonth() + 1, ano: now.getFullYear() },
    });

    if (!existingOrder2) {
      const itemsP2 = [
        { prod: productsMap.get("DESC-001"), qty: 40 }, // Papel Toalha
        { prod: productsMap.get("DESC-005"), qty: 15 }, // Copo Água
        { prod: productsMap.get("DESC-006"), qty: 10 }, // Copo Café
        { prod: productsMap.get("LIMP-001"), qty: 12 }, // Detergente
      ];

      const totalP2 = itemsP2.reduce((acc, it) => acc + Number(it.prod.tabela) * it.qty, 0);

      await prisma.order.create({
        data: {
          contractId: torreSantander.id,
          createdById: assistente.id,
          status: "pendente",
          mes: now.getMonth() + 1,
          ano: now.getFullYear(),
          isExtraOrder: false,
          notes: "Reposição mensal dos andares 10 ao 22.",
          totalAmount: totalP2,
          items: {
            create: itemsP2.map((it) => ({
              productId: it.prod.id,
              quantity: it.qty,
              unitPrice: it.prod.tabela,
              productNameSnapshot: it.prod.name,
              productCodigoSnapshot: it.prod.codigo,
              productUnidadeSnapshot: it.prod.unidade,
              productCategoriaSnapshot: "Corporativo",
            })),
          },
          history: {
            create: { userId: assistente.id, action: "Criação do Pedido Mensal", details: "Aguardando aprovação", newStatus: "pendente" },
          },
        },
      });
    }
    console.log("✅ [Seed] Pedidos Mensais de demonstração criados (Aprovado e Pendente).");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. TIPOS DE CHAMADOS & CHAMADOS DE TESTE
  // ───────────────────────────────────────────────────────────────────────────
  const ticketTypesData = [
    { name: "Manutenção Predial Hidráulica", slaHours: 24 },
    { name: "Manutenção Elétrica & Iluminação", slaHours: 48 },
    { name: "Reparo em Ar Condicionado & Climatização", slaHours: 24 },
    { name: "Reposição Emergencial de Materiais", slaHours: 12 },
    { name: "Controle de Pragas & Desinfecção", slaHours: 72 },
  ];

  const ticketTypesMap = new Map<string, any>();
  for (const tt of ticketTypesData) {
    const existing = await prisma.ticketType.findFirst({ where: { name: tt.name } });
    if (existing) {
      ticketTypesMap.set(tt.name, existing);
    } else {
      const created = await prisma.ticketType.create({ data: tt });
      ticketTypesMap.set(tt.name, created);
    }
  }

  const colaborador = usersMap.get("colaborador@gpssa.com.br");
  if (colaborador && sirioLibanes) {
    const existingTicket = await prisma.serviceTicket.findFirst({
      where: { contractId: sirioLibanes.id },
    });

    if (!existingTicket) {
      const ticket = await prisma.serviceTicket.create({
        data: {
          title: "Vazamento no banheiro do 3º andar (Ala Norte)",
          description: "Identificado vazamento sob a bancada da pia principal. Risco de alagamento se não reparado.",
          contractId: sirioLibanes.id,
          regionalId: spRegional.id,
          typeId: ticketTypesMap.get("Manutenção Predial Hidráulica")?.id,
          createdById: colaborador.id,
          status: "em_atendimento",
          priority: "alta",
          slaHours: 24,
          steps: {
            create: [
              { title: "Inspeção técnica inicial no local", completed: true, order: 1, completedAt: new Date() },
              { title: "Troca do sifão e vedação com silicone", completed: true, order: 2, completedAt: new Date() },
              { title: "Teste de estanqueidade e liberação do sanitário", completed: false, order: 3 },
            ],
          },
          messages: {
            create: [
              { userId: colaborador.id, message: "Chamado aberto com urgência devido ao fluxo intenso de pacientes." },
              { userId: gestor?.id || colaborador.id, message: "Equipe técnica de prontidão já acionada. Técnico em trânsito." },
            ],
          },
        },
      });
      console.log(`✅ [Seed] Chamado de serviço criado com checklist e mensagens (ID: ${ticket.id}).`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. MURAL SOCIAL (FEED CORPORATIVO)
  // ───────────────────────────────────────────────────────────────────────────
  const admin = usersMap.get("admin@gpssa.com.br");
  const suprimentos = usersMap.get("suprimentos@gpssa.com.br");

  if (admin && suprimentos) {
    const existingPost = await prisma.feedPost.findFirst();
    if (!existingPost) {
      const post1 = await prisma.feedPost.create({
        data: {
          userId: suprimentos.id,
          title: "📢 Atenção: Cronograma de Fechamento de Pedidos - Outubro/2026",
          content: "Prezados Gestores e Assistentes, informamos que a janela de fechamento de pedidos mensais para competência Outubro encerra-se no dia 20 às 18h. Favor revisar os orçamentos disponíveis antes do envio.",
          pinned: true,
          comments: {
            create: [
              { userId: gestor?.id || admin.id, content: "Obrigado pelo aviso, Roberto! Nossos contratos de SP já estão em conferência final." },
            ],
          },
          likes: {
            create: [
              { userId: admin.id },
              { userId: assistente?.id || admin.id },
            ],
          },
        },
      });

      const post2 = await prisma.feedPost.create({
        data: {
          userId: admin.id,
          title: "🚀 Bem-vindos ao Novo GPS Bridge!",
          content: "A plataforma agora opera com infraestrutura renovada, maior estabilidade e conexão direta de alta performance. Bom trabalho a todas as equipes regionais!",
          pinned: false,
          likes: {
            create: [
              { userId: suprimentos.id },
            ],
          },
        },
      });
      console.log("✅ [Seed] Postagens institucionais adicionadas ao Feed Social.");
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. NOTIFICAÇÕES & VITRINE DA EQUIPE
  // ───────────────────────────────────────────────────────────────────────────
  if (assistente) {
    await prisma.appNotification.createMany({
      data: [
        {
          userId: assistente.id,
          title: "Pedido Aprovado!",
          message: "Seu Pedido Mensal do Hospital Sírio-Libanês foi aprovado pelo Gestor.",
          link: "/pedido-mensal",
          isRead: false,
        },
        {
          userId: assistente.id,
          title: "Novo Chamado em Andamento",
          message: "O chamado sobre o vazamento no 3º andar está com técnico em atendimento.",
          link: "/chamados",
          isRead: false,
        },
      ],
      skipDuplicates: true,
    });
  }

  // Membros da equipe para vitrine
  await prisma.teamMember.createMany({
    data: [
      { name: "Roberto Silva", role: "Coordenador de Suprimentos", email: "suprimentos@gpssa.com.br", phone: "(11) 99999-3333", regionalId: spRegional.id },
      { name: "Mariana Costa", role: "Gestora de Contratos Sudeste", email: "gestor@gpssa.com.br", phone: "(11) 98888-2222", regionalId: spRegional.id },
      { name: "Carlos Eduardo", role: "Gerente Regional SP", email: "admin.sp@gpssa.com.br", phone: "(11) 97777-1111", regionalId: spRegional.id },
    ],
    skipDuplicates: true,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. CONFIGURAÇÕES DO SISTEMA (APP_CONFIG)
  // ───────────────────────────────────────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: { minimumClientVersion: "1.0.0", maintenanceMode: false },
    create: { id: "default", minimumClientVersion: "1.0.0", maintenanceMode: false },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. MÓDULO DE CONTROLE DE ESTOQUE (WMS UNIFICADO)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📦 [Seed] Iniciando carga do Módulo de Estoque (GPS Stock / WMS)...");

  // Grupos de Estoque
  let grupoSP = await prisma.stockGrupo.findFirst({ where: { nome: "Operação São Paulo & Facilities" } });
  if (!grupoSP) {
    grupoSP = await prisma.stockGrupo.create({
      data: {
        nome: "Operação São Paulo & Facilities",
        visualizacao: "ambas",
        regionalId: spRegional.id,
        contractId: sirioLibanes.id,
      },
    });
  }

  let grupoRJ = await prisma.stockGrupo.findFirst({ where: { nome: "Operação Rio de Janeiro" } });
  if (!grupoRJ) {
    grupoRJ = await prisma.stockGrupo.create({
      data: {
        nome: "Operação Rio de Janeiro",
        visualizacao: "ambas",
        regionalId: rjRegional.id,
      },
    });
  }

  // Centros de Distribuição
  let cdBarueri = await prisma.stockCentroDistribuicao.findFirst({ where: { nome: "CD Barueri - Central SP" } });
  if (!cdBarueri) {
    cdBarueri = await prisma.stockCentroDistribuicao.create({
      data: {
        grupoId: grupoSP.id,
        regionalId: spRegional.id,
        nome: "CD Barueri - Central SP",
        endereco: "Alameda Rio Negro, 500 - Alphaville, Barueri - SP",
        responsavel: "Roberto Silva",
        telefone: "(11) 4195-2000",
      },
    });
  }

  let cdCaxias = await prisma.stockCentroDistribuicao.findFirst({ where: { nome: "CD Duque de Caxias - Hub RJ" } });
  if (!cdCaxias) {
    cdCaxias = await prisma.stockCentroDistribuicao.create({
      data: {
        grupoId: grupoRJ.id,
        regionalId: rjRegional.id,
        nome: "CD Duque de Caxias - Hub RJ",
        endereco: "Rodovia Washington Luiz, KM 122 - Duque de Caxias - RJ",
        responsavel: "Carlos Eduardo",
        telefone: "(21) 3655-1000",
      },
    });
  }

  // Locais de Armazenamento
  let almoxPrincipal = await prisma.stockLocalArmazenamento.findFirst({ where: { nome: "Almoxarifado Principal (A-1)" } });
  if (!almoxPrincipal) {
    almoxPrincipal = await prisma.stockLocalArmazenamento.create({
      data: {
        grupoId: grupoSP.id,
        centroDistribuicaoId: cdBarueri.id,
        nome: "Almoxarifado Principal (A-1)",
        observacoes: "Galpão climatizado para químicos e descartáveis",
        padrao: true,
      },
    });
  }

  let prateleiraEPI = await prisma.stockLocalArmazenamento.findFirst({ where: { nome: "Setor EPIs & Uniformes" } });
  if (!prateleiraEPI) {
    prateleiraEPI = await prisma.stockLocalArmazenamento.create({
      data: {
        grupoId: grupoSP.id,
        centroDistribuicaoId: cdBarueri.id,
        nome: "Setor EPIs & Uniformes",
        observacoes: "Prateleiras suspensas B2 a B5",
        padrao: false,
      },
    });
  }

  let docaRecebimento = await prisma.stockLocalArmazenamento.findFirst({ where: { nome: "Doca de Recebimento & Triagem" } });
  if (!docaRecebimento) {
    docaRecebimento = await prisma.stockLocalArmazenamento.create({
      data: {
        grupoId: grupoSP.id,
        centroDistribuicaoId: cdBarueri.id,
        nome: "Doca de Recebimento & Triagem",
        observacoes: "Área de conferência fiscal e recebimento físico",
        padrao: false,
      },
    });
  }

  // Fornecedores e Profissionais WMS já unificados com RegisteredSupplier e User
  const profColaborador = usersMap.get("colaborador@gpssa.com.br");

  // Produtos WMS (Vinculados a catálogo do Bridge)
  const stockProductsToSeed = [
    { codigo: "WMS-LIMP-001", bridgeCode: "LIMP-001", nome: "Detergente Neutro Concentrado 5L", min: 30, unit: "GL", custo: 28.5 },
    { codigo: "WMS-LIMP-002", bridgeCode: "LIMP-002", nome: "Desinfetante Hospitalar Quaternário 5L", min: 20, unit: "GL", custo: 64.9 },
    { codigo: "WMS-LIMP-003", bridgeCode: "LIMP-003", nome: "Álcool em Gel 70% 500ml com Pump", min: 50, unit: "FR", custo: 14.9 },
    { codigo: "WMS-DESC-001", bridgeCode: "DESC-001", nome: "Papel Toalha Interfolhado 2 Dobras 100% Celulose", min: 40, unit: "CX", custo: 45.9 },
    { codigo: "WMS-DESC-003", bridgeCode: "DESC-003", nome: "Saco de Lixo Preto Reforçado 100L", min: 60, unit: "PC", custo: 55.0 },
    { codigo: "WMS-EPI-001", bridgeCode: "EPI-001", nome: "Luva Nitrílica Descartável Azul M (cx 100 un)", min: 50, unit: "CX", custo: 42.0 },
    { codigo: "WMS-EQP-001", bridgeCode: "EQP-001", nome: "Mop Giratório Profissional com Balde 15L", min: 10, unit: "KIT", custo: 145.0 },
  ];

  const stockProdMap = new Map<string, any>();
  for (const p of stockProductsToSeed) {
    const bridgeProd = productsMap.get(p.bridgeCode);
    let stockProd = await prisma.stockProduto.findUnique({ where: { codigo: p.codigo } });
    if (!stockProd) {
      stockProd = await prisma.stockProduto.create({
        data: {
          codigo: p.codigo,
          nome: p.nome,
          grupoId: grupoSP.id,
          estoqueMinimo: p.min,
          unidadeMedida: p.unit,
          custoUnitarioInicial: p.custo,
          bridgeProductId: bridgeProd?.id || null,
        },
      });
    }
    stockProdMap.set(p.codigo, stockProd);
  }

  // Movimentações Iniciais de Estoque (Entradas para saldo)
  const pLimp1 = stockProdMap.get("WMS-LIMP-001");
  const pLimp2 = stockProdMap.get("WMS-LIMP-002");
  const pDesc1 = stockProdMap.get("WMS-DESC-001");
  const pEpi1 = stockProdMap.get("WMS-EPI-001");

  const entradasCount = await prisma.stockEntrada.count();
  if (entradasCount === 0 && suprimentos && pLimp1 && pLimp2 && pDesc1 && pEpi1) {
    // Entrada 1: Químicos
    await prisma.stockEntrada.create({
      data: {
        produtoId: pLimp1.id,
        quantidade: 120,
        custoUnitario: 28.5,
        total: 120 * 28.5,
        notaFiscal: "NF-89211",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: almoxPrincipal.id,
        fornecedorId: cleanPro?.id || null,
        registradoPorUserId: suprimentos.id,
        origemSistema: "wms_manual",
      },
    });

    await prisma.stockEntrada.create({
      data: {
        produtoId: pLimp2.id,
        quantidade: 80,
        custoUnitario: 64.9,
        total: 80 * 64.9,
        notaFiscal: "NF-89211",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: almoxPrincipal.id,
        fornecedorId: cleanPro?.id || null,
        registradoPorUserId: suprimentos.id,
        origemSistema: "wms_manual",
      },
    });

    // Entrada 2: Descartáveis e EPIs
    await prisma.stockEntrada.create({
      data: {
        produtoId: pDesc1.id,
        quantidade: 200,
        custoUnitario: 45.9,
        total: 200 * 45.9,
        notaFiscal: "NF-90412",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: almoxPrincipal.id,
        fornecedorId: sulPack?.id || null,
        registradoPorUserId: suprimentos.id,
        origemSistema: "wms_manual",
      },
    });

    await prisma.stockEntrada.create({
      data: {
        produtoId: pEpi1.id,
        quantidade: 150,
        custoUnitario: 42.0,
        total: 150 * 42.0,
        notaFiscal: "NF-90412",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: prateleiraEPI.id,
        fornecedorId: cleanPro?.id || null,
        registradoPorUserId: suprimentos.id,
        origemSistema: "wms_manual",
      },
    });

    // Saída Inicial: Atendimento Operacional
    await prisma.stockSaida.create({
      data: {
        produtoId: pDesc1.id,
        quantidade: 15,
        custoUnitario: 45.9,
        total: 15 * 45.9,
        notaFiscal: "REQ-00109",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: almoxPrincipal.id,
        retiradoPorId: profColaborador?.id || null,
        registradoPorUserId: suprimentos.id,
      },
    });
    console.log("✅ [Seed] Movimentações iniciais de estoque (entradas e saídas) registradas.");
  }

  // Ativo Patrimonial e Fluxo de Gestão
  const existingPatrimonio = await prisma.stockPatrimonioItem.findUnique({
    where: { patrimonio: "PAT-00452" },
  });

  if (!existingPatrimonio && admin) {
    const itemPatrimonio = await prisma.stockPatrimonioItem.create({
      data: {
        grupoId: grupoSP.id,
        patrimonio: "PAT-00452",
        tipoItem: "equipamento",
        serial: "SN-KARCH-2026-9921",
        descricao: "Lavadora e Secadora de Pisos Automática B 40 C",
        marca: "Kärcher",
        modelo: "B 40 C Ep",
        valorOriginal: 12500.0,
        responsavelUserId: admin.id,
      },
    });

    const fluxo = await prisma.stockPatrimonioFluxo.create({
      data: {
        inventarioItemId: itemPatrimonio.id,
        tipoFluxo: "entrega",
        statusFluxo: "ativo",
        etapaAtual: "em_uso",
        motivoInicial: "Alocação do equipamento no contrato do Hospital Sírio-Libanês",
        iniciadoEm: new Date(),
        eventos: {
          create: [
            {
              ordem: 1,
              etapaCodigo: "vistoria_entrada",
              etapaNome: "Vistoria Técnica de Entrada",
              statusEvento: "concluido",
              observacao: "Equipamento novo recebido com manuais e bateria carregada.",
            },
            {
              ordem: 2,
              etapaCodigo: "termo_responsabilidade",
              etapaNome: "Assinatura do Termo de Cautela",
              statusEvento: "concluido",
              observacao: "Termo assinado pelo líder operacional local.",
            },
          ],
        },
      },
    });
    console.log(`✅ [Seed] Ativo patrimonial cadastrado com fluxo de vida útil (ID: ${itemPatrimonio.id}).`);
  }

  console.log("🎉 [Seed Rico] Carga completa finalizada com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ [Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
