import fs from 'node:fs';
import path from 'node:path';
import {
  Product,
  Category,
  Supplier,
  Store,
  Warehouse,
  StockBalance,
  StockMovement,
  StockLot,
  StockLoss,
  PurchaseOrder,
  InventorySession,
  StockTransfer,
  AuditLog,
  SystemNotification,
  UserProfile,
  RolePermission,
  ReplenishmentSuggestion,
  AbcItem,
  LabelTemplate,
  LabelPrinter,
  LabelPriceChange,
  LabelPrintJob,
  OperatorPermissions,
} from '../types/index.ts';

interface DatabaseSchema {
  stores: Store[];
  warehouses: Warehouse[];
  categories: Category[];
  suppliers: Supplier[];
  products: Product[];
  stockBalances: StockBalance[];
  stockLots: StockLot[];
  stockMovements: StockMovement[];
  stockLosses: StockLoss[];
  purchaseOrders: PurchaseOrder[];
  inventorySessions: InventorySession[];
  stockTransfers: StockTransfer[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  users: UserProfile[];
  roles: RolePermission[];
  labelTemplates: LabelTemplate[];
  labelPrinters: LabelPrinter[];
  labelPriceChanges: LabelPriceChange[];
  labelPrintJobs: LabelPrintJob[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'supermarket.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getDefaultPermissionsForRole(roleCode: string): OperatorPermissions {
  const isSuper = roleCode === 'superadmin';
  return {
    modules: {
      dashboard: isSuper || ['manager', 'auditor'].includes(roleCode),
      products: true,
      movements: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      lots: isSuper || ['stockist', 'checker', 'manager', 'auditor'].includes(roleCode),
      losses: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      inventory: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      labels: isSuper || ['stockist', 'checker', 'cashier', 'manager'].includes(roleCode),
      purchases: isSuper || ['buyer', 'checker', 'manager'].includes(roleCode),
      transfers: isSuper || ['stockist', 'manager'].includes(roleCode),
      suppliers: isSuper || ['buyer', 'manager'].includes(roleCode),
      analytics: isSuper || ['buyer', 'manager'].includes(roleCode),
      intelligence: isSuper || ['manager'].includes(roleCode),
      reports: isSuper || ['buyer', 'auditor', 'manager'].includes(roleCode),
      settings: isSuper,
      operators: isSuper,
    },
    actions: {
      canView: true,
      canCreate: isSuper || ['stockist', 'buyer', 'manager'].includes(roleCode),
      canEdit: isSuper || ['stockist', 'buyer', 'manager'].includes(roleCode),
      canDelete: isSuper || ['manager'].includes(roleCode),
      canApprove: isSuper || ['manager'].includes(roleCode),
      canCancel: isSuper || ['manager'].includes(roleCode),
      canExport: isSuper || ['buyer', 'auditor', 'manager'].includes(roleCode),
      canPrint: isSuper || ['stockist', 'checker', 'cashier', 'manager'].includes(roleCode),
      canEditMargin: isSuper || ['manager'].includes(roleCode),
      canMove: isSuper || ['stockist', 'checker', 'manager'].includes(roleCode),
      canAdjustInventory: isSuper || ['stockist', 'auditor', 'manager'].includes(roleCode),
      canApprovePurchases: isSuper || ['manager'].includes(roleCode),
      canAudit: isSuper || ['auditor', 'manager'].includes(roleCode),
    },
  };
}

function getInitialData(): DatabaseSchema {
  const stores: Store[] = [
    {
      id: 'store-01',
      name: 'ASSX Supermercados - Matriz Centro',
      code: 'LJ-01',
      cnpj: '12.345.678/0001-90',
      address: 'Av. Paulista, 1200 - Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      timezone: 'America/Sao_Paulo',
      isMain: true,
    },
    {
      id: 'store-02',
      name: 'ASSX Supermercados - Filial Jardins',
      code: 'LJ-02',
      cnpj: '12.345.678/0002-71',
      address: 'Rua Oscar Freire, 850 - Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      timezone: 'America/Sao_Paulo',
      isMain: false,
    },
  ];

  const warehouses: Warehouse[] = [
    {
      id: 'wh-01-gen',
      storeId: 'store-01',
      name: 'Depósito Geral (Matriz)',
      code: 'DEP-GERAL',
      type: 'general',
    },
    {
      id: 'wh-01-cold',
      storeId: 'store-01',
      name: 'Câmara Fria & Laticínios',
      code: 'CAM-FRIA',
      type: 'cold_storage',
    },
    {
      id: 'wh-01-floor',
      storeId: 'store-01',
      name: 'Área de Vendas / Gôndolas',
      code: 'SAL-VENDAS',
      type: 'sales_floor',
    },
    {
      id: 'wh-02-gen',
      storeId: 'store-02',
      name: 'Depósito Geral (Filial Jardins)',
      code: 'DEP-JARDINS',
      type: 'general',
    },
  ];

  const categories: Category[] = [
    { id: 'cat-01', name: 'Mercearia Básica', description: 'Arroz, feijão, óleo, farináceos e grãos', color: '#24445F', icon: 'ShoppingBag', status: 'active' },
    { id: 'cat-02', name: 'Bebidas & Adega', description: 'Cervejas, vinhos, refrigerantes, águas e sucos', color: '#28B88C', icon: 'Wine', status: 'active' },
    { id: 'cat-03', name: 'Frios & Laticínios', description: 'Queijos, iogurtes, leites, manteigas e requeijão', color: '#3B82F6', icon: 'Egg', status: 'active' },
    { id: 'cat-04', name: 'Açougue & Aves', description: 'Carnes nobres, bovinas, suínas e cortes de aves', color: '#EF4444', icon: 'Beef', status: 'active' },
    { id: 'cat-05', name: 'Hortifrúti', description: 'Frutas selecionadas, verduras e legumes frescos', color: '#10B981', icon: 'Apple', status: 'active' },
    { id: 'cat-06', name: 'Padaria & Confeitaria', description: 'Pães artesanais, bolos, tortas e biscoitos', color: '#F59E0B', icon: 'Croissant', status: 'active' },
    { id: 'cat-07', name: 'Limpeza & Higiene', description: 'Detergentes, sabões, desinfetantes e higiene pessoal', color: '#06B6D4', icon: 'Sparkles', status: 'active' },
    { id: 'cat-08', name: 'Congelados', description: 'Pratos prontos, hambúrgueres, sorvetes e vegetais congelados', color: '#6366F1', icon: 'Snowflake', status: 'active' },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup-01',
      corporateName: 'Ambev S.A. Distribuidora',
      tradeName: 'Ambev Brasil',
      cnpj: '02.808.708/0001-07',
      stateRegistration: '109.876.543.210',
      address: 'Rua Dr. Renato Paes de Barros, 1017',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '04530-001',
      contactName: 'Carlos Eduardo Mendes',
      phone: '(11) 3741-2000',
      whatsapp: '(11) 98765-4321',
      email: 'comercial@ambev-distrib.com.br',
      paymentTerms: '28/35/42 DDL',
      leadTimeDays: 3,
      rating: 4.8,
      notes: 'Fornecedor chave para bebidas alcoólicas e refrigerantes. Entrega pontual.',
      status: 'active',
    },
    {
      id: 'sup-02',
      corporateName: 'Camil Alimentos S.A.',
      tradeName: 'Camil Grãos & Alimentos',
      cnpj: '64.904.295/0001-03',
      stateRegistration: '112.334.455.667',
      address: 'Rodovia Raposo Tavares, Km 22',
      city: 'Cotia',
      state: 'SP',
      zipCode: '06709-015',
      contactName: 'Mariana Silveira',
      phone: '(11) 3779-1500',
      whatsapp: '(11) 99123-4567',
      email: 'vendas.atacado@camil.com.br',
      paymentTerms: '30 DDL',
      leadTimeDays: 4,
      rating: 4.9,
      notes: 'Principal parceiro para mercearia essencial (Arroz e Feijão).',
      status: 'active',
    },
    {
      id: 'sup-03',
      corporateName: 'Laticínios Bela Vista S.A.',
      tradeName: 'Piracanjuba',
      cnpj: '01.696.069/0001-38',
      stateRegistration: '10.234.567-8',
      address: 'Rodovia GO-020, Km 72',
      city: 'Bela Vista de Goiás',
      state: 'GO',
      zipCode: '75240-000',
      contactName: 'Roberto Nogueira',
      phone: '(62) 3551-8000',
      whatsapp: '(62) 99876-1234',
      email: 'pedidos@piracanjuba.ind.br',
      paymentTerms: '21/28 DDL',
      leadTimeDays: 5,
      rating: 4.7,
      notes: 'Leites UHT e derivados de alto giro com controle rigoroso de data de validade.',
      status: 'active',
    },
    {
      id: 'sup-04',
      corporateName: 'JBS S.A. Divisão Carnes',
      tradeName: 'Friboi Alimentos',
      cnpj: '02.916.265/0001-00',
      stateRegistration: '115.890.123.456',
      address: 'Av. Marginal Direita do Tietê, 500',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05118-100',
      contactName: 'Fernando Guimarães',
      phone: '(11) 3144-4000',
      whatsapp: '(11) 98111-2233',
      email: 'distribuicao@friboi.com.br',
      paymentTerms: '14/21 DDL',
      leadTimeDays: 2,
      rating: 4.6,
      notes: 'Entrega refrigerada direta com rastreabilidade de inspeção sanitária (SIF).',
      status: 'active',
    },
    {
      id: 'sup-05',
      corporateName: 'Química Amparo Ltda',
      tradeName: 'Ypê Produtos de Limpeza',
      cnpj: '43.468.618/0001-16',
      stateRegistration: '168.001.234.567',
      address: 'Av. Wilson de Oliveira, 2000',
      city: 'Amparo',
      state: 'SP',
      zipCode: '13900-900',
      contactName: 'Juliana Castro',
      phone: '(19) 3808-8000',
      whatsapp: '(19) 99654-7890',
      email: 'atendimento@ype.ind.br',
      paymentTerms: '30/45 DDL',
      leadTimeDays: 4,
      rating: 4.8,
      notes: 'Linha completa de limpeza e saneantes.',
      status: 'active',
    },
  ];

  const products: Product[] = [
    {
      id: 'prod-01',
      code: '1001',
      sku: 'MRC-ARR-001',
      ean: '7896006711124',
      additionalBarcodes: ['7896006711131'],
      name: 'Arroz Branco Tipo 1 Camil 5kg',
      description: 'Arroz agulhinha polido subgrupo 1 pacote econômico 5kg',
      categoryId: 'cat-01',
      brand: 'Camil',
      manufacturer: 'Camil Alimentos',
      unit: 'PCT',
      packageType: 'Fardo 6x5kg',
      unitsPerPackage: 6,
      weight: 5.0,
      costPrice: 22.80,
      salePrice: 32.90,
      profitMargin: 30.7,
      markup: 44.3,
      minStock: 80,
      maxStock: 500,
      safetyStock: 50,
      reorderPoint: 120,
      supplierId: 'sup-02',
      status: 'active',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'prod-02',
      code: '1002',
      sku: 'MRC-FEI-002',
      ean: '7896006720027',
      name: 'Feijão Carioca Camil 1kg',
      description: 'Feijão carioquinha tipo 1 grãos selecionados 1kg',
      categoryId: 'cat-01',
      brand: 'Camil',
      manufacturer: 'Camil Alimentos',
      unit: 'PCT',
      packageType: 'Fardo 30x1kg',
      unitsPerPackage: 30,
      weight: 1.0,
      costPrice: 6.40,
      salePrice: 9.89,
      profitMargin: 35.29,
      markup: 54.53,
      minStock: 100,
      maxStock: 600,
      safetyStock: 60,
      reorderPoint: 160,
      supplierId: 'sup-02',
      status: 'active',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'prod-03',
      code: '1003',
      sku: 'BEB-CER-003',
      ean: '7891991010832',
      name: 'Cerveja Heineken Puro Malte 350ml (Lata)',
      description: 'Cerveja lager puro malte teor alcoólico 5%',
      categoryId: 'cat-02',
      brand: 'Heineken',
      manufacturer: 'Heineken Brasil',
      unit: 'UN',
      packageType: 'Pack 12 un',
      unitsPerPackage: 12,
      volume: 0.35,
      costPrice: 4.25,
      salePrice: 6.19,
      profitMargin: 31.34,
      markup: 45.65,
      minStock: 240,
      maxStock: 2400,
      safetyStock: 150,
      reorderPoint: 400,
      supplierId: 'sup-01',
      status: 'active',
      createdAt: '2026-01-16T09:00:00Z',
      updatedAt: '2026-11-02T11:00:00Z',
    },
    {
      id: 'prod-04',
      code: '1004',
      sku: 'LAT-LEI-004',
      ean: '7898215150013',
      name: 'Leite UHT Integral Piracanjuba 1L',
      description: 'Leite longa vida integral homogeneizado Tetra Pak 1L',
      categoryId: 'cat-03',
      brand: 'Piracanjuba',
      manufacturer: 'Laticínios Bela Vista',
      unit: 'UN',
      packageType: 'Caixa 12x1L',
      unitsPerPackage: 12,
      volume: 1.0,
      costPrice: 4.10,
      salePrice: 5.79,
      profitMargin: 29.19,
      markup: 41.22,
      minStock: 180,
      maxStock: 1200,
      safetyStock: 120,
      reorderPoint: 300,
      supplierId: 'sup-03',
      status: 'active',
      createdAt: '2026-01-16T09:00:00Z',
      updatedAt: '2026-11-03T08:30:00Z',
    },
    {
      id: 'prod-05',
      code: '1005',
      sku: 'ACO-ALC-005',
      ean: '7891234567890',
      name: 'Alcatra Bovina Resfriada Friboi (KG)',
      description: 'Peça de alcatra com miolo resfriada a vácuo',
      categoryId: 'cat-04',
      brand: 'Friboi',
      manufacturer: 'JBS S.A.',
      unit: 'KG',
      costPrice: 38.50,
      salePrice: 54.90,
      profitMargin: 29.87,
      markup: 42.60,
      minStock: 40,
      maxStock: 250,
      safetyStock: 25,
      reorderPoint: 60,
      supplierId: 'sup-04',
      status: 'active',
      createdAt: '2026-01-18T14:00:00Z',
      updatedAt: '2026-11-04T16:00:00Z',
    },
    {
      id: 'prod-06',
      code: '1006',
      sku: 'LIM-DET-006',
      ean: '7896098900215',
      name: 'Detergente Líquido Neutro Ypê 500ml',
      description: 'Detergente lava-louças biodegradável com controle de odor',
      categoryId: 'cat-07',
      brand: 'Ypê',
      manufacturer: 'Química Amparo',
      unit: 'UN',
      packageType: 'Caixa 24x500ml',
      unitsPerPackage: 24,
      volume: 0.5,
      costPrice: 2.15,
      salePrice: 3.49,
      profitMargin: 38.4,
      markup: 62.33,
      minStock: 120,
      maxStock: 800,
      safetyStock: 70,
      reorderPoint: 200,
      supplierId: 'sup-05',
      status: 'active',
      createdAt: '2026-01-20T11:00:00Z',
      updatedAt: '2026-11-05T09:00:00Z',
    },
    {
      id: 'prod-07',
      code: '1007',
      sku: 'LAT-QUE-007',
      ean: '7898215152284',
      name: 'Queijo Mussarela Fatiado Piracanjuba 400g',
      description: 'Queijo mussarela fatiado em bandeja atmosfera modificada',
      categoryId: 'cat-03',
      brand: 'Piracanjuba',
      manufacturer: 'Laticínios Bela Vista',
      unit: 'PCT',
      weight: 0.4,
      costPrice: 15.60,
      salePrice: 23.90,
      profitMargin: 34.73,
      markup: 53.21,
      minStock: 30,
      maxStock: 180,
      safetyStock: 20,
      reorderPoint: 50,
      supplierId: 'sup-03',
      status: 'active',
      createdAt: '2026-02-01T10:00:00Z',
      updatedAt: '2026-11-05T10:00:00Z',
    },
    {
      id: 'prod-08',
      code: '1008',
      sku: 'HOR-MAC-008',
      ean: '7891000100085',
      name: 'Maçã Gala Selecionada (KG)',
      description: 'Maçã gala cat 1 nacional fresca',
      categoryId: 'cat-05',
      brand: 'Pomar do Sul',
      unit: 'KG',
      costPrice: 6.80,
      salePrice: 11.90,
      profitMargin: 42.86,
      markup: 75.0,
      minStock: 50,
      maxStock: 300,
      safetyStock: 30,
      reorderPoint: 80,
      supplierId: 'sup-02',
      status: 'active',
      createdAt: '2026-02-10T08:00:00Z',
      updatedAt: '2026-11-06T07:00:00Z',
    },
  ];

  const stockBalances: StockBalance[] = [
    { id: 'sb-01', productId: 'prod-01', storeId: 'store-01', warehouseId: 'wh-01-gen', physicalQty: 180, reservedQty: 0, availableQty: 180, blockedQty: 0, avgCost: 22.80, updatedAt: '2026-11-06T12:00:00Z' },
    { id: 'sb-02', productId: 'prod-02', storeId: 'store-01', warehouseId: 'wh-01-gen', physicalQty: 240, reservedQty: 0, availableQty: 240, blockedQty: 0, avgCost: 6.40, updatedAt: '2026-11-06T12:00:00Z' },
    { id: 'sb-03', productId: 'prod-03', storeId: 'store-01', warehouseId: 'wh-01-gen', physicalQty: 680, reservedQty: 24, availableQty: 656, blockedQty: 0, avgCost: 4.25, updatedAt: '2026-11-06T14:00:00Z' },
    { id: 'sb-04', productId: 'prod-04', storeId: 'store-01', warehouseId: 'wh-01-cold', physicalQty: 140, reservedQty: 0, availableQty: 140, blockedQty: 15, avgCost: 4.10, updatedAt: '2026-11-06T14:30:00Z' },
    { id: 'sb-05', productId: 'prod-05', storeId: 'store-01', warehouseId: 'wh-01-cold', physicalQty: 32, reservedQty: 0, availableQty: 32, blockedQty: 0, avgCost: 38.50, updatedAt: '2026-11-06T15:00:00Z' }, // critical stock!
    { id: 'sb-06', productId: 'prod-06', storeId: 'store-01', warehouseId: 'wh-01-gen', physicalQty: 310, reservedQty: 0, availableQty: 310, blockedQty: 0, avgCost: 2.15, updatedAt: '2026-11-06T11:00:00Z' },
    { id: 'sb-07', productId: 'prod-07', storeId: 'store-01', warehouseId: 'wh-01-cold', physicalQty: 45, reservedQty: 0, availableQty: 45, blockedQty: 6, avgCost: 15.60, updatedAt: '2026-11-06T16:00:00Z' },
    { id: 'sb-08', productId: 'prod-08', storeId: 'store-01', warehouseId: 'wh-01-floor', physicalQty: 75, reservedQty: 0, availableQty: 75, blockedQty: 0, avgCost: 6.80, updatedAt: '2026-11-06T09:00:00Z' },
  ];

  // FEFO Lots with realistic expiration dates
  const stockLots: StockLot[] = [
    {
      id: 'lot-01',
      productId: 'prod-04',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      lotNumber: 'LT-2026101-LEI',
      manufacturingDate: '2026-08-10',
      expirationDate: '2026-11-12', // 6 days remaining! Urgent FEFO!
      initialQuantity: 80,
      currentQuantity: 25,
      unitCost: 4.10,
      supplierId: 'sup-03',
      documentNumber: 'NF-89211',
      status: 'critical',
    },
    {
      id: 'lot-02',
      productId: 'prod-04',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      lotNumber: 'LT-2026102-LEI',
      manufacturingDate: '2026-10-01',
      expirationDate: '2027-02-01', // healthy
      initialQuantity: 120,
      currentQuantity: 115,
      unitCost: 4.10,
      supplierId: 'sup-03',
      documentNumber: 'NF-91400',
      status: 'active',
    },
    {
      id: 'lot-03',
      productId: 'prod-07',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      lotNumber: 'LT-QUE-881',
      manufacturingDate: '2026-10-05',
      expirationDate: '2026-11-20', // 14 days remaining! Warning FEFO
      initialQuantity: 60,
      currentQuantity: 18,
      unitCost: 15.60,
      supplierId: 'sup-03',
      documentNumber: 'NF-90234',
      status: 'warning',
    },
    {
      id: 'lot-04',
      productId: 'prod-03',
      storeId: 'store-01',
      warehouseId: 'wh-01-gen',
      lotNumber: 'LT-CER-HEIN-401',
      manufacturingDate: '2026-09-15',
      expirationDate: '2027-05-15',
      initialQuantity: 720,
      currentQuantity: 680,
      unitCost: 4.25,
      supplierId: 'sup-01',
      documentNumber: 'NF-44021',
      status: 'active',
    },
  ];

  const stockMovements: StockMovement[] = [
    {
      id: 'mov-01',
      productId: 'prod-01',
      storeId: 'store-01',
      warehouseId: 'wh-01-gen',
      type: 'purchase_in',
      quantity: 100,
      previousBalance: 80,
      newBalance: 180,
      unitCost: 22.80,
      totalCost: 2280.0,
      reason: 'Recebimento de Pedido de Compra PC-2026-004',
      documentNumber: 'NF-782910',
      authorizedBy: 'Gerente Roberto Alves',
      userId: 'usr-01',
      userName: 'Carlos Silva (Comprador)',
      createdAt: '2026-11-05T14:30:00Z',
    },
    {
      id: 'mov-02',
      productId: 'prod-04',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      lotId: 'lot-01',
      type: 'expiration_out',
      quantity: 5,
      previousBalance: 145,
      newBalance: 140,
      unitCost: 4.10,
      totalCost: 20.50,
      reason: 'Descarte autorizado de caixas danificadas/vencidas',
      documentNumber: 'TER-PERD-041',
      authorizedBy: 'Auditor Lucas Moura',
      userId: 'usr-02',
      userName: 'Marcos Souza (Estoquista)',
      createdAt: '2026-11-06T09:15:00Z',
    },
    {
      id: 'mov-03',
      productId: 'prod-05',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      type: 'sale_out',
      quantity: 8,
      previousBalance: 40,
      newBalance: 32,
      unitCost: 38.50,
      totalCost: 308.0,
      reason: 'Baixa operacional para balcão de açougue',
      documentNumber: 'REQ-INT-092',
      authorizedBy: 'Gerente Roberto Alves',
      userId: 'usr-03',
      userName: 'Ana Paula (Conferente)',
      createdAt: '2026-11-06T11:45:00Z',
    },
  ];

  const stockLosses: StockLoss[] = [
    {
      id: 'loss-01',
      storeId: 'store-01',
      warehouseId: 'wh-01-cold',
      productId: 'prod-04',
      lotId: 'lot-01',
      quantity: 5,
      unitCost: 4.10,
      totalValue: 20.50,
      reason: 'damaged',
      reasonDescription: 'Embalagem rompida durante empilhamento na câmara fria',
      userId: 'usr-02',
      userName: 'Marcos Souza',
      approvedBy: 'Gerente Roberto Alves',
      date: '2026-11-06T09:15:00Z',
    },
    {
      id: 'loss-02',
      storeId: 'store-01',
      warehouseId: 'wh-01-gen',
      productId: 'prod-06',
      quantity: 2,
      unitCost: 2.15,
      totalValue: 4.30,
      reason: 'broken',
      reasonDescription: 'Queda acidental de frasco no corredor de limpeza',
      userId: 'usr-02',
      userName: 'Marcos Souza',
      approvedBy: 'Roberto Alves',
      date: '2026-11-04T15:20:00Z',
    },
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: 'po-01',
      orderNumber: 'PED-2026-089',
      storeId: 'store-01',
      supplierId: 'sup-04',
      status: 'pending_approval',
      items: [
        { productId: 'prod-05', quantity: 50, unitCost: 38.50, totalCost: 1925.00 },
      ],
      totalValue: 1925.00,
      expectedDeliveryDate: '2026-11-09',
      paymentTerms: '21 DDL',
      notes: 'Reposição urgente de alcatra devido a estoque abaixo do ponto de segurança.',
      createdAt: '2026-11-06T15:30:00Z',
      updatedAt: '2026-11-06T15:30:00Z',
    },
    {
      id: 'po-02',
      orderNumber: 'PED-2026-088',
      storeId: 'store-01',
      supplierId: 'sup-03',
      status: 'received',
      items: [
        { productId: 'prod-04', quantity: 240, unitCost: 4.10, totalCost: 984.00, receivedQty: 240, rejectedQty: 0 },
      ],
      totalValue: 984.00,
      expectedDeliveryDate: '2026-11-04',
      paymentTerms: '28 DDL',
      notes: 'Recebimento 100% conferido com temperatura e lote validados.',
      approvedBy: 'Diretor Comercial',
      createdAt: '2026-10-30T10:00:00Z',
      updatedAt: '2026-11-04T11:20:00Z',
      receiptHistory: [
        { receiptId: 'REC-0912', date: '2026-11-04T11:20:00Z', receivedBy: 'Ana Paula (Conferente)', documentNumber: 'NF-91400' }
      ]
    },
  ];

