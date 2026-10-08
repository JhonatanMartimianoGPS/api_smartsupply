import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 [Seed Rico] Iniciando carga de dados completa do GPS Bridge / SmartSupply...");

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
      regionals: ["SP", "RJ", "MG"],
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
  console.log(`✅ [Seed] ${usersMap.size} usuários de teste garantidos com senha 'admin123'.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CATEGORIAS DE PRODUTOS & CONTRATOS (Globais)
  // ───────────────────────────────────────────────────────────────────────────
  const prodCategoriesData = [
    { name: "Higiene & Limpeza", code: "HIG_LIMP", icon: "Sparkles", description: "Produtos químicos e materiais de asseio diário" },
    { name: "Descartáveis & Copa", code: "DESC_COPA", icon: "Coffee", description: "Copos, guardanapos e papéis descartáveis" },
    { name: "Equipamentos & Acessórios", code: "EQUIP_ACES", icon: "Wrench", description: "Mops, baldes, carros funcionais e rodos" },
    { name: "EPIs & Segurança", code: "EPI_SEG", icon: "Shield", description: "Equipamentos de proteção individual e uniformes operacionais" },
    { name: "Químicos Concentrados", code: "QUIM_CONC", icon: "FlaskConical", description: "Detergentes hospitalares, desinfetantes e solventes industriais" },
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
  // 4. FORNECEDORES HOMOLOGADOS REGIONAIS
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
      regionals: [spRegional.id, rjRegional.id],
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
      regionals: [spRegional.id, mgRegional.id],
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
      regionals: [spRegional.id, rjRegional.id, mgRegional.id],
    },
    {
      name: "RioQuímica Distribuição e Logística Ltda",
      tradeName: "RioQuímica Log",
      razaoSocial: "RioQuímica Distribuição e Logística Ltda",
      cnpj: "45.678.901/0001-23",
      email: "comercial@rioquimica.com.br",
      phone: "(21) 3344-7700",
      telefone: "(21) 3344-7700",
      contatoNome: "Camila Guimarães",
      city: "Rio de Janeiro",
      state: "RJ",
      regionals: [rjRegional.id],
    },
    {
      name: "MinasClean Suprimentos Hospitalares Eireli",
      tradeName: "MinasClean Hospitalar",
      razaoSocial: "MinasClean Suprimentos Hospitalares Eireli",
      cnpj: "56.789.012/0001-34",
      email: "pedidos@minasclean.com.br",
      phone: "(31) 3290-8800",
      telefone: "(31) 3290-8800",
      contatoNome: "Rodrigo Alvarenga",
      city: "Belo Horizonte",
      state: "MG",
      regionals: [mgRegional.id],
    },
  ];

  const suppliersMap = new Map<string, any>();
  for (const s of suppliersData) {
    const { regionals: targetRegionalIds, ...supData } = s;
    const supplier = await prisma.registeredSupplier.upsert({
      where: { cnpj: supData.cnpj },
      update: supData,
      create: supData,
    });
    suppliersMap.set(s.tradeName, supplier);

    for (const regId of targetRegionalIds) {
      await prisma.supplierRegional.upsert({
        where: { supplierId_regionalId: { supplierId: supplier.id, regionalId: regId } },
        update: {},
        create: {
          supplierId: supplier.id,
          regionalId: regId,
          deliveryLeadTimeDays: 2,
          minOrderValue: 200,
          freeShippingThreshold: 500,
        },
      });
    }
  }
  console.log(`✅ [Seed] ${suppliersMap.size} fornecedores homologados e prazos por regional cadastrados.`);

  const cleanPro = suppliersMap.get("CleanPro Distribuidora");
  const sulPack = suppliersMap.get("SulPack Embalagens");
  const safeTech = suppliersMap.get("SafeTech EPIs");
  const rioquimica = suppliersMap.get("RioQuímica Log");
  const minasclean = suppliersMap.get("MinasClean Hospitalar");

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
      allowUnlimitedItemsSolicitation: false,
      maxItemsPerSolicitation: 20,
    },
    {
      name: "Torre Santander Faria Lima SP",
      code: "CTR-CORP-002",
      regionalId: spRegional.id,
      categoryId: contractCatMap.get("Corporativo & Escritórios")?.id,
      totalBudget: 60000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
      allowUnlimitedItemsSolicitation: false,
      maxItemsPerSolicitation: 15,
    },
    {
      name: "Aeroporto Internacional Galeão RJ",
      code: "CTR-AERO-003",
      regionalId: rjRegional.id,
      categoryId: contractCatMap.get("Corporativo & Escritórios")?.id,
      totalBudget: 120000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
      allowUnlimitedItemsSolicitation: true,
    },
    {
      name: "Complexo Industrial Betim MG",
      code: "CTR-IND-004",
      regionalId: mgRegional.id,
      categoryId: contractCatMap.get("Industrial & Fábricas")?.id,
      totalBudget: 95000.0,
      unlimitedBudget: false,
      allowExtraOrder: true,
      allowUnlimitedItemsSolicitation: false,
      maxItemsPerSolicitation: 25,
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

    // Período orçamentário do mês corrente
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

    // Vínculo com usuários gestor e assistente
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
  const galeao = contractsMap.get("CTR-AERO-003");

  // ───────────────────────────────────────────────────────────────────────────
  // 6. SUBORÇAMENTOS POR CATEGORIA DE PRODUTO (ContractProductCategoryBudget)
  // ───────────────────────────────────────────────────────────────────────────
  const catHigLimp = prodCatMap.get("HIG_LIMP");
  const catDescCopa = prodCatMap.get("DESC_COPA");
  const catEquipAces = prodCatMap.get("EQUIP_ACES");
  const catEpiSeg = prodCatMap.get("EPI_SEG");
  const catQuimConc = prodCatMap.get("QUIM_CONC");

  const subbudgetsDefinitions = [
    // Hospital Sírio-Libanês SP (Total: 85k)
    { contract: sirioLibanes, category: catHigLimp, monthlyBudget: 30000.0 },
    { contract: sirioLibanes, category: catDescCopa, monthlyBudget: 25000.0 },
    { contract: sirioLibanes, category: catQuimConc, monthlyBudget: 15000.0 },
    { contract: sirioLibanes, category: catEpiSeg, monthlyBudget: 15000.0 },

    // Torre Santander SP (Total: 60k)
    { contract: torreSantander, category: catHigLimp, monthlyBudget: 20000.0 },
    { contract: torreSantander, category: catDescCopa, monthlyBudget: 25000.0 },
    { contract: torreSantander, category: catEquipAces, monthlyBudget: 10000.0 },
    { contract: torreSantander, category: catEpiSeg, monthlyBudget: 5000.0 },

    // Aeroporto Galeão RJ (Total: 120k)
    { contract: galeao, category: catHigLimp, monthlyBudget: 40000.0 },
    { contract: galeao, category: catDescCopa, monthlyBudget: 40000.0 },
    { contract: galeao, category: catEquipAces, monthlyBudget: 20000.0 },
    { contract: galeao, category: catEpiSeg, monthlyBudget: 20000.0 },
  ];

  for (const sb of subbudgetsDefinitions) {
    if (sb.contract && sb.category) {
      const budgetRecord = await prisma.contractProductCategoryBudget.upsert({
        where: {
          contractId_productCategoryId: {
            contractId: sb.contract.id,
            productCategoryId: sb.category.id,
          },
        },
        update: { monthlyBudget: sb.monthlyBudget, active: true },
        create: {
          contractId: sb.contract.id,
          productCategoryId: sb.category.id,
          monthlyBudget: sb.monthlyBudget,
          active: true,
        },
      });

      await prisma.contractProductCategoryBudgetPeriod.upsert({
        where: {
          contractProductCategoryBudgetId_periodMonth: {
            contractProductCategoryBudgetId: budgetRecord.id,
            periodMonth: currentMonthKey,
          },
        },
        update: { monthlyBudget: sb.monthlyBudget },
        create: {
          contractProductCategoryBudgetId: budgetRecord.id,
          contractId: sb.contract.id,
          periodMonth: currentMonthKey,
          monthlyBudget: sb.monthlyBudget,
          usedBudget: 0,
        },
      });
    }
  }
  console.log("✅ [Seed] Suborçamentos por categoria de produto cadastrados para contratos.");

  // ───────────────────────────────────────────────────────────────────────────
  // 7. CATÁLOGO EXPANDIDO DE PRODUTOS OPERACIONAIS (Com Descrições e Fotos)
  // ───────────────────────────────────────────────────────────────────────────
  const productsData = [
    // ── HIGIENE & LIMPEZA ───────────────────────────────────────────────────
    {
      codigo: "LIMP-001",
      name: "Detergente Neutro Concentrado 5L",
      descricao: "Detergente biodegradável de alta densidade e rendimento superior com pH balanceado. Ideal para limpeza geral hospitalar e cozinhas corporativas.",
      unidade: "GL",
      tabela: 28.5,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-003",
      name: "Álcool em Gel 70% 500ml com Válvula Pump",
      descricao: "Antisséptico hidratante enriquecido com extrato de Aloe Vera para desinfecção instantânea das mãos. Secagem rápida e fórmula testada dermatologicamente.",
      unidade: "FR",
      tabela: 14.9,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-004",
      name: "Sabonete Líquido Erva Doce 5L",
      descricao: "Fórmula perolizada hidratante para uso contínuo em banheiros e vestiários institucionais. Espuma cremosa e suave perfume relaxante.",
      unidade: "GL",
      tabela: 38.0,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1608248597359-0f4931a2928d?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-006",
      name: "Desengordurante Alcalino Industrial 5L",
      descricao: "Desengordurante de ação penetrante rápida para dissolução de óleos, graxas e gorduras carbonizadas em coifas, cozinhas e pisos industriais.",
      unidade: "GL",
      tabela: 42.0,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-007",
      name: "Limpa Vidros & Superfícies Espelhadas 5L",
      descricao: "Composição com álcool e tensoativos com secagem ultrarrápida. Não deixa manchas e cria película anti-embaçante em vitrines e divisórias de vidro.",
      unidade: "GL",
      tabela: 32.5,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-008",
      name: "Odorizador de Ambientes Lavanda 500ml",
      descricao: "Perfume aerosol de longa fixação e neutralizador de odores para recepções, sanitários e salas de reunião corporativas.",
      unidade: "FR",
      tabela: 18.0,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1608248597359-0f4931a2928d?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-009",
      name: "Cera Líquida Acrílica Auto-Brilho 5L",
      descricao: "Acabamento acrílico antiderrapante para pisos vinílicos, paviflex e granilite. Alta resistência ao tráfego pesado de pessoas e macas.",
      unidade: "GL",
      tabela: 74.0,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },

    // ── QUÍMICOS CONCENTRADOS ──────────────────────────────────────────────
    {
      codigo: "QUIM-001",
      name: "Clean Peroxy Desinfetante Peróxido 5L",
      descricao: "Desinfetante hospitalar bactericida e fungicida à base de peróxido de hidrogênio acelerado. Indicado para áreas críticas, isolamentos e UTIs.",
      unidade: "GL",
      tabela: 64.9,
      categoryCode: "QUIM_CONC",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-002",
      name: "Cloro Ativo Concentrado 2.5% 5L",
      descricao: "Hipoclorito de sódio estabilizado para desinfecção profunda de ralos, banheiros e alvejamento institucional de rouparia branca.",
      unidade: "GL",
      tabela: 19.9,
      categoryCode: "QUIM_CONC",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-003",
      name: "Removedor de Cera Concentrado 5L",
      descricao: "Formulação sem odor de amônia forte para desincrustação profunda e remoção instantânea de múltiplas camadas de cera antiga.",
      unidade: "GL",
      tabela: 68.0,
      categoryCode: "QUIM_CONC",
      supplier: cleanPro,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-004",
      name: "Desincrustante Ácido Hospitalar 5L",
      descricao: "Removedor corretivo para limpeza pesada contra ferrugens, manchas minerais e calcificações em louças sanitárias e cerâmicas.",
      unidade: "GL",
      tabela: 56.0,
      categoryCode: "QUIM_CONC",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-005",
      name: "Detergente Multienzimático 4 Enzimas 1L",
      descricao: "Solução multienzimática biodegradável de alto poder proteolítico para desincrustação e quebra de biofilmes em instrumentais médicos.",
      unidade: "FR",
      tabela: 89.0,
      categoryCode: "QUIM_CONC",
      supplier: minasclean || cleanPro,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    },

    // ── DESCARTÁVEIS & COPA ────────────────────────────────────────────────
    {
      codigo: "DESC-001",
      name: "Papel Toalha Interfolhado 2 Dobras 100% Celulose (cx 2000 fls)",
      descricao: "Papel toalha folha dupla virgem com alta capacidade de absorção e maciez superior. Não esfarela quando úmido.",
      unidade: "CX",
      tabela: 45.9,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-002",
      name: "Papel Higiênico Rolão Folha Dupla 300m (fardo 8 rolos)",
      descricao: "Bobina institucional folha dupla 100% celulose virgem com picote uniforme. Alta durabilidade e excelente rendimento em dispensers.",
      unidade: "FD",
      tabela: 72.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-003",
      name: "Saco de Lixo Preto Reforçado 100L (pacote 100 un)",
      descricao: "Polietileno de baixa densidade virgem reforçado micra 0.8 com solda lateral especial contra rompimentos e retenção de líquidos.",
      unidade: "PC",
      tabela: 55.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-004",
      name: "Saco de Lixo Branco Infectante 100L (pacote 100 un)",
      descricao: "Saco especial para descarte de resíduos biológicos infectantes hospitalares conforme norma ABNT NBR 9191 com símbolo de risco biológico.",
      unidade: "PC",
      tabela: 68.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-005",
      name: "Copo Descartável 200ml Água (cx 2500 un)",
      descricao: "Copos plásticos transparentes em polipropileno atóxico com bordas reforçadas para bebidas frias ou em temperatura ambiente.",
      unidade: "CX",
      tabela: 89.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-006",
      name: "Copo Descartável 50ml Café (cx 3000 un)",
      descricao: "Copos plásticos térmicos pequenos em poliestireno para café expresso, chá e amostras em copas e refeitórios.",
      unidade: "CX",
      tabela: 62.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-007",
      name: "Saco de Lixo Azul Coleta Seletiva 60L (pacote 100 un)",
      descricao: "Saco resistente colorido para identificação visual de papel e materiais recicláveis em ilhas ecológicas de escritórios.",
      unidade: "PC",
      tabela: 38.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-008",
      name: "Guardanapo de Papel Folha Dupla 24x24cm (cx 2000 un)",
      descricao: "Guardanapos macios e absorventes 100% celulose virgem com borda gofrada para cafeterias corporativas e refeitórios.",
      unidade: "CX",
      tabela: 34.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-009",
      name: "Mexedor Plástico de Café 11cm Cristal (cx 5000 un)",
      descricao: "Palhetas individuais plásticas descartáveis atóxicas para misturar café e bebidas quentes sem quebrar.",
      unidade: "CX",
      tabela: 26.5,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=600&q=80",
    },

    // ── EPIS & SEGURANÇA ───────────────────────────────────────────────────
    {
      codigo: "EPI-001",
      name: "Luva Nitrílica Descartável Azul M (cx 100 un)",
      descricao: "Luva de proteção biológica e química sem talco e hipoalergênica. Textura na ponta dos dedos para precisão táctil. CA 41.230.",
      unidade: "CX",
      tabela: 42.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-002",
      name: "Luva Nitrílica Descartável Azul G (cx 100 un)",
      descricao: "Luva nitrílica tamanho grande com alta elasticidade e excelente barreira mecânica contra respingos de solventes e fluidos biológicos. CA 41.230.",
      unidade: "CX",
      tabela: 42.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-003",
      name: "Óculos de Proteção Ampla Visão Antirrisco",
      descricao: "Lentes de policarbonato com proteção UV400, tratamento antirrisco e armação com ventilação indireta contra poeiras e respingos. CA 32.140.",
      unidade: "UN",
      tabela: 18.5,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-004",
      name: "Máscara Descartável Tripla com Elástico (cx 50 un)",
      descricao: "Barreira bacteriana e viral BFE > 95% com clipe nasal moldável em alumínio e elásticos confortáveis. Registro Anvisa.",
      unidade: "CX",
      tabela: 16.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-005",
      name: "Bota de PVC Branca de Segurança Cano Médio 40",
      descricao: "Calçado impermeável ocupacional com solado tratorado antiderrapante em PVC virgem de fácil higienização. CA 28.500.",
      unidade: "PAR",
      tabela: 65.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-006",
      name: "Luva de Látex Amarela com Forro Flocado M",
      descricao: "Luva multiuso pesada para limpeza pesada com palma antiderrapante e forro interno 100% algodão para conforto térmico. CA 15.680.",
      unidade: "PAR",
      tabela: 8.9,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-007",
      name: "Protetor Auricular de Silicone Plug com Cordão",
      descricao: "Atenuação de ruído 18dB NRRsf com três flanges anatômicas laváveis e cordão de segurança em PVC flexível. CA 19.820.",
      unidade: "PAR",
      tabela: 4.2,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-008",
      name: "Avental Impermeável de PVC Branco 120x70cm",
      descricao: "Proteção frontal do corpo contra respingos químicos, lavagens industriais e sanitização de leitos hospitalares. CA 36.190.",
      unidade: "UN",
      tabela: 24.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-009",
      name: "Touca Sanfonada TNT Branca (pct 100 un)",
      descricao: "Touca descartável em TNT com duplo elástico reforçado para retenção de fios de cabelo em cozinhas, hospitais e laboratórios.",
      unidade: "PC",
      tabela: 14.5,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-010",
      name: "Sapatilha Propé Descartável em TNT (pct 100 un)",
      descricao: "Proteção higiênica para calçados com elástico reforçado em toda a borda. Impede a entrada de poeira e sujidades em áreas limpas.",
      unidade: "PC",
      tabela: 19.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },

    // ── EQUIPAMENTOS & ACESSÓRIOS ──────────────────────────────────────────
    {
      codigo: "EQP-001",
      name: "Mop Giratório Profissional com Balde 15L",
      descricao: "Conjunto completo com cesto centrífugo em inox durável, balde com dreno e cabo telescópico em alumínio de alta resistência.",
      unidade: "KIT",
      tabela: 145.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-002",
      name: "Refil Mop Líquido Algodão Ponta Dobrada 340g",
      descricao: "Fios torcidos com ponta em laço fechado para maior durabilidade na lavagem e absorção rápida de líquidos derramados.",
      unidade: "UN",
      tabela: 22.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-003",
      name: "Rodo de Alumínio Reforçado Duplo 60cm",
      descricao: "Canopla robusta de alumínio anodizado com borracha dupla em EVA flexível para secagem rápida sem arranhar o piso.",
      unidade: "UN",
      tabela: 48.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-004",
      name: "Pano Multiuso Tipo Perflex Bobina 300m Azul",
      descricao: "Pano não-tecido com estrutura alveolar bactericida. Super absorvente, lavável e não risca superfícies metálicas ou acrílicas.",
      unidade: "RL",
      tabela: 79.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-005",
      name: "Balde Espremedor Duplo 30L com Rodízios",
      descricao: "Carro balde ergonômico bipartido com sistema de pressão vertical por espremedor e rodízios silenciosos para hospitais.",
      unidade: "UN",
      tabela: 340.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-006",
      name: "Placa Sinalizadora Piso Molhado Amarela",
      descricao: "Placa articulada dobrável em polipropileno de alta visibilidade com inscrição frente e verso em português e inglês.",
      unidade: "UN",
      tabela: 32.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-007",
      name: "Pulverizador Borrifador Graduado 500ml",
      descricao: "Gatilho profissional com ajuste de leque e jato direcionado acoplado a frasco translúcido graduado com escala em ml.",
      unidade: "UN",
      tabela: 12.5,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-008",
      name: "Cabo de Alumínio Anodizado com Rosca 1,40m",
      descricao: "Cabo ergonômico de liga leve de alumínio com encaixe universal para vassouras, rodos e mops profissionais.",
      unidade: "UN",
      tabela: 25.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: null, // Produto Global
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-009",
      name: "Escova Sanitária com Suporte Higiênico",
      descricao: "Cerdas rígidas em polipropileno especial para desincrustação sob as bordas de vasos sanitários institucionais.",
      unidade: "UN",
      tabela: 19.8,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-010",
      name: "Disco de Limpeza Preto para Enceradeira 410mm",
      descricao: "Disco abrasivo pesado para lavagem corretiva, decapagem e remoção profunda de ceras acrílicas antigas.",
      unidade: "UN",
      tabela: 38.0,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: spRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    // ── CATÁLOGO ADICIONAL: RJ (Galeão), MG (Betim), DF e PR ─────────────────────
    {
      codigo: "LIMP-010",
      name: "Limpa Vidros Concentrado 5L",
      descricao: "Limpa vidros de secagem rápida, sem deixar manchas ou resíduos. Indicado para fachadas internas, divisórias e áreas envidraçadas de terminais.",
      unidade: "GL",
      tabela: 32.9,
      categoryCode: "HIG_LIMP",
      supplier: rioquimica,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-011",
      name: "Desinfetante Hospitalar Lavanda 5L",
      descricao: "Desinfetante de uso geral com ação bactericida e fragrância suave de lavanda. Diluível, para pisos e superfícies de áreas de grande circulação.",
      unidade: "GL",
      tabela: 24.5,
      categoryCode: "HIG_LIMP",
      supplier: rioquimica,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-010",
      name: "Papel Toalha Bobina 20cm x 200m",
      descricao: "Bobina de papel toalha 100% celulose para dispensers de alto fluxo, com alta absorção e resistência.",
      unidade: "PC",
      tabela: 69.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-011",
      name: "Copo Descartável 300ml (cx 2000 un)",
      descricao: "Copo de polipropileno atóxico para bebidas frias e quentes, em caixa fechada com 2000 unidades.",
      unidade: "CX",
      tabela: 94.0,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-011",
      name: "Colete Refletivo de Sinalização com Faixas",
      descricao: "Colete em tela com faixas retrorrefletivas para identificação de equipes em áreas operacionais e pátios.",
      unidade: "UN",
      tabela: 39.9,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-012",
      name: "Protetor Auricular Plug de Silicone (cx 50 pares)",
      descricao: "Protetor auricular tipo plug com cordão, reutilizável, para ambientes de ruído contínuo.",
      unidade: "CX",
      tabela: 58.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-006",
      name: "Removedor de Cera Concentrado 5L",
      descricao: "Removedor alcalino de ceras e acabamentos acrílicos, para decapagem de pisos antes de nova aplicação.",
      unidade: "GL",
      tabela: 61.0,
      categoryCode: "QUIM_CONC",
      supplier: rioquimica,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-011",
      name: "Placa Sinalizadora de Piso Molhado",
      descricao: "Placa dobrável em polipropileno amarelo com pictograma de alerta bilíngue.",
      unidade: "UN",
      tabela: 74.9,
      categoryCode: "EQUIP_ACES",
      supplier: cleanPro,
      regionalId: rjRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-007",
      name: "Desengraxante Industrial Biodegradável 20L",
      descricao: "Desengraxante de alto rendimento para pisos, máquinas e áreas de manutenção. Biodegradável e de baixa espuma.",
      unidade: "BD",
      tabela: 189.0,
      categoryCode: "QUIM_CONC",
      supplier: minasclean,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "QUIM-008",
      name: "Detergente Alcalino Clorado 5L",
      descricao: "Detergente alcalino clorado para higienização pesada de áreas de produção e refeitórios industriais.",
      unidade: "GL",
      tabela: 47.5,
      categoryCode: "QUIM_CONC",
      supplier: minasclean,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-013",
      name: "Capacete de Segurança com Jugular Classe B",
      descricao: "Capacete em polietileno de alta densidade com suspensão de 4 pontos e jugular, para áreas industriais.",
      unidade: "UN",
      tabela: 36.9,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-014",
      name: "Luva de Raspa Cano Longo",
      descricao: "Luva de raspa de couro com reforço, cano longo, para manuseio de materiais abrasivos e soldagem leve.",
      unidade: "PR",
      tabela: 21.5,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-015",
      name: "Óculos de Proteção Ampla Visão Antiembaçante",
      descricao: "Óculos de ampla visão com lente de policarbonato incolor, tratamento antiembaçante e antirrisco.",
      unidade: "UN",
      tabela: 17.9,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1586942593568-29361efcd571?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-016",
      name: "Bota de Segurança Bico de Aço nº 42",
      descricao: "Bota de couro com biqueira de aço e solado antiderrapante, para áreas industriais.",
      unidade: "PR",
      tabela: 129.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EQP-012",
      name: "Carro Funcional de Limpeza Industrial",
      descricao: "Carro com balde espremedor, suporte para sacos e bandeja organizadora, em polipropileno reforçado.",
      unidade: "UN",
      tabela: 890.0,
      categoryCode: "EQUIP_ACES",
      supplier: minasclean,
      regionalId: mgRegional.id,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-012",
      name: "Álcool Líquido 70% 1L",
      descricao: "Álcool etílico 70% para assepsia de superfícies, em frasco de 1 litro.",
      unidade: "FR",
      tabela: 11.9,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: regionalsMap.get("DF")!.id,
      imageUrl: "https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "DESC-012",
      name: "Saco de Lixo Azul 60L (pacote 100 un)",
      descricao: "Saco de lixo azul reforçado de 60 litros para coleta seletiva, pacote com 100 unidades.",
      unidade: "PC",
      tabela: 38.5,
      categoryCode: "DESC_COPA",
      supplier: sulPack,
      regionalId: regionalsMap.get("DF")!.id,
      imageUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "LIMP-013",
      name: "Sabonete Líquido Neutro 5L",
      descricao: "Sabonete líquido neutro e hipoalergênico para dispensers de lavatórios coletivos.",
      unidade: "GL",
      tabela: 29.9,
      categoryCode: "HIG_LIMP",
      supplier: cleanPro,
      regionalId: regionalsMap.get("PR")!.id,
      imageUrl: "https://images.unsplash.com/photo-1608248597359-0f4931a2928d?auto=format&fit=crop&w=600&q=80",
    },
    {
      codigo: "EPI-017",
      name: "Máscara PFF2 sem Válvula (cx 50 un)",
      descricao: "Respirador descartável PFF2 com clipe nasal e tirantes elásticos, em caixa com 50 unidades.",
      unidade: "CX",
      tabela: 98.0,
      categoryCode: "EPI_SEG",
      supplier: safeTech,
      regionalId: regionalsMap.get("PR")!.id,
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80",
    },
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
          descricao: p.descricao,
          unidade: p.unidade,
          tabela: p.tabela,
          categoryId: category?.id,
          supplierId: p.supplier?.id,
          regionalId: p.regionalId,
          imageUrl: p.imageUrl,
          active: true,
        },
      });
    } else {
      prod = await prisma.product.create({
        data: {
          codigo: p.codigo,
          name: p.name,
          descricao: p.descricao,
          unidade: p.unidade,
          tabela: p.tabela,
          categoryId: category?.id,
          supplierId: p.supplier?.id,
          regionalId: p.regionalId,
          imageUrl: p.imageUrl,
          active: true,
        },
      });
    }
    productsMap.set(p.codigo, prod);
  }
  console.log(`✅ [Seed] ${productsMap.size} produtos com descrições e fotos cadastrados no catálogo.`);

  // ───────────────────────────────────────────────────────────────────────────
  // 8. PEDIDOS REGULARES, EXTRAS & DIVERGÊNCIAS
  // ───────────────────────────────────────────────────────────────────────────
  const assistente = usersMap.get("assistente@gpssa.com.br");
  const gestor = usersMap.get("gestor@gpssa.com.br");

  if (assistente && sirioLibanes && torreSantander) {
    // Pedido 1: Mensal Regular Aprovado (Hospital Sírio-Libanês)
    const existingOrder1 = await prisma.order.findFirst({
      where: { contractId: sirioLibanes.id, isExtraOrder: false, mes: now.getMonth() + 1, ano: now.getFullYear() },
    });

    if (!existingOrder1) {
      const itemsP1 = [
        { prod: productsMap.get("QUIM-001"), qty: 15 }, // Clean Peroxy Hospitalar
        { prod: productsMap.get("DESC-004"), qty: 20 }, // Saco Infectante
        { prod: productsMap.get("EPI-001"), qty: 30 },  // Luva Nitrílica M
        { prod: productsMap.get("DESC-001"), qty: 25 }, // Papel toalha
      ];

      const totalP1 = itemsP1.reduce((acc, it) => acc + (it.prod ? Number(it.prod.tabela) * it.qty : 0), 0);

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
            create: itemsP1.filter((it) => it.prod).map((it) => ({
              productId: it.prod.id,
              quantity: it.qty,
              unitPrice: it.prod.tabela,
              productNameSnapshot: it.prod.name,
              productCodigoSnapshot: it.prod.codigo,
              productUnidadeSnapshot: it.prod.unidade,
              productCategoriaSnapshot: "Hospitalar",
              productFornecedorSnapshot: "CleanPro Distribuidora",
              productImageUrlSnapshot: it.prod.imageUrl,
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

      await prisma.contract.update({
        where: { id: sirioLibanes.id },
        data: { usedBudget: totalP1 },
      });

      await prisma.contractBudgetPeriod.update({
        where: { contractId_periodMonth: { contractId: sirioLibanes.id, periodMonth: currentMonthKey } },
        data: { usedBudget: totalP1 },
      });
    }

    // Pedido 2: Mensal Pendente de Aprovação (Torre Santander)
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

      const totalP2 = itemsP2.reduce((acc, it) => acc + (it.prod ? Number(it.prod.tabela) * it.qty : 0), 0);

      await prisma.order.create({
        data: {
          contractId: torreSantander.id,
          createdById: assistente.id,
          status: "pendente",
          mes: now.getMonth() + 1,
          ano: now.getFullYear(),
          isExtraOrder: false,
          notes: "Reposição mensal dos andares executivos 10 ao 22.",
          totalAmount: totalP2,
          items: {
            create: itemsP2.filter((it) => it.prod).map((it) => ({
              productId: it.prod.id,
              quantity: it.qty,
              unitPrice: it.prod.tabela,
              productNameSnapshot: it.prod.name,
              productCodigoSnapshot: it.prod.codigo,
              productUnidadeSnapshot: it.prod.unidade,
              productCategoriaSnapshot: "Corporativo",
              productImageUrlSnapshot: it.prod.imageUrl,
            })),
          },
          history: {
            create: { userId: assistente.id, action: "Criação do Pedido Mensal", details: "Aguardando aprovação do Gestor", newStatus: "pendente" },
          },
        },
      });
    }

    // Pedido 3: Pedido Extra Entregue com Divergência Reportada (Sírio-Libanês)
    const existingExtraOrder = await prisma.order.findFirst({
      where: { contractId: sirioLibanes.id, isExtraOrder: true },
    });

    if (!existingExtraOrder) {
      const itemsExtra = [
        { prod: productsMap.get("EPI-001"), qty: 25 }, // Luva M
        { prod: productsMap.get("LIMP-003"), qty: 20 }, // Álcool gel pump
      ];
      const totalExtra = itemsExtra.reduce((acc, it) => acc + (it.prod ? Number(it.prod.tabela) * it.qty : 0), 0);

      const extraOrder = await prisma.order.create({
        data: {
          contractId: sirioLibanes.id,
          createdById: assistente.id,
          status: "entregue",
          mes: now.getMonth() + 1,
          ano: now.getFullYear(),
          isExtraOrder: true,
          notes: "Pedido Extra de Urgência: reposição emergencial de insumos de barreira para campanha de vacinação infantil.",
          totalAmount: totalExtra,
          items: {
            create: itemsExtra.filter((it) => it.prod).map((it) => ({
              productId: it.prod.id,
              quantity: it.qty,
              unitPrice: it.prod.tabela,
              productNameSnapshot: it.prod.name,
              productCodigoSnapshot: it.prod.codigo,
              productUnidadeSnapshot: it.prod.unidade,
              productCategoriaSnapshot: "Hospitalar",
              productImageUrlSnapshot: it.prod.imageUrl,
            })),
          },
          history: {
            create: [
              { userId: assistente.id, action: "Criação do Pedido Extra", details: "Aprovado em regime emergencial", newStatus: "pendente" },
              { userId: gestor?.id, action: "Aprovação Imediata", details: "Autorizado por verba emergencial", oldStatus: "pendente", newStatus: "aprovado" },
              { userId: assistente.id, action: "Confirmação de Entrega", details: "Entregue pela transportadora CleanPro", oldStatus: "aprovado", newStatus: "entregue" },
            ],
          },
          divergences: {
            create: {
              reportedById: assistente.id,
              description: "Divergência na contagem física: entregues 20 caixas de luvas ao invés de 25 caixas faturadas. Falta de 5 caixas comunicada.",
              status: "pendente",
              notes: "Fornecedor acionado via Suprimentos para reposição imediata das 5 caixas restantes.",
            },
          },
        },
      });
      console.log(`✅ [Seed] Pedido Extra com divergência de entrega registrado (ID: ${extraOrder.id}).`);
    }

    // Pedido 4: Mensal Em Trânsito (Aeroporto Galeão RJ)
    if (galeao && gestor) {
      const existingOrder4 = await prisma.order.findFirst({
        where: { contractId: galeao.id, isExtraOrder: false },
      });

      if (!existingOrder4) {
        const itemsP4 = [
          { prod: productsMap.get("DESC-001"), qty: 60 },
          { prod: productsMap.get("DESC-003"), qty: 40 },
          { prod: productsMap.get("QUIM-001"), qty: 20 },
          { prod: productsMap.get("EQP-003"), qty: 10 },
        ];
        const totalP4 = itemsP4.reduce((acc, it) => acc + (it.prod ? Number(it.prod.tabela) * it.qty : 0), 0);

        await prisma.order.create({
          data: {
            contractId: galeao.id,
            createdById: gestor.id,
            status: "aprovado",
            mes: now.getMonth() + 1,
            ano: now.getFullYear(),
            isExtraOrder: false,
            notes: "Pedido mensal para abastecimento dos banheiros dos terminais 1 e 2 do Aeroporto Galeão (Em trânsito para entrega).",
            totalAmount: totalP4,
            items: {
              create: itemsP4.filter((it) => it.prod).map((it) => ({
                productId: it.prod.id,
                quantity: it.qty,
                unitPrice: it.prod.tabela,
                productNameSnapshot: it.prod.name,
                productCodigoSnapshot: it.prod.codigo,
                productUnidadeSnapshot: it.prod.unidade,
                productCategoriaSnapshot: "Corporativo Aeroportuário",
                productImageUrlSnapshot: it.prod.imageUrl,
              })),
            },
            history: {
              create: [
                { userId: gestor.id, action: "Criação do Pedido", details: "Lançamento inicial", newStatus: "pendente" },
                { userId: gestor.id, action: "Aprovação & Despacho", details: "Aprovado e despachado pelo CD de Caxias", oldStatus: "pendente", newStatus: "aprovado" },
              ],
            },
          },
        });
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. SOLICITAÇÕES ESPECIAIS (Fora de Catálogo)
  // ───────────────────────────────────────────────────────────────────────────
  const suprimentosUser = usersMap.get("suprimentos@gpssa.com.br");

  if (assistente && sirioLibanes && torreSantander) {
    // Solicitação 1: Pendente na etapa Gestor
    const existingSol1 = await prisma.solicitation.findFirst({
      where: { contractId: sirioLibanes.id, status: "pendente" },
    });

    if (!existingSol1) {
      await prisma.solicitation.create({
        data: {
          contractId: sirioLibanes.id,
          createdById: assistente.id,
          status: "pendente",
          step: "aguardando_aprovacao_gestor",
          notes: "Aquisição emergencial de dispensers automáticos com sensor e refis para ampliação da UTI Adulto.",
          totalAmount: 2265.0,
          items: {
            create: [
              {
                description: "Dispenser Automático com Sensor Inox 1000ml de Parede",
                quantity: 10,
                unitPrice: 120.0,
              },
              {
                description: "Refil Álcool Espuma Cirúrgico Antisséptico 1000ml",
                quantity: 30,
                unitPrice: 35.5,
              },
            ],
          },
          history: {
            create: {
              userId: assistente.id,
              action: "Criação da Solicitação Especial",
              step: "aguardando_aprovacao_gestor",
              notes: "Necessidade após inauguração de 10 novos leitos de UTI.",
            },
          },
        },
      });
    }

    // Solicitação 2: Em análise na etapa Suprimentos
    const existingSol2 = await prisma.solicitation.findFirst({
      where: { contractId: torreSantander.id, status: "pendente" },
    });

    if (!existingSol2) {
      await prisma.solicitation.create({
        data: {
          contractId: torreSantander.id,
          createdById: assistente.id,
          status: "pendente",
          step: "aguardando_compra_suprimentos",
          notes: "Tapetes ergonômicos antifadiga de borracha para bancadas de recepção e triagem de encomendas.",
          totalAmount: 870.0,
          items: {
            create: [
              {
                description: "Tapete Ergonômico Antifadiga de Borracha Antiderrapante 90x60cm",
                quantity: 6,
                unitPrice: 145.0,
              },
            ],
          },
          history: {
            create: [
              { userId: assistente.id, action: "Criação da Solicitação", step: "aguardando_aprovacao_gestor", notes: "Melhoria de ergonomia solicitada pelo SESMT" },
              { userId: gestor?.id || assistente.id, action: "Aprovação pelo Gestor", step: "aguardando_compra_suprimentos", notes: "Verba aprovada; encaminhado para cotação em Suprimentos" },
            ],
          },
        },
      });
    }

    // Solicitação 3: Concluída / Aprovada
    const existingSol3 = await prisma.solicitation.findFirst({
      where: { contractId: sirioLibanes.id, status: "concluido" },
    });

    if (!existingSol3) {
      await prisma.solicitation.create({
        data: {
          contractId: sirioLibanes.id,
          createdById: assistente.id,
          status: "concluido",
          step: "concluido",
          notes: "Lavadora de alta pressão profissional para higienização e esterilização de docas de ambulâncias.",
          totalAmount: 2450.0,
          items: {
            create: [
              {
                description: "Lavadora de Alta Pressão Profissional Kärcher HD 585 220V",
                quantity: 1,
                unitPrice: 2450.0,
              },
            ],
          },
          history: {
            create: [
              { userId: assistente.id, action: "Solicitação Aberta", step: "aguardando_aprovacao_gestor" },
              { userId: gestor?.id || assistente.id, action: "Aprovação Gestor", step: "aguardando_compra_suprimentos" },
              { userId: suprimentosUser?.id || assistente.id, action: "Cotação & Emissão de Pedido de Compra", step: "concluido", notes: "Ordem de compra #OC-9982 gerada com entrega programada." },
            ],
          },
        },
      });
    }
    console.log("✅ [Seed] Solicitações Especiais de teste cadastradas (Pendente, Em Análise e Concluída).");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 10. TIPOS DE CHAMADOS & CHAMADOS DE TESTE (SLA & Manutenção)
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
          title: "Vazamento no sanitário do 3º andar (Ala Norte)",
          description: "Identificado vazamento sob a bancada da pia principal. Risco de interdição do sanitário se não reparado.",
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
              { userId: gestor?.id || colaborador.id, message: "Equipe técnica de prontidão já acionada. Técnico em trânsito com materiais." },
            ],
          },
        },
      });
      console.log(`✅ [Seed] Chamado de serviço criado com checklist e mensagens (ID: ${ticket.id}).`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 11. MURAL SOCIAL (FEED CORPORATIVO)
  // ───────────────────────────────────────────────────────────────────────────
  const admin = usersMap.get("admin@gpssa.com.br");

  if (admin && suprimentosUser) {
    const existingPost = await prisma.feedPost.findFirst();
    if (!existingPost) {
      await prisma.feedPost.create({
        data: {
          userId: suprimentosUser.id,
          title: "📢 Atenção: Cronograma de Fechamento de Pedidos - Outubro/2026",
          content: "Prezados Gestores e Assistentes, informamos que a janela de fechamento de pedidos mensais para competência Outubro encerra-se no dia 20 às 18h. Favor revisar os suborçamentos por categoria antes do envio final.",
          pinned: true,
          comments: {
            create: [
              { userId: gestor?.id || admin.id, content: "Obrigado pelo aviso, Roberto! Nossos contratos de SP já estão em conferência final de verbas." },
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

      await prisma.feedPost.create({
        data: {
          userId: admin.id,
          title: "🚀 Bem-vindos ao Novo GPS Bridge / SmartSupply!",
          content: "A plataforma agora opera com infraestrutura de alta velocidade, catálogo fotográfico unificado, gestão avançada de suborçamentos e integração direta ao WMS. Bom trabalho a todas as equipes!",
          pinned: false,
          likes: {
            create: [
              { userId: suprimentosUser.id },
            ],
          },
        },
      });
      console.log("✅ [Seed] Postagens institucionais adicionadas ao Feed Social.");
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 12. NOTIFICAÇÕES COMPLETAS POR PERFIL (AppNotification)
  // ───────────────────────────────────────────────────────────────────────────
  const notificationsData = [
    // Para Assistente
    ...(assistente
      ? [
          {
            userId: assistente.id,
            title: "Pedido Mensal Aprovado!",
            message: "Seu Pedido Mensal do Hospital Sírio-Libanês foi aprovado pelo Gestor.",
            link: "/pedido-mensal",
            isRead: false,
          },
          {
            userId: assistente.id,
            title: "Chamado em Andamento",
            message: "O chamado sobre o vazamento no 3º andar está com técnico em atendimento.",
            link: "/chamados",
            isRead: false,
          },
        ]
      : []),

    // Para Gestor
    ...(gestor
      ? [
          {
            userId: gestor.id,
            title: "Novo Pedido Aguardando Aprovação",
            message: "Torre Santander Faria Lima enviou o Pedido Mensal de Outubro/2026.",
            link: "/suprimentos",
            isRead: false,
          },
          {
            userId: gestor.id,
            title: "Solicitação Especial de Dispensers",
            message: "Assistente Lucas submeteu uma solicitação para a nova ala de UTI.",
            link: "/nova-solicitacao",
            isRead: false,
          },
        ]
      : []),

    // Para Admin SP
    ...(usersMap.get("admin.sp@gpssa.com.br")
      ? [
          {
            userId: usersMap.get("admin.sp@gpssa.com.br").id,
            title: "Divergência de Entrega Reportada",
            message: "Falta de 5 caixas de Luvas identificada no contrato Hospital Sírio-Libanês.",
            link: "/suprimentos",
            isRead: false,
          },
          {
            userId: usersMap.get("admin.sp@gpssa.com.br").id,
            title: "Painel de Governança Atualizado",
            message: "Indicadores regionais consolidados com 100% de precisão orçamentária.",
            link: "/",
            isRead: true,
          },
        ]
      : []),

    // Para Suprimentos
    ...(suprimentosUser
      ? [
          {
            userId: suprimentosUser.id,
            title: "Solicitação Encaminhada para Cotação",
            message: "Tapetes ergonômicos da Torre Santander aprovados para compras.",
            link: "/nova-solicitacao",
            isRead: false,
          },
        ]
      : []),
  ];

  for (const notif of notificationsData) {
    const exists = await prisma.appNotification.findFirst({
      where: { userId: notif.userId, title: notif.title },
    });
    if (!exists) {
      await prisma.appNotification.create({ data: notif });
    }
  }
  console.log("✅ [Seed] Notificações por perfil de usuário cadastradas.");

  // ───────────────────────────────────────────────────────────────────────────
  // 13. MÓDULOS DO SISTEMA (system_modules_config)
  // ───────────────────────────────────────────────────────────────────────────
  const modulesConfigData = [
    { id: "pedido_mensal", name: "Pedido Mensal", category: "suprimentos", enabled: true, roles: ["assistente", "gestor", "admin", "super_admin"] },
    { id: "suprimentos", name: "Gestão de Suprimentos", category: "suprimentos", enabled: true, roles: ["gestor", "suprimentos", "admin", "super_admin"] },
    { id: "solicitacoes_especiais", name: "Solicitações Especiais", category: "suprimentos", enabled: true, roles: ["assistente", "gestor", "suprimentos", "admin", "super_admin"] },
    { id: "fornecedores", name: "Fornecedores & Cotações", category: "suprimentos", enabled: true, roles: ["suprimentos", "admin", "super_admin"] },
    { id: "estoque", name: "Gestão de Estoque (WMS)", category: "suprimentos", enabled: true, roles: ["colaborador", "assistente", "gestor", "suprimentos", "admin", "super_admin"] },
    { id: "chamados", name: "Central de Chamados", category: "servicos", enabled: true, roles: ["colaborador", "assistente", "gestor", "admin", "super_admin"] },
    { id: "feed", name: "Feed de Comunicação", category: "comunicacao", enabled: true, roles: ["colaborador", "assistente", "gestor", "suprimentos", "admin", "super_admin"] },
    { id: "equipe", name: "Equipe GPS Bridge", category: "comunicacao", enabled: true, roles: ["colaborador", "assistente", "gestor", "suprimentos", "admin", "super_admin"] },
    { id: "bridget", name: "Bridget (Assistente IA)", category: "inteligencia", enabled: true, roles: ["colaborador", "assistente", "gestor", "suprimentos", "admin", "super_admin"] },
  ];

  for (const m of modulesConfigData) {
    await prisma.systemModule.upsert({
      where: { id: m.id },
      update: { name: m.name, category: m.category, enabled: m.enabled, roles: m.roles },
      create: m,
    });
  }
  console.log(`✅ [Seed] ${modulesConfigData.length} módulos de governança do sistema configurados.`);

  // Membros da equipe para vitrine
  await prisma.teamMember.createMany({
    data: [
      { name: "Roberto Silva", role: "Coordenador de Suprimentos", email: "suprimentos@gpssa.com.br", phone: "(11) 99999-3333", regionalId: spRegional.id },
      { name: "Mariana Costa", role: "Gestora de Contratos Sudeste", email: "gestor@gpssa.com.br", phone: "(11) 98888-2222", regionalId: spRegional.id },
      { name: "Carlos Eduardo", role: "Gerente Regional SP", email: "admin.sp@gpssa.com.br", phone: "(11) 97777-1111", regionalId: spRegional.id },
      { name: "Camila Guimarães", role: "Supervisora Regional RJ", email: "camila.rj@gpssa.com.br", phone: "(21) 97111-2222", regionalId: rjRegional.id },
      { name: "Rodrigo Alvarenga", role: "Supervisor Regional MG", email: "rodrigo.mg@gpssa.com.br", phone: "(31) 97222-3333", regionalId: mgRegional.id },
    ],
    skipDuplicates: true,
  });

  // Configuração global da aplicação
  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: { minimumClientVersion: "1.0.0", maintenanceMode: false },
    create: { id: "default", minimumClientVersion: "1.0.0", maintenanceMode: false },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. MÓDULO DE CONTROLE DE ESTOQUE (WMS UNIFICADO)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("📦 [Seed] Iniciando sincronização do Módulo de Estoque (GPS Stock / WMS)...");

  // Grupos de Estoque
  let grupoSP = await prisma.stockGrupo.findFirst({ where: { nome: "Operação São Paulo & Facilities" } });
  if (!grupoSP) {
    grupoSP = await prisma.stockGrupo.create({
      data: {
        nome: "Operação São Paulo & Facilities",
        visualizacao: "ambas",
        regionalId: spRegional.id,
        contractId: sirioLibanes?.id,
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

  // Produtos WMS vinculados ao Catálogo GPS Bridge
  const stockProductsToSeed = [
    { codigo: "WMS-LIMP-001", bridgeCode: "LIMP-001", nome: "Detergente Neutro Concentrado 5L", min: 30, unit: "GL", custo: 28.5 },
    { codigo: "WMS-QUIM-001", bridgeCode: "QUIM-001", nome: "Clean Peroxy Desinfetante Peróxido 5L", min: 20, unit: "GL", custo: 64.9 },
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

  // Movimentações Iniciais de Estoque (Entradas para saldo positivo)
  const pLimp1 = stockProdMap.get("WMS-LIMP-001");
  const pQuim1 = stockProdMap.get("WMS-QUIM-001");
  const pDesc1 = stockProdMap.get("WMS-DESC-001");
  const pEpi1 = stockProdMap.get("WMS-EPI-001");

  const entradasCount = await prisma.stockEntrada.count();
  if (entradasCount === 0 && suprimentosUser && pLimp1 && pQuim1 && pDesc1 && pEpi1) {
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
        registradoPorUserId: suprimentosUser.id,
        origemSistema: "wms_manual",
      },
    });

    await prisma.stockEntrada.create({
      data: {
        produtoId: pQuim1.id,
        quantidade: 80,
        custoUnitario: 64.9,
        total: 80 * 64.9,
        notaFiscal: "NF-89211",
        centroDistribuicaoId: cdBarueri.id,
        localArmazenamentoId: almoxPrincipal.id,
        fornecedorId: cleanPro?.id || null,
        registradoPorUserId: suprimentosUser.id,
        origemSistema: "wms_manual",
      },
    });

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
        registradoPorUserId: suprimentosUser.id,
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
        registradoPorUserId: suprimentosUser.id,
        origemSistema: "wms_manual",
      },
    });

    const profColaborador = usersMap.get("colaborador@gpssa.com.br");
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
        registradoPorUserId: suprimentosUser.id,
      },
    });
    console.log("✅ [Seed] Movimentações de estoque registradas com sucesso.");
  }

  // Ativo Patrimonial
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

    await prisma.stockPatrimonioFluxo.create({
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

  // ───────────────────────────────────────────────────────────────────────────
  // CONSUMO DO ORÇAMENTO POR CATEGORIA (recalculado dos pedidos aprovados e entregues)
  // ───────────────────────────────────────────────────────────────────────────
  // Os itens guardam a categoria do produto no momento do pedido; aqui preenchemos os que não têm
  await prisma.$executeRaw`
    UPDATE order_items oi SET product_category_id_snapshot = p.category_id
    FROM products p WHERE p.id = oi.product_id AND oi.product_category_id_snapshot IS NULL`;
  // Garante o período de cada suborçamento nos meses que têm pedido aprovado ou entregue
  await prisma.$executeRaw`
    INSERT INTO contract_product_category_budget_periods
      (id, contract_product_category_budget_id, contract_id, period_month, monthly_budget, used_budget, created_at, updated_at)
    SELECT gen_random_uuid()::text, b.id, b.contract_id, m.period_month, b.monthly_budget, 0, now(), now()
    FROM contract_product_category_budgets b
    JOIN (
      SELECT DISTINCT contract_id, to_char(make_date(ano, mes, 1), 'YYYY-MM') AS period_month
      FROM orders WHERE status IN ('aprovado', 'entregue')
    ) m ON m.contract_id = b.contract_id
    ON CONFLICT (contract_product_category_budget_id, period_month) DO NOTHING`;
  // Consumo = quantidade x preço dos itens aprovados/entregues da categoria no mês
  await prisma.$executeRaw`
    UPDATE contract_product_category_budget_periods p
    SET used_budget = COALESCE((
          SELECT SUM(oi.quantity * oi.unit_price)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.contract_id = p.contract_id
            AND to_char(make_date(o.ano, o.mes, 1), 'YYYY-MM') = p.period_month
            AND o.status IN ('aprovado', 'entregue')
            AND oi.product_category_id_snapshot = b.product_category_id
        ), 0),
        updated_at = now()
    FROM contract_product_category_budgets b
    WHERE b.id = p.contract_product_category_budget_id`;
  console.log("✅ [Seed] Consumo do orçamento por categoria recalculado.");

  console.log("🎉 [Seed Rico] Carga completa e enriquecida finalizada com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ [Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