  const inventorySessions: InventorySession[] = [
    {
      id: 'inv-01',
      sessionNumber: 'INV-2026-01',
      storeId: 'store-01',
      type: 'category',
      targetCategoryId: 'cat-01',
      status: 'approved',
      openedBy: 'Roberto Alves (Gerente)',
      approvedBy: 'Lucas Moura (Auditor)',
      items: [
        {
          productId: 'prod-01',
          warehouseId: 'wh-01-gen',
          theoreticalQty: 180,
          firstCountQty: 180,
          finalCountQty: 180,
          differenceQty: 0,
          unitCost: 22.80,
          financialDifference: 0,
          countedBy: 'Marcos Souza',
          status: 'approved',
        },
        {
          productId: 'prod-02',
          warehouseId: 'wh-01-gen',
          theoreticalQty: 242,
          firstCountQty: 240,
          finalCountQty: 240,
          differenceQty: -2,
          unitCost: 6.40,
          financialDifference: -12.80,
          countedBy: 'Marcos Souza',
          status: 'approved',
        },
      ],
      totalItems: 2,
      divergentItemsCount: 1,
      totalFinancialImpact: -12.80,
      createdAt: '2026-11-01T07:00:00Z',
      completedAt: '2026-11-01T12:00:00Z',
    },
  ];

  const stockTransfers: StockTransfer[] = [
    {
      id: 'trans-01',
      transferNumber: 'TRF-2026-015',
      sourceStoreId: 'store-01',
      sourceWarehouseId: 'wh-01-gen',
      destinationStoreId: 'store-02',
      destinationWarehouseId: 'wh-02-gen',
      status: 'in_transit',
      items: [
        { productId: 'prod-03', quantity: 120, lotNumber: 'LT-CER-HEIN-401' },
      ],
      requestedBy: 'Gerente Loja Jardins',
      approvedBy: 'Roberto Alves',
      dispatchedAt: '2026-11-06T10:00:00Z',
      notes: 'Abastecimento para fim de semana filial Jardins. Em trânsito com veículo refrigerado.',
      createdAt: '2026-11-06T09:30:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-01',
      action: 'SYSTEM_BOOT',
      module: 'SISTEMA',
      entityId: 'SYS',
      entityType: 'System',
      userId: 'usr-super',
      userName: 'Administrador do Sistema',
      userRole: 'superadmin',
      details: 'Inicialização da plataforma ASSX Tech Supermercados com parâmetros seguros e multiunidade habilitada.',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'aud-02',
      action: 'STOCK_MOVEMENT',
      module: 'ESTOQUE',
      entityId: 'mov-01',
      entityType: 'StockMovement',
      storeId: 'store-01',
      userId: 'usr-01',
      userName: 'Carlos Silva',
      userRole: 'buyer',
      details: 'Entrada de 100x Arroz Branco Tipo 1 Camil 5kg vinculada ao Pedido PC-2026-004 e NF-782910.',
      createdAt: '2026-11-05T14:30:00Z',
    },
    {
      id: 'aud-03',
      action: 'LOT_EXPIRATION_ALERT',
      module: 'FEFO_LOTES',
      entityId: 'lot-01',
      entityType: 'StockLot',
      storeId: 'store-01',
      userId: 'system',
      userName: 'Monitor Automático FEFO',
      userRole: 'system',
      details: 'Lote LT-2026101-LEI (Leite Piracanjuba) entrou na faixa crítica de validade (6 dias restantes).',
      createdAt: '2026-11-06T00:01:00Z',
    },
  ];

  const notifications: SystemNotification[] = [
    {
      id: 'notif-01',
      title: 'Lote em Vencimento Crítico (6 dias)',
      message: 'Lote LT-2026101-LEI (Leite Integral Piracanjuba 1L) vence em 12/11/2026. Ação recomendada: Promoção relâmpago ou giro acelerado.',
      type: 'critical',
      category: 'expiring',
      link: '/lotes',
      read: false,
      createdAt: '2026-11-06T00:01:00Z',
    },
    {
      id: 'notif-02',
      title: 'Estoque Abaixo do Ponto de Segurança',
      message: 'Alcatra Bovina Resfriada Friboi (KG) possui 32kg em estoque (Ponto de Reposição: 60kg). Sugestão de compra gerada.',
      type: 'warning',
      category: 'stock_critical',
      link: '/compras',
      read: false,
      createdAt: '2026-11-06T11:45:00Z',
    },
    {
      id: 'notif-03',
      title: 'Transferência em Trânsito',
      message: 'Transferência TRF-2026-015 para Filial Jardins (120x Heineken 350ml) despachada.',
      type: 'info',
      category: 'purchase',
      link: '/transferencias',
      read: false,
      createdAt: '2026-11-06T10:05:00Z',
    },
  ];

  const users: UserProfile[] = [
    {
      id: 'usr-super',
      name: 'Roberto Alves (Super Admin)',
      email: 'roberto.alves@assxsuper.com.br',
      role: 'superadmin',
      jobTitle: 'Administrador Geral',
      department: 'Diretoria & Administração Geral',
      status: 'active',
      storeIds: ['store-01', 'store-02'],
      permissions: getDefaultPermissionsForRole('superadmin'),
      loginCount: 42,
      lastLoginAt: '2026-11-06T20:30:00Z',
    },
    {
      id: 'usr-01',
      name: 'Carlos Silva (Comprador Sênior)',
      email: 'carlos.silva@assxsuper.com.br',
      role: 'buyer',
      jobTitle: 'Comprador',
      department: 'Central de Compras & Suprimentos',
      status: 'active',
      storeIds: ['store-01', 'store-02'],
      permissions: getDefaultPermissionsForRole('buyer'),
      loginCount: 18,
      lastLoginAt: '2026-11-06T18:15:00Z',
    },
    {
      id: 'usr-02',
      name: 'Marcos Souza (Supervisor de Estoque)',
      email: 'marcos.souza@assxsuper.com.br',
      role: 'stockist',
      jobTitle: 'Supervisor de Estoque',
      department: 'Depósito & Câmaras Frias',
      status: 'active',
      storeIds: ['store-01'],
      permissions: getDefaultPermissionsForRole('stockist'),
      loginCount: 29,
      lastLoginAt: '2026-11-06T19:40:00Z',
    },
    {
      id: 'usr-03',
      name: 'Ana Paula (Conferente de Mercadorias)',
      email: 'ana.paula@assxsuper.com.br',
      role: 'checker',
      jobTitle: 'Conferente',
      department: 'Doca de Recebimento',
      status: 'active',
      storeIds: ['store-01'],
      permissions: getDefaultPermissionsForRole('checker'),
      loginCount: 12,
      lastLoginAt: '2026-11-06T15:10:00Z',
    },
    {
      id: 'usr-04',
      name: 'Lucas Moura (Auditor de Processos)',
      email: 'lucas.moura@assxsuper.com.br',
      role: 'auditor',
      jobTitle: 'Auditor',
      department: 'Auditoria & Controladoria',
      status: 'active',
      storeIds: ['store-01', 'store-02'],
      permissions: getDefaultPermissionsForRole('auditor'),
      loginCount: 8,
      lastLoginAt: '2026-11-06T14:00:00Z',
    },
  ];

  const roles: RolePermission[] = [
    {
      id: 'role-superadmin',
      name: 'Superadministrador',
      code: 'superadmin',
      description: 'Acesso total irrestrito a todas as operações, módulos e filiais',
      scopeLocation: 'Todas as Lojas, Matriz & Todos os Módulos',
      allowedAreas: ['Doca de Recebimento', 'Depósito Geral', 'Câmara Fria', 'Salão de Vendas', 'Frente de Caixa', 'Central de Compras', 'Escritório'],
      canView: true,
      canMove: true,
      canApprovePurchases: true,
      canAdjustInventory: true,
      canAudit: true,
      isSystem: true,
    },
    {
      id: 'role-manager',
      name: 'Gerente Geral',
      code: 'manager',
      description: 'Gestão de filial, alçadas e aprovações operacionais',
      scopeLocation: 'Loja Toda, Escritório & Frente de Caixa',
      allowedAreas: ['Salão de Vendas', 'Frente de Caixa', 'Escritório', 'Depósito Geral'],
      canView: true,
      canMove: true,
      canApprovePurchases: true,
      canAdjustInventory: true,
      canAudit: true,
      isSystem: false,
    },
    {
      id: 'role-buyer',
      name: 'Comprador',
      code: 'buyer',
      description: 'Cotações de preços, pedidos de compra e fornecedores',
      scopeLocation: 'Central de Compras & Fornecedores',
      allowedAreas: ['Central de Compras', 'Escritório'],
      canView: true,
      canMove: false,
      canApprovePurchases: false,
      canAdjustInventory: false,
      canAudit: false,
      isSystem: false,
    },
    {
      id: 'role-stockist',
      name: 'Supervisor de Estoque',
      code: 'stockist',
      description: 'Entradas, saídas manuais, controle FEFO e transferências',
      scopeLocation: 'Câmaras Frias, Depósitos & Doca de Cargas',
      allowedAreas: ['Depósito Geral', 'Câmara Fria', 'Doca de Recebimento'],
      canView: true,
      canMove: true,
      canApprovePurchases: false,
      canAdjustInventory: true,
      canAudit: false,
      isSystem: false,
    },
    {
      id: 'role-checker',
      name: 'Conferente',
      code: 'checker',
      description: 'Recebimento na doca, leitura de código de barras e conferência cega',
      scopeLocation: 'Doca de Recebimento & Entrada de Cargas',
      allowedAreas: ['Doca de Recebimento'],
      canView: true,
      canMove: true,
      canApprovePurchases: false,
      canAdjustInventory: false,
      canAudit: false,
      isSystem: false,
    },
    {
      id: 'role-auditor',
      name: 'Auditor de Processos',
      code: 'auditor',
      description: 'Consulta, conciliação e logs de auditoria total',
      scopeLocation: 'Auditoria Central, Inventário & Salão de Vendas',
      allowedAreas: ['Salão de Vendas', 'Depósito Geral', 'Escritório'],
      canView: true,
      canMove: false,
      canApprovePurchases: false,
      canAdjustInventory: true,
      canAudit: true,
      isSystem: false,
    },
  ];

  const labelTemplates: LabelTemplate[] = [
    {
      id: 'tpl-trad-5030',
      name: 'Etiqueta Térmica de Produto (50 x 30 mm)',
      description: 'Padrão industrial para embalagens e rolos térmicos Zebra/Argox (Adesiva)',
      modelCode: 'A_TRADITIONAL',
      widthMm: 50,
      heightMm: 30,
      orientation: 'landscape',
      columns: 1,
      rows: 1,
      gapMm: 2,
      margins: { top: 2, right: 2, bottom: 2, left: 2 },
      barcodeType: 'EAN13',
      elements: {
        showStoreName: true,
        showProductName: true,
        showSku: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: true,
        showPromoPrice: true,
        showOldPrice: true,
        showUnit: true,
        showPricePerKg: false,
        showDiscountBadge: false,
        showPromoValidity: false,
        showCategory: false,
        showBrand: true,
        showLotNumber: false,
        showExpiryDate: false,
        showBorder: false,
        fontSize: 'medium',
        boldPrice: true,
        alignment: 'left',
      },
      isSystemDefault: true,
      isDefault: true,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'tpl-gondola-6040',
      name: 'Etiqueta de Gôndola Supermercado (60 x 40 mm)',
      description: 'Preço em destaque, código de barras e preço por kg/litro (Código de Defesa do Consumidor)',
      modelCode: 'B_GONDOLA',
      widthMm: 60,
      heightMm: 40,
      orientation: 'landscape',
      columns: 1,
      rows: 1,
      gapMm: 3,
      margins: { top: 3, right: 3, bottom: 3, left: 3 },
      barcodeType: 'EAN13',
      elements: {
        showStoreName: true,
        showProductName: true,
        showSku: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: true,
        showPromoPrice: true,
        showOldPrice: true,
        showUnit: true,
        showPricePerKg: true,
        showDiscountBadge: false,
        showPromoValidity: false,
        showCategory: true,
        showBrand: true,
        showLotNumber: false,
        showExpiryDate: false,
        showBorder: true,
        fontSize: 'medium',
        boldPrice: true,
        alignment: 'left',
      },
      isSystemDefault: true,
      isDefault: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'tpl-promo-10050',
      name: 'Etiqueta Promocional / Oferta Especial (100 x 50 mm)',
      description: 'Preço anterior riscado, preço promocional em destaque, % de desconto e validade da oferta',
      modelCode: 'C_PROMOTIONAL',
      widthMm: 100,
      heightMm: 50,
      orientation: 'landscape',
      columns: 1,
      rows: 1,
      gapMm: 3,
      margins: { top: 3, right: 3, bottom: 3, left: 3 },
      barcodeType: 'EAN13',
      elements: {
        showStoreName: true,
        showProductName: true,
        showSku: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: true,
        showPromoPrice: true,
        showOldPrice: true,
        showUnit: true,
        showPricePerKg: true,
        showDiscountBadge: true,
        showPromoValidity: true,
        showCategory: true,
        showBrand: true,
        showLotNumber: false,
        showExpiryDate: false,
        showBorder: true,
        fontSize: 'large',
        boldPrice: true,
        alignment: 'left',
      },
      isSystemDefault: true,
      isDefault: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'tpl-ident-100150',
      name: 'Identificação Logística / Palete & Caixa (100 x 150 mm)',
      description: 'Lote, validade, rastreabilidade GS1, Code 128 e identificação de depósito',
      modelCode: 'D_IDENTIFICATION',
      widthMm: 100,
      heightMm: 150,
      orientation: 'portrait',
      columns: 1,
      rows: 1,
      gapMm: 4,
      margins: { top: 4, right: 4, bottom: 4, left: 4 },
      barcodeType: 'CODE128',
      elements: {
        showStoreName: true,
        showProductName: true,
        showSku: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: false,
        showPromoPrice: false,
        showOldPrice: false,
        showUnit: true,
        showPricePerKg: false,
        showDiscountBadge: false,
        showPromoValidity: false,
        showCategory: true,
        showBrand: true,
        showLotNumber: true,
        showExpiryDate: true,
        showBorder: true,
        fontSize: 'large',
        boldPrice: false,
        alignment: 'left',
      },
      isSystemDefault: true,
      isDefault: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'tpl-produce-6040',
      name: 'Hortifruti & Pesáveis Balança (60 x 40 mm)',
      description: 'Preço por kg em destaque, código interno de pesagem e unidade de venda',
      modelCode: 'E_PRODUCE',
      widthMm: 60,
      heightMm: 40,
      orientation: 'landscape',
      columns: 1,
      rows: 1,
      gapMm: 3,
      margins: { top: 3, right: 3, bottom: 3, left: 3 },
      barcodeType: 'EAN13',
      elements: {
        showStoreName: true,
        showProductName: true,
        showSku: true,
        showBarcode: true,
        showBarcodeText: true,
        showPrice: true,
        showPromoPrice: true,
        showOldPrice: false,
        showUnit: true,
        showPricePerKg: true,
        showDiscountBadge: false,
        showPromoValidity: false,
        showCategory: true,
        showBrand: false,
        showLotNumber: false,
        showExpiryDate: false,
        showBorder: true,
        fontSize: 'medium',
        boldPrice: true,
        alignment: 'left',
      },
      isSystemDefault: true,
      isDefault: false,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];

  const labelPrinters: LabelPrinter[] = [
    {
      id: 'printer-zebra-01',
      name: 'Zebra ZD220 — Gôndolas Salão de Vendas',
      model: 'Zebra ZD220 (Thermal)',
      connectionType: 'network',
      protocol: 'ZPL',
      ipAddress: '192.168.1.185',
      port: 9100,
      densityDpi: 203,
      speedIps: 4,
      isDefault: true,
      status: 'ready',
      lastCommunication: '2026-11-06T20:45:00Z',
      defaultTemplateId: 'tpl-trad-5030',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'printer-argox-02',
      name: 'Argox OS-214 Plus — Depósito & Doca',
      model: 'Argox OS-214 Plus',
      connectionType: 'usb',
      protocol: 'EPL',
      densityDpi: 203,
      speedIps: 3,
      isDefault: false,
      status: 'ready',
      lastCommunication: '2026-11-06T18:30:00Z',
      defaultTemplateId: 'tpl-ident-100150',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'printer-elgin-03',
      name: 'Elgin L42 Pro — Bancada de Conferência',
      model: 'Elgin L42 Pro',
      connectionType: 'usb',
      protocol: 'ESC_POS',
      densityDpi: 203,
      speedIps: 4,
      isDefault: false,
      status: 'ready',
      lastCommunication: '2026-11-06T19:10:00Z',
      defaultTemplateId: 'tpl-trad-5030',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'printer-pdf-04',
      name: 'Gerador PDF & Impressora Virtual A4/Térmica',
      model: 'ASSX PDF Virtual Spooler',
      connectionType: 'browser_pdf',
      protocol: 'PDF',
      densityDpi: 300,
      speedIps: 5,
      isDefault: false,
      status: 'online',
      lastCommunication: '2026-11-06T22:50:00Z',
      defaultTemplateId: 'tpl-gondola-6040',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const labelPriceChanges: LabelPriceChange[] = [
    {
      id: 'pc-01',
      productId: 'prod-01',
      productName: 'Arroz Branco Tipo 1 Camil 5kg',
      sku: 'ARR-CAM-5KG',
      ean: '7896006700015',
      categoryId: 'cat-01',
      categoryName: 'Mercearia',
      previousPrice: 26.90,
      newPrice: 28.90,
      difference: 2.00,
      percentageChange: 7.43,
      changeType: 'increase',
      changedAt: '2026-11-06T09:15:00Z',
      changedBy: 'Carlos Silva (Comprador)',
      status: 'pending',
    },
    {
      id: 'pc-02',
      productId: 'prod-02',
      productName: 'Feijão Carioca Tipo 1 Kicaldo 1kg',
      sku: 'FEI-KIC-1KG',
      ean: '7896006700022',
      categoryId: 'cat-01',
      categoryName: 'Mercearia',
      previousPrice: 8.99,
      newPrice: 7.99,
      difference: -1.00,
      percentageChange: -11.12,
      changeType: 'decrease',
      changedAt: '2026-11-06T10:30:00Z',
      changedBy: 'Roberto Alves (Gerente Geral)',
      status: 'pending',
    },
    {
      id: 'pc-03',
      productId: 'prod-04',
      productName: 'Leite Integral UHT Piracanjuba 1L',
      sku: 'LEI-PIR-1L',
      ean: '7898215150011',
      categoryId: 'cat-04',
      categoryName: 'Laticínios',
      previousPrice: 5.49,
      newPrice: 4.89,
      difference: -0.60,
      percentageChange: -10.93,
      changeType: 'decrease',
      changedAt: '2026-11-05T16:00:00Z',
      changedBy: 'Carlos Silva (Comprador)',
      status: 'pending',
    },
    {
      id: 'pc-04',
      productId: 'prod-05',
      productName: 'Café Torrado e Moído Pilão Tradicional 500g',
      sku: 'CAF-PIL-500G',
      ean: '7891000100101',
      categoryId: 'cat-01',
      categoryName: 'Mercearia',
      previousPrice: 19.90,
      newPrice: 21.50,
      difference: 1.60,
      percentageChange: 8.04,
      changeType: 'increase',
      changedAt: '2026-11-04T11:20:00Z',
      changedBy: 'Carlos Silva (Comprador)',
      status: 'printed',
      printedAt: '2026-11-04T14:00:00Z',
      printJobId: 'job-hist-01',
    },
  ];

  const labelPrintJobs: LabelPrintJob[] = [
    {
      id: 'job-hist-01',
      jobCode: 'JOB-2026-0001',
      storeId: 'store-01',
      storeName: 'ASSX Supermercados - Matriz Centro',
      printerId: 'printer-zebra-01',
      printerName: 'Zebra ZD220 — Gôndolas Salão de Vendas',
      templateId: 'tpl-trad-5030',
      templateName: 'Etiqueta Térmica de Produto (50 x 30 mm)',
      type: 'price_change',
      totalProducts: 1,
      totalLabels: 8,
      confirmedLabels: 8,
      failedLabels: 0,
      status: 'confirmed',
      items: [
        {
          productId: 'prod-05',
          productName: 'Café Torrado e Moído Pilão Tradicional 500g',
          sku: 'CAF-PIL-500G',
          ean: '7891000100101',
          salePrice: 21.50,
          unit: 'PCT',
          brand: 'Pilão',
          copies: 8,
          printed: true,
          printedAt: '2026-11-04T14:00:00Z',
        },
      ],
      userId: 'usr-super',
      userName: 'Roberto Alves (Gerente Geral)',
      userRole: 'superadmin',
      createdAt: '2026-11-04T13:58:00Z',
      confirmedAt: '2026-11-04T14:00:00Z',
    },
  ];

  return {
    stores,
    warehouses,
    categories,
    suppliers,
    products,
    stockBalances,
    stockLots,
    stockMovements,
    stockLosses,
    purchaseOrders,
    inventorySessions,
    stockTransfers,
    auditLogs,
    notifications,
    users,
    roles,
    labelTemplates,
    labelPrinters,
    labelPriceChanges,
    labelPrintJobs,
  };
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        let needsSave = false;

        if (!parsed.roles || parsed.roles.length === 0) {
          const initial = getInitialData();
          parsed.roles = initial.roles;
          needsSave = true;
        }

        if (!parsed.labelTemplates || parsed.labelTemplates.length === 0) {
          const initial = getInitialData();
          parsed.labelTemplates = initial.labelTemplates;
          parsed.labelPrinters = initial.labelPrinters;
          parsed.labelPriceChanges = initial.labelPriceChanges;
          parsed.labelPrintJobs = initial.labelPrintJobs;
          needsSave = true;
        }

        // Check if existing products have promo flags, if not enrich them
        if (parsed.products && parsed.products.length > 0) {
          parsed.products.forEach((p: any) => {
            if (p.id === 'prod-01' && p.promotionalPrice === undefined) {
              p.promotionalPrice = 24.90;
              p.promoStartDate = '2026-11-01';
              p.promoEndDate = '2026-11-15';
              p.isPromoActive = true;
              p.previousPrice = 26.90;
              p.needsLabelReprint = true;
              needsSave = true;
            }
            if (p.id === 'prod-03' && p.promotionalPrice === undefined) {
              p.promotionalPrice = 6.49;
              p.promoStartDate = '2026-11-01';
              p.promoEndDate = '2026-11-10';
              p.isPromoActive = true;
              needsSave = true;
            }
            if (p.id === 'prod-04' && p.promotionalPrice === undefined) {
              p.promotionalPrice = 4.49;
              p.promoStartDate = '2026-11-05';
              p.promoEndDate = '2026-11-12';
              p.isPromoActive = true;
              p.previousPrice = 5.49;
              p.needsLabelReprint = true;
              needsSave = true;
            }
          });
        }

        // Check and enrich users with operator fields & permissions
        if (parsed.users && parsed.users.length > 0) {
          const initial = getInitialData();
          parsed.users.forEach((u: any) => {
            const initialUser = initial.users.find(iu => iu.id === u.id);
            if (!u.status) {
              u.status = 'active';
              needsSave = true;
            }
            if (!u.jobTitle) {
              u.jobTitle = initialUser?.jobTitle || (u.role === 'superadmin' ? 'Administrador Geral' : 'Operador');
              needsSave = true;
            }
            if (!u.department) {
              u.department = initialUser?.department || (u.role === 'superadmin' ? 'Diretoria Executiva' : 'Operações');
              needsSave = true;
            }
            if (!u.permissions) {
              u.permissions = getDefaultPermissionsForRole(u.role || 'stockist');
              needsSave = true;
            }
            if (u.id === 'usr-super') {
              u.role = 'superadmin';
              u.status = 'active';
              u.jobTitle = 'Administrador Geral';
              u.department = 'Diretoria & Administração Geral';
              u.permissions = getDefaultPermissionsForRole('superadmin');
              needsSave = true;
            }
          });
        }

        if (needsSave) {
          this.persist(parsed);
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, recreating default:', err);
    }
    const initial = getInitialData();
    this.persist(initial);
    return initial;
  }

  private persist(dataToSave: DatabaseSchema) {
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  }

  public save() {
    this.persist(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public replaceData(newData: DatabaseSchema) {
    this.data = newData;
    this.save();
  }

  // AUDIT HELPER
  public logAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>) {
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(log);
    // keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
    return log;
  }

  // TRANSACTIONAL STOCK MOVEMENT
  public executeStockMovement(params: {
    productId: string;
    storeId: string;
    warehouseId: string;
    lotId?: string;
    type: StockMovement['type'];
    quantity: number;
    reason: string;
    documentNumber?: string;
    authorizedBy?: string;
    allowNegative?: boolean;
    user: { id: string; name: string; role: string };
  }): { success: boolean; movement?: StockMovement; error?: string } {
    const { productId, lotId, type, quantity, documentNumber, authorizedBy, allowNegative, user } = params;

    if (quantity <= 0) {
      return { success: false, error: 'A quantidade da movimentação deve ser maior que zero.' };
    }

    const product = this.data.products.find(p => p.id === productId);
    if (!product) {
      return { success: false, error: 'Produto não encontrado no catálogo do supermercado.' };
    }

    // Resolve warehouse and store gracefully if not provided or empty
    let warehouse = this.data.warehouses.find(w => w.id === params.warehouseId);
    if (!warehouse) {
      warehouse = this.data.warehouses.find(w => w.storeId === params.storeId) || this.data.warehouses[0];
    }
    const warehouseId = warehouse?.id || 'wh-01-gen';
    const storeId = params.storeId || warehouse?.storeId || this.data.stores[0]?.id || 'store-01';

    // Auto-generate descriptive reason if empty
    const reason = params.reason?.trim() || (
      type === 'adjustment_in' ? 'Ajuste positivo de estoque via conferência operacional' :
      type === 'adjustment_out' ? 'Ajuste negativo de regularização de saldo' :
      type === 'purchase_in' ? 'Entrada operacional de mercadorias' :
      type === 'sale_out' ? 'Saída de estoque no ponto de venda / balcão' :
      type === 'consumption_out' ? 'Consumo interno operacional' :
      type === 'loss_out' ? 'Avaria / Perda física constatada' :
      type === 'expiration_out' ? 'Descarte por prazo de validade expirado' :
      'Movimentação manual de estoque registrada pelo operador'
    );

    // Find or create balance
    let balance = this.data.stockBalances.find(
      b => b.productId === productId && b.storeId === storeId && b.warehouseId === warehouseId
    );

    if (!balance) {
      balance = {
        id: `sb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId,
        storeId,
        warehouseId,
        physicalQty: 0,
        reservedQty: 0,
        availableQty: 0,
        blockedQty: 0,
        avgCost: product.costPrice,
        updatedAt: new Date().toISOString(),
      };
      this.data.stockBalances.push(balance);
    }

    const isExit = [
      'consumption_out',
      'loss_out',
      'expiration_out',
      'transfer_out',
      'supplier_return_out',
      'adjustment_out',
      'sale_out',
    ].includes(type);

    const prevBalance = balance.physicalQty;
    const qtyChange = isExit ? -quantity : quantity;
    const newPhysicalBalance = prevBalance + qtyChange;

    // Invariant: No negative stock unless explicitly authorized by manager/admin
    if (newPhysicalBalance < 0 && !allowNegative) {
      return {
        success: false,
        error: `Saldo insuficiente! Saldo atual: ${prevBalance} ${product.unit}, saída solicitada: ${quantity} ${product.unit}. Estoque negativo bloqueado pelas regras de conformidade.`,
      };
    }

    // Handle lot deduction if lotId is specified
    if (lotId) {
      const lot = this.data.stockLots.find(l => l.id === lotId);
      if (lot) {
        if (isExit) {
          if (lot.currentQuantity < quantity && !allowNegative) {
            return {
              success: false,
              error: `Quantidade no Lote ${lot.lotNumber} (${lot.currentQuantity}) é inferior à saída (${quantity}).`,
            };
          }
          lot.currentQuantity = Math.max(0, lot.currentQuantity - quantity);
          if (lot.currentQuantity === 0) lot.status = 'depleted';
        } else {
          lot.currentQuantity += quantity;
          if (lot.status === 'depleted') lot.status = 'active';
        }
      }
    }

    // Update balance
    balance.physicalQty = newPhysicalBalance;
    balance.availableQty = Math.max(0, balance.physicalQty - balance.reservedQty);
    balance.updatedAt = new Date().toISOString();

    const unitCost = product.costPrice;
    const totalCost = Number((unitCost * quantity).toFixed(2));

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      storeId,
      warehouseId,
      lotId,
      type,
      quantity,
      previousBalance: prevBalance,
      newBalance: newPhysicalBalance,
      unitCost,
      totalCost,
      reason,
      documentNumber,
      authorizedBy: authorizedBy || (allowNegative ? user.name : undefined),
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString(),
    };

    this.data.stockMovements.unshift(movement);

    // Audit trail
    this.logAudit({
      action: 'STOCK_MOVEMENT',
      module: 'ESTOQUE',
      entityId: movement.id,
      entityType: 'StockMovement',
      storeId,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Movimentação ${type.toUpperCase()}: ${product.name} (Qtd: ${quantity} ${product.unit}) | Saldo: ${prevBalance} -> ${newPhysicalBalance}. Motivo: ${reason}`,
      previousState: { physicalQty: prevBalance },
      newState: { physicalQty: newPhysicalBalance },
    });

    // Check min stock alert trigger
    if (newPhysicalBalance <= product.minStock) {
      this.data.notifications.unshift({
        id: `notif-${Date.now()}`,
        title: `Estoque Crítico: ${product.name}`,
        message: `Saldo atual (${newPhysicalBalance} ${product.unit}) atingiu nível mínimo (${product.minStock}). Reposição imediata recomendada.`,
        type: newPhysicalBalance <= product.safetyStock ? 'critical' : 'warning',
        category: 'stock_critical',
        link: '/estoque',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    this.save();
    return { success: true, movement };
  }

  // REPLENISHMENT ENGINE
  public getReplenishmentSuggestions(storeId?: string): ReplenishmentSuggestion[] {
    const suggestions: ReplenishmentSuggestion[] = [];

    for (const product of this.data.products) {
      if (product.status !== 'active') continue;

      const balances = this.data.stockBalances.filter(
        b => b.productId === product.id && (!storeId || b.storeId === storeId)
      );
      const currentStock = balances.reduce((sum, b) => sum + b.physicalQty, 0);

      const supplier = this.data.suppliers.find(s => s.id === product.supplierId);
      const leadTime = supplier?.leadTimeDays || 4;

      // Estimate average daily consumption from movements or minStock ratio
      const exitMovements = this.data.stockMovements.filter(
        m => m.productId === product.id && ['sale_out', 'consumption_out'].includes(m.type)
      );
      const totalExits = exitMovements.reduce((sum, m) => sum + m.quantity, 0);
      const avgDaily = totalExits > 0 ? Math.max(1, Math.round(totalExits / 15)) : Math.max(2, Math.round(product.minStock / 15));

      // Reorder Point = (LeadTime * AvgDaily) + SafetyStock
      const calculatedReorderPoint = product.reorderPoint || (leadTime * avgDaily + product.safetyStock);

      // Check pending orders for this product
      const pendingQty = this.data.purchaseOrders
        .filter(po => ['draft', 'pending_approval', 'approved', 'sent'].includes(po.status))
        .flatMap(po => po.items)
        .filter(item => item.productId === product.id)
        .reduce((sum, item) => sum + (item.quantity - (item.receivedQty || 0)), 0);

      const effectiveStock = currentStock + pendingQty;

      if (effectiveStock <= calculatedReorderPoint) {
        // Suggested qty to reach Max Stock
        const targetStock = product.maxStock > 0 ? product.maxStock : calculatedReorderPoint * 2.5;
        const suggestedQty = Math.max(product.minStock, Math.round(targetStock - effectiveStock));

        let urgency: 'critical' | 'medium' | 'normal' = 'normal';
        if (currentStock <= product.safetyStock) {
          urgency = 'critical';
        } else if (currentStock <= calculatedReorderPoint) {
          urgency = 'medium';
        }

        const reason = currentStock <= product.safetyStock
          ? `Estoque abaixo do nível de segurança (${currentStock}/${product.safetyStock} ${product.unit}). Risco alto de ruptura na gôndola!`
          : `Atingiu ponto de reposição (${calculatedReorderPoint} ${product.unit}). Prazo de entrega do fornecedor: ${leadTime} dias.`;

        suggestions.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock,
          minStock: product.minStock,
          safetyStock: product.safetyStock,
          reorderPoint: calculatedReorderPoint,
          leadTimeDays: leadTime,
          avgDailySales: avgDaily,
          suggestedQty,
          supplierId: product.supplierId,
          supplierName: supplier?.tradeName || 'Fornecedor Padrão',
          costPrice: product.costPrice,
          estimatedCost: Number((suggestedQty * product.costPrice).toFixed(2)),
          urgency,
          reason,
        });
      }
    }

    // Sort by urgency: critical first
    const urgencyOrder = { critical: 0, medium: 1, normal: 2 };
    return suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }

  // ABC CURVE CALCULATION (By Cost Valuation & Movement Impact)
  public getAbcAnalysis(storeId?: string): { items: AbcItem[]; summary: { aCount: number; bCount: number; cCount: number; totalValuation: number } } {
    const itemsWithValues = this.data.products.map(p => {
      const balances = this.data.stockBalances.filter(
        b => b.productId === p.id && (!storeId || b.storeId === storeId)
      );
      const stockQty = balances.reduce((sum, b) => sum + b.physicalQty, 0);
      const totalCostValue = stockQty * p.costPrice;
      const totalSalesValue = stockQty * p.salePrice;
      const category = this.data.categories.find(c => c.id === p.categoryId);

      return {
        productId: p.id,
        productName: p.name,
        categoryName: category?.name || 'Geral',
        stockQty,
        totalCostValue: Number(totalCostValue.toFixed(2)),
        totalSalesValue: Number(totalSalesValue.toFixed(2)),
      };
    });

    // Sort descending by value
    itemsWithValues.sort((a, b) => b.totalSalesValue - a.totalSalesValue);

    const totalSalesSum = itemsWithValues.reduce((sum, item) => sum + item.totalSalesValue, 0) || 1;
    let accumulated = 0;
    let aCount = 0;
    let bCount = 0;
    let cCount = 0;

    const classifiedItems: AbcItem[] = itemsWithValues.map(item => {
      accumulated += item.totalSalesValue;
      const cumulativePercentage = Number(((accumulated / totalSalesSum) * 100).toFixed(1));

      let classification: 'A' | 'B' | 'C' = 'C';
      if (cumulativePercentage <= 75) {
        classification = 'A';
        aCount++;
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
        bCount++;
      } else {
        classification = 'C';
        cCount++;
      }

      return {
        ...item,
        cumulativeSalesPercentage: cumulativePercentage,
        classification,
      };
    });

    const totalValuation = itemsWithValues.reduce((sum, item) => sum + item.totalCostValue, 0);

    return {
      items: classifiedItems,
      summary: {
        aCount,
        bCount,
        cCount,
        totalValuation: Number(totalValuation.toFixed(2)),
      },
    };
  }

  // ==========================================
  // MÓDULO DE IMPRESSÃO DE ETIQUETAS — MÉTODOS
  // ==========================================

  public recordPriceChange(params: {
    productId: string;
    previousPrice: number;
    newPrice: number;
    changedBy: string;
  }): LabelPriceChange | null {
    if (params.previousPrice === params.newPrice) return null;

    const prod = this.data.products.find(p => p.id === params.productId);
    if (!prod) return null;

    const category = this.data.categories.find(c => c.id === prod.categoryId);
    const diff = Number((params.newPrice - params.previousPrice).toFixed(2));
    const percentage = Number((((params.newPrice - params.previousPrice) / params.previousPrice) * 100).toFixed(2));
    const changeType: 'increase' | 'decrease' = params.newPrice > params.previousPrice ? 'increase' : 'decrease';

    const changeRecord: LabelPriceChange = {
      id: `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      ean: prod.ean,
      categoryId: prod.categoryId,
      categoryName: category?.name || 'Geral',
      previousPrice: params.previousPrice,
      newPrice: params.newPrice,
      difference: diff,
      percentageChange: percentage,
      changeType,
      changedAt: new Date().toISOString(),
      changedBy: params.changedBy,
      status: 'pending',
    };

    if (!this.data.labelPriceChanges) {
      this.data.labelPriceChanges = [];
    }

    this.data.labelPriceChanges.unshift(changeRecord);

    // Mark product as needing label reprint
    prod.previousPrice = params.previousPrice;
    prod.lastPriceChangeDate = changeRecord.changedAt;
    prod.needsLabelReprint = true;

    // Trigger notification
    this.data.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Preço Alterado: ${prod.name}`,
      message: `Preço alterado de R$ ${params.previousPrice.toFixed(2)} para R$ ${params.newPrice.toFixed(2)} (${percentage > 0 ? '+' : ''}${percentage}%). Nova etiqueta de gôndola pendente.`,
      type: 'info',
      category: 'purchase',
      link: '/labels',
      read: false,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return changeRecord;
  }

  public markPriceChangesPrinted(priceChangeIds: string[], printJobId?: string) {
    if (!this.data.labelPriceChanges) return;
    const now = new Date().toISOString();

    this.data.labelPriceChanges.forEach(pc => {
      if (priceChangeIds.includes(pc.id)) {
        pc.status = 'printed';
        pc.printedAt = now;
        if (printJobId) pc.printJobId = printJobId;

        // Also update product status
        const prod = this.data.products.find(p => p.id === pc.productId);
        if (prod) {
          prod.needsLabelReprint = false;
          prod.lastLabelPrintedAt = now;
        }
      }
    });

    this.save();
  }

  public getLabelDashboardStats(storeId?: string) {
    const today = new Date().toISOString().split('T')[0];
    const monthPrefix = today.slice(0, 7);

    const jobs = this.data.labelPrintJobs || [];
    const priceChanges = this.data.labelPriceChanges || [];
    const products = this.data.products || [];

    const jobsToday = jobs.filter(j => j.createdAt.startsWith(today) && j.status === 'confirmed');
    const totalPrintedToday = jobsToday.reduce((sum, j) => sum + j.confirmedLabels, 0);

    const monthJobs = jobs.filter(j => j.createdAt.startsWith(monthPrefix) && j.status === 'confirmed');
    const monthPrintsCount = monthJobs.reduce((sum, j) => sum + j.confirmedLabels, 0);

    const pendingPriceChanges = priceChanges.filter(pc => pc.status === 'pending');
    const activePromos = products.filter(p => p.isPromoActive && p.promotionalPrice && p.promotionalPrice < p.salePrice);
    const missingBarcodes = products.filter(p => !p.ean || p.ean.trim() === '');

    return {
      totalPrintedToday,
      totalAvailableProducts: products.length,
      priceChangedPendingCount: pendingPriceChanges.length,
      priceChangedTotalCount: priceChanges.length,
      activePromosCount: activePromos.length,
      monthPrintsCount,
      lastPrintJob: jobs[0],
      pendingAlertsCount: pendingPriceChanges.length + (missingBarcodes.length > 0 ? 1 : 0),
      missingBarcodesCount: missingBarcodes.length,
    };
  }
}

export const db = new Database();

