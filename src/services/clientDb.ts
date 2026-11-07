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
  LabelDashboardStats,
  OperatorPermissions,
  LabelPrintJobItem,
} from '../types/index.ts';
import { initialSupermarketData } from '../data/initialSupermarketData.ts';

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

const STORAGE_KEY = 'assx_supermarket_db_v1';

export class ClientDatabase {
  private data: DatabaseSchema;
  private activeUserId: string = 'usr-super';

  constructor() {
    this.data = this.loadFromStorage();
  }

  public setActiveUser(userId: string) {
    this.activeUserId = userId;
  }

  public getActiveUser(): UserProfile {
    const user = this.data.users.find(u => u.id === this.activeUserId) || this.data.users[0];
    return user;
  }

  private loadFromStorage(): DatabaseSchema {
    if (typeof window === 'undefined') {
      return JSON.parse(JSON.stringify(initialSupermarketData));
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DatabaseSchema;
        if (
          parsed &&
          Array.isArray(parsed.products) &&
          parsed.products.length > 0 &&
          Array.isArray(parsed.suppliers) &&
          parsed.suppliers.length > 0 &&
          Array.isArray(parsed.stockBalances) &&
          parsed.stockBalances.length > 0
        ) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[ASSX ClientDB] Erro ao carregar dados do localStorage, restaurando matriz inicial:', err);
    }

    const initial = JSON.parse(JSON.stringify(initialSupermarketData));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (_) {}
    return initial;
  }

  public save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.error('[ASSX ClientDB] Falha ao persistir no localStorage:', err);
    }
  }

  public logAudit(entry: {
    action: string;
    module: string;
    entityId?: string;
    entityType?: string;
    details: string;
  }) {
    const user = this.getActiveUser();
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: entry.action,
      module: entry.module,
      entityId: entry.entityId || 'general',
      entityType: entry.entityType || 'General',
      details: entry.details,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // --- AUTHENTICATION ---
  public login(userId: string): { user: UserProfile; token: string; message: string } {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('Operador não encontrado no sistema.');
    }
    if (user.status === 'inactive') {
      throw new Error('Operador inativo. Contate o Super Administrador.');
    }
    user.lastLoginAt = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    this.setActiveUser(user.id);
    this.logAudit({
      action: 'LOGIN',
      module: 'AUTENTICACAO',
      entityId: user.id,
      entityType: 'UserProfile',
      details: `Sessão iniciada com sucesso: ${user.name} (${user.role})`,
    });
    this.save();
    return {
      user,
      token: `sess_${user.id}_${Date.now()}`,
      message: `Bem-vindo(a), ${user.name}! Acesso concedido.`,
    };
  }

  public logout(): { success: boolean; message: string } {
    const user = this.getActiveUser();
    this.logAudit({
      action: 'LOGOUT',
      module: 'AUTENTICACAO',
      entityId: user.id,
      entityType: 'UserProfile',
      details: `Sessão encerrada pelo operador: ${user.name}`,
    });
    this.save();
    return { success: true, message: 'Sessão encerrada com sucesso.' };
  }

  public getMe(): UserProfile {
    return this.getActiveUser();
  }

  // --- USERS & OPERATORS ---
  public getUsers(): UserProfile[] {
    return this.data.users;
  }

  public createUser(userData: Partial<UserProfile>): UserProfile {
    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: userData.name || 'Novo Operador',
      email: userData.email || '',
      role: userData.role || 'stockist',
      jobTitle: userData.jobTitle || 'Operador',
      department: userData.department || 'Operações',
      status: userData.status || 'active',
      storeIds: userData.storeIds || ['store-01'],
      permissions: userData.permissions,
      scopeLocation: userData.scopeLocation,
      allowedAreas: userData.allowedAreas,
      canView: userData.canView !== undefined ? userData.canView : true,
      canMove: userData.canMove,
      canApprovePurchases: userData.canApprovePurchases,
      canAdjustInventory: userData.canAdjustInventory,
      canAudit: userData.canAudit,
      canEditMargin: userData.canEditMargin,
      loginCount: 0,
    };
    this.data.users.push(newUser);
    this.logAudit({
      action: 'USER_CREATED',
      module: 'OPERADORES',
      entityId: newUser.id,
      entityType: 'UserProfile',
      details: `Novo operador cadastrado: ${newUser.name} (${newUser.role})`,
    });
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<UserProfile>): UserProfile {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Operador não encontrado.');
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.logAudit({
      action: 'USER_UPDATED',
      module: 'OPERADORES',
      entityId: id,
      entityType: 'UserProfile',
      details: `Cadastro de operador alterado: ${this.data.users[idx].name}`,
    });
    this.save();
    return this.data.users[idx];
  }

  public updateUserStatus(id: string, status: 'active' | 'inactive'): UserProfile {
    return this.updateUser(id, { status });
  }

  public updateUserPermissions(id: string, permissions: OperatorPermissions): UserProfile {
    return this.updateUser(id, { permissions });
  }

  public deleteUser(id: string): { success: boolean; deletedId: string } {
    const user = this.data.users.find(u => u.id === id);
    if (user?.role === 'superadmin') {
      throw new Error('Não é permitido remover o Super Administrador do sistema.');
    }
    this.data.users = this.data.users.filter(u => u.id !== id);
    this.logAudit({
      action: 'USER_DELETED',
      module: 'OPERADORES',
      entityId: id,
      entityType: 'UserProfile',
      details: `Operador excluído do sistema: ${user?.name || id}`,
    });
    this.save();
    return { success: true, deletedId: id };
  }

  // --- ROLES ---
  public getRoles(): RolePermission[] {
    return this.data.roles;
  }

  public createRole(roleData: Partial<RolePermission>): RolePermission {
    const newRole: RolePermission = {
      id: `role-${Date.now()}`,
      name: roleData.name || 'Novo Perfil',
      code: roleData.code || 'CUSTOM',
      description: roleData.description || '',
      scopeLocation: roleData.scopeLocation || 'Todas as Unidades',
      allowedAreas: roleData.allowedAreas || ['Depósito Geral'],
      canView: roleData.canView !== undefined ? roleData.canView : true,
      canMove: !!roleData.canMove,
      canApprovePurchases: !!roleData.canApprovePurchases,
      canAdjustInventory: !!roleData.canAdjustInventory,
      canAudit: !!roleData.canAudit,
      canEditMargin: !!roleData.canEditMargin,
      isSystem: false,
    };
    this.data.roles.push(newRole);
    this.save();
    return newRole;
  }

  public updateRole(id: string, updates: Partial<RolePermission>): RolePermission {
    const idx = this.data.roles.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Perfil não encontrado.');
    this.data.roles[idx] = { ...this.data.roles[idx], ...updates };
    this.save();
    return this.data.roles[idx];
  }

  public deleteRole(id: string): { success: boolean; deletedId: string } {
    this.data.roles = this.data.roles.filter(r => r.id !== id);
    this.save();
    return { success: true, deletedId: id };
  }

  // --- STORES & WAREHOUSES ---
  public getStores(): { stores: Store[]; warehouses: Warehouse[] } {
    return {
      stores: this.data.stores,
      warehouses: this.data.warehouses,
    };
  }

  public createStore(storeData: Partial<Store>): Store {
    const newStore: Store = {
      id: `store-${Date.now()}`,
      name: storeData.name || 'Nova Unidade',
      code: storeData.code || `LJ-${this.data.stores.length + 1}`,
      cnpj: storeData.cnpj || '',
      address: storeData.address || '',
      city: storeData.city || '',
      state: storeData.state || 'SP',
      timezone: 'America/Sao_Paulo',
      isMain: false,
    };
    this.data.stores.push(newStore);
    this.save();
    return newStore;
  }

  // --- CATEGORIES ---
  public getCategories(): Category[] {
    return this.data.categories;
  }

  // --- SUPPLIERS ---
  public getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  public createSupplier(supplierData: Partial<Supplier>): Supplier {
    const newSupplier: Supplier = {
      id: `sup-${Date.now()}`,
      corporateName: supplierData.corporateName || 'Fornecedor Cadastrado',
      tradeName: supplierData.tradeName || supplierData.corporateName || 'Fornecedor',
      cnpj: supplierData.cnpj || '',
      address: supplierData.address || '',
      city: supplierData.city || '',
      state: supplierData.state || 'SP',
      zipCode: supplierData.zipCode || '',
      contactName: supplierData.contactName || '',
      email: supplierData.email || '',
      phone: supplierData.phone || '',
      leadTimeDays: Number(supplierData.leadTimeDays) || 3,
      paymentTerms: supplierData.paymentTerms || '30 dias',
      rating: Number(supplierData.rating) || 5,
      status: supplierData.status || 'active',
    };
    this.data.suppliers.push(newSupplier);
    this.logAudit({
      action: 'SUPPLIER_CREATED',
      module: 'FORNECEDORES',
      entityId: newSupplier.id,
      entityType: 'Supplier',
      details: `Fornecedor cadastrado: ${newSupplier.tradeName} (CNPJ: ${newSupplier.cnpj})`,
    });
    this.save();
    return newSupplier;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>): Supplier {
    const idx = this.data.suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Fornecedor não encontrado.');
    this.data.suppliers[idx] = { ...this.data.suppliers[idx], ...updates };
    this.logAudit({
      action: 'SUPPLIER_UPDATED',
      module: 'FORNECEDORES',
      entityId: id,
      entityType: 'Supplier',
      details: `Fornecedor atualizado: ${this.data.suppliers[idx].tradeName}`,
    });
    this.save();
    return this.data.suppliers[idx];
  }

  // --- PRODUCTS ---
  public getProducts(params?: {
    q?: string;
    category?: string;
    supplier?: string;
    status?: string;
    storeId?: string;
  }): (Product & {
    totalPhysicalStock: number;
    totalAvailableStock: number;
    totalReservedStock: number;
    totalBlockedStock: number;
    stockValue: number;
    potentialSaleValue: number;
    potentialGrossProfit: number;
  })[] {
    const search = params?.q?.toLowerCase().trim();
    const categoryId = params?.category;
    const supplierId = params?.supplier;
    const status = params?.status;
    const storeId = params?.storeId;

    let list = this.data.products;

    if (search) {
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(search) ||
        (p.code || '').toLowerCase().includes(search) ||
        (p.sku || '').toLowerCase().includes(search) ||
        (p.ean || '').toLowerCase().includes(search) ||
        (p.brand || '').toLowerCase().includes(search) ||
        (p.additionalBarcodes || []).some(b => b.toLowerCase().includes(search))
      );
    }
    if (categoryId) {
      list = list.filter(p => p.categoryId === categoryId);
    }
    if (supplierId) {
      list = list.filter(p => p.supplierId === supplierId);
    }
    if (status) {
      list = list.filter(p => p.status === status);
    }

    return list.map(prod => {
      const balances = this.data.stockBalances.filter(
        b => b.productId === prod.id && (!storeId || b.storeId === storeId)
      );

      const totalPhysicalStock = Math.max(0, balances.reduce((sum, b) => sum + (b.physicalQty || 0), 0));
      const totalAvailableStock = Math.max(0, balances.reduce((sum, b) => sum + (b.availableQty || 0), 0));
      const totalReservedStock = Math.max(0, balances.reduce((sum, b) => sum + (b.reservedQty || 0), 0));
      const totalBlockedStock = Math.max(0, balances.reduce((sum, b) => sum + (b.blockedQty || 0), 0));

      const cost = Math.max(0, Number(prod.costPrice) || 0);
      const sale = Math.max(0, Number(prod.salePrice) || 0);
      const stockValue = Number((totalPhysicalStock * cost).toFixed(2));
      const potentialSaleValue = Number((totalPhysicalStock * sale).toFixed(2));
      const potentialGrossProfit = Number((potentialSaleValue - stockValue).toFixed(2));

      return {
        ...prod,
        totalPhysicalStock,
        totalAvailableStock,
        totalReservedStock,
        totalBlockedStock,
        stockValue,
        potentialSaleValue,
        potentialGrossProfit,
      };
    });
  }

  public createProduct(data: any): Product {
    const nextCode = String(1000 + this.data.products.length + 1);
    const costPrice = Math.max(0, Number(data.costPrice) || 0);
    const salePrice = Math.max(0, Number(data.salePrice) || 0);
    const profitMargin = salePrice > 0 ? Number((((salePrice - costPrice) / salePrice) * 100).toFixed(2)) : 0;
    const markup = costPrice > 0 ? Number((((salePrice - costPrice) / costPrice) * 100).toFixed(2)) : 0;

    const newProd: Product = {
      id: `prod-${Date.now()}`,
      code: data.code || nextCode,
      sku: data.sku || `SKU-${Date.now().toString().slice(-4)}`,
      ean: data.ean || '',
      additionalBarcodes: data.additionalBarcodes || [],
      name: data.name || 'Novo Produto',
      description: data.description || '',
      categoryId: data.categoryId || this.data.categories[0]?.id || 'cat-01',
      brand: data.brand || '',
      manufacturer: data.manufacturer || '',
      unit: data.unit || 'UN',
      packageType: data.packageType || 'Unidade',
      unitsPerPackage: Number(data.unitsPerPackage) || 1,
      weight: Number(data.weight) || 1,
      costPrice,
      salePrice,
      profitMargin,
      markup,
      minStock: Number(data.minStock) || 10,
      maxStock: Number(data.maxStock) || 100,
      safetyStock: Number(data.safetyStock) || 5,
      reorderPoint: Number(data.reorderPoint) || 20,
      supplierId: data.supplierId || this.data.suppliers[0]?.id || 'sup-01',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promotionalPrice: data.promotionalPrice,
      isPromoActive: !!data.isPromoActive,
    };

    this.data.products.push(newProd);

    // Initial stock balance in main warehouse
    const initialQty = Number(data.initialStock) || 0;
    this.data.stockBalances.push({
      id: `sb-${Date.now()}`,
      productId: newProd.id,
      storeId: 'store-01',
      warehouseId: 'wh-01-gen',
      physicalQty: initialQty,
      reservedQty: 0,
      availableQty: initialQty,
      blockedQty: 0,
      avgCost: costPrice,
      updatedAt: new Date().toISOString(),
    });

    if (initialQty > 0) {
      this.data.stockMovements.unshift({
        id: `mov-${Date.now()}`,
        productId: newProd.id,
        storeId: 'store-01',
        warehouseId: 'wh-01-gen',
        type: 'purchase_in',
        quantity: initialQty,
        previousBalance: 0,
        newBalance: initialQty,
        unitCost: costPrice,
        totalCost: Number((initialQty * costPrice).toFixed(2)),
        reason: 'Saldo inicial de implantação de cadastro',
        documentNumber: 'IMPLANTACAO-001',
        userId: this.getActiveUser().id,
        userName: this.getActiveUser().name,
        createdAt: new Date().toISOString(),
      });
    }

    this.logAudit({
      action: 'PRODUCT_CREATED',
      module: 'PRODUTOS',
      entityId: newProd.id,
      entityType: 'Product',
      details: `Produto cadastrado: ${newProd.name} (EAN: ${newProd.ean || 'S/N'}) - Venda: R$ ${salePrice}`,
    });

    this.save();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Produto não encontrado.');

    const current = this.data.products[idx];
    const costPrice = updates.costPrice !== undefined ? Number(updates.costPrice) : current.costPrice;
    const salePrice = updates.salePrice !== undefined ? Number(updates.salePrice) : current.salePrice;
    const profitMargin = salePrice > 0 ? Number((((salePrice - costPrice) / salePrice) * 100).toFixed(2)) : 0;
    const markup = costPrice > 0 ? Number((((salePrice - costPrice) / costPrice) * 100).toFixed(2)) : 0;

    this.data.products[idx] = {
      ...current,
      ...updates,
      costPrice,
      salePrice,
      profitMargin,
      markup,
      updatedAt: new Date().toISOString(),
    };

    this.logAudit({
      action: 'PRODUCT_UPDATED',
      module: 'PRODUTOS',
      entityId: id,
      entityType: 'Product',
      details: `Produto atualizado: ${this.data.products[idx].name} - Novo Preço: R$ ${salePrice}`,
    });

    this.save();
    return this.data.products[idx];
  }

  // --- STOCK BALANCES ---
  public getStockBalances(storeId?: string, warehouseId?: string) {
    let list = this.data.stockBalances;
    if (storeId) list = list.filter(b => b.storeId === storeId);
    if (warehouseId) list = list.filter(b => b.warehouseId === warehouseId);

    return list.map(b => {
      const product = this.data.products.find(p => p.id === b.productId);
      const store = this.data.stores.find(s => s.id === b.storeId);
      const warehouse = this.data.warehouses.find(w => w.id === b.warehouseId);
      const cost = product?.costPrice || b.avgCost || 0;
      const sale = product?.salePrice || 0;

      return {
        ...b,
        product,
        storeName: store?.name || 'Matriz',
        warehouseName: warehouse?.name || 'Depósito Geral',
        totalCostValue: Number((b.physicalQty * cost).toFixed(2)),
        totalSaleValue: Number((b.physicalQty * sale).toFixed(2)),
      };
    });
  }

  // --- STOCK MOVEMENTS ---
  public getStockMovements(params?: { productId?: string; storeId?: string }) {
    let list = this.data.stockMovements;
    if (params?.productId) list = list.filter(m => m.productId === params.productId);
    if (params?.storeId) list = list.filter(m => m.storeId === params.storeId);

    return list.map(m => {
      const prod = this.data.products.find(p => p.id === m.productId);
      const store = this.data.stores.find(s => s.id === m.storeId);
      const wh = this.data.warehouses.find(w => w.id === m.warehouseId);

      return {
        ...m,
        productName: prod?.name || 'Produto não identificado',
        productEan: prod?.ean || '',
        productUnit: prod?.unit || 'UN',
        storeName: store?.name || 'Matriz',
        warehouseName: wh?.name || 'Depósito Geral',
      };
    });
  }

  public createStockMovement(data: {
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
  }): StockMovement & {
    productName: string;
    productEan?: string;
    productUnit: string;
    storeName: string;
    warehouseName: string;
  } {
    const qty = Math.abs(Number(data.quantity));
    if (qty <= 0) throw new Error('A quantidade deve ser maior que zero.');

    let balance = this.data.stockBalances.find(
      b => b.productId === data.productId && b.storeId === data.storeId && b.warehouseId === data.warehouseId
    );

    if (!balance) {
      balance = {
        id: `sb-${Date.now()}`,
        productId: data.productId,
        storeId: data.storeId,
        warehouseId: data.warehouseId,
        physicalQty: 0,
        reservedQty: 0,
        availableQty: 0,
        blockedQty: 0,
        avgCost: 0,
        updatedAt: new Date().toISOString(),
      };
      this.data.stockBalances.push(balance);
    }

    const isExit = ['sale_out', 'loss_out', 'transfer_out', 'consumption_out', 'supplier_return_out', 'adjustment_out', 'expiration_out'].includes(data.type);
    const delta = isExit ? -qty : qty;
    const previousBalance = balance.physicalQty;
    const newBalance = previousBalance + delta;

    if (newBalance < 0 && !data.allowNegative) {
      throw new Error(`Saldo insuficiente (${previousBalance}). Ajuste causaria saldo negativo.`);
    }

    balance.physicalQty = newBalance;
    balance.availableQty = Math.max(0, balance.physicalQty - balance.reservedQty - balance.blockedQty);
    balance.updatedAt = new Date().toISOString();

    const currentUser = this.getActiveUser();
    const product = this.data.products.find(p => p.id === data.productId);
    const cost = product?.costPrice || balance.avgCost || 0;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: data.productId,
      storeId: data.storeId,
      warehouseId: data.warehouseId,
      lotId: data.lotId,
      type: data.type,
      quantity: qty,
      previousBalance,
      newBalance,
      unitCost: cost,
      totalCost: Number((qty * cost).toFixed(2)),
      reason: data.reason || 'Movimentação manual de estoque',
      documentNumber: data.documentNumber || `MOV-${Date.now().toString().slice(-6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      authorizedBy: data.authorizedBy || (data.allowNegative ? currentUser.name : undefined),
      createdAt: new Date().toISOString(),
    };

    this.data.stockMovements.unshift(movement);

    const store = this.data.stores.find(s => s.id === data.storeId);
    const warehouse = this.data.warehouses.find(w => w.id === data.warehouseId);

    this.logAudit({
      action: 'STOCK_MOVEMENT',
      module: 'ESTOQUE',
      entityId: movement.id,
      entityType: 'StockMovement',
      details: `${isExit ? 'Saída' : 'Entrada'} de ${qty} ${product?.unit || 'UN'} de ${product?.name} (${data.reason})`,
    });

    this.save();

    return {
      ...movement,
      productName: product?.name || 'Produto',
      productEan: product?.ean,
      productUnit: product?.unit || 'UN',
      storeName: store?.name || 'Matriz',
      warehouseName: warehouse?.name || 'Depósito',
    };
  }

  // --- STOCK LOTS & FEFO ---
  public getStockLots(storeId?: string) {
    let list = this.data.stockLots;
    if (storeId) list = list.filter(l => l.storeId === storeId);

    const now = new Date();

    return list.map(lot => {
      const prod = this.data.products.find(p => p.id === lot.productId);
      const store = this.data.stores.find(s => s.id === lot.storeId);
      const wh = this.data.warehouses.find(w => w.id === lot.warehouseId);

      const expDate = new Date(lot.expirationDate);
      const diffTime = expDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const qty = (lot as any).currentQuantity !== undefined ? (lot as any).currentQuantity : ((lot as any).currentQty || 0);

      return {
        ...lot,
        daysUntilExpiry,
        productName: prod?.name || 'Produto',
        productEan: prod?.ean,
        productUnit: prod?.unit || 'UN',
        storeName: store?.name || 'Matriz',
        warehouseName: wh?.name || 'Câmara / Depósito',
        totalCostValue: Number((qty * (prod?.costPrice || (lot as any).unitCost || (lot as any).costPrice || 0)).toFixed(2)),
      };
    }).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }

  public createStockLot(data: any): StockLot {
    const newLot: StockLot = {
      id: `lot-${Date.now()}`,
      productId: data.productId,
      storeId: data.storeId || 'store-01',
      warehouseId: data.warehouseId || 'wh-01-gen',
      lotNumber: data.lotNumber || `LOTE-${Date.now().toString().slice(-6)}`,
      manufacturingDate: data.manufacturingDate || new Date().toISOString().split('T')[0],
      expirationDate: data.expirationDate,
      initialQuantity: Number(data.initialQuantity) || Number(data.initialQty) || 10,
      currentQuantity: Number(data.currentQuantity) || Number(data.currentQty) || 10,
      unitCost: Number(data.unitCost) || Number(data.costPrice) || 0,
      supplierId: data.supplierId || 'sup-01',
      status: 'active',
    };
    this.data.stockLots.push(newLot);
    this.save();
    return newLot;
  }

  // --- PURCHASES ---
  public getPurchases(): PurchaseOrder[] {
    return this.data.purchaseOrders;
  }

  public createPurchase(data: any): PurchaseOrder {
    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: data.orderNumber || data.code || `PED-${1000 + this.data.purchaseOrders.length + 1}`,
      storeId: data.storeId || 'store-01',
      supplierId: data.supplierId || this.data.suppliers[0]?.id || 'sup-01',
      status: 'pending_approval',
      totalValue: Number(data.totalValue) || Number(data.totalEstimatedCost) || 0,
      paymentTerms: data.paymentTerms || '30 dias',
      items: data.items || [],
      expectedDeliveryDate: data.expectedDeliveryDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.purchaseOrders.unshift(newOrder);
    this.save();
    return newOrder;
  }

  public updatePurchaseStatus(id: string, status: PurchaseOrder['status']): PurchaseOrder {
    const order = this.data.purchaseOrders.find(p => p.id === id);
    if (!order) throw new Error('Pedido não encontrado.');
    order.status = status;
    order.updatedAt = new Date().toISOString();
    this.save();
    return order;
  }

  public receivePurchase(id: string, data: any): { success: boolean; order: PurchaseOrder } {
    const order = this.data.purchaseOrders.find(p => p.id === id);
    if (!order) throw new Error('Pedido não encontrado.');

    order.status = 'received';
    order.updatedAt = new Date().toISOString();

    if (Array.isArray(data.receivedItems)) {
      data.receivedItems.forEach((item: any) => {
        this.createStockMovement({
          productId: item.productId,
          storeId: order.storeId,
          warehouseId: data.targetWarehouseId || 'wh-01-gen',
          type: 'purchase_in',
          quantity: item.receivedQty,
          reason: `Recebimento de Pedido ${order.orderNumber} - NF ${data.documentNumber || 'N/A'}`,
          documentNumber: data.documentNumber,
        });
      });
    }

    this.save();
    return { success: true, order };
  }

  // --- LOSSES ---
  public getLosses(): (StockLoss & {
    productName: string;
    productUnit: string;
    categoryName: string;
    storeName: string;
  })[] {
    return this.data.stockLosses.map(loss => {
      const prod = this.data.products.find(p => p.id === loss.productId);
      const cat = this.data.categories.find(c => c.id === prod?.categoryId);
      const store = this.data.stores.find(s => s.id === loss.storeId);

      return {
        ...loss,
        productName: prod?.name || 'Produto',
        productUnit: prod?.unit || 'UN',
        categoryName: cat?.name || 'Geral',
        storeName: store?.name || 'Matriz',
      };
    });
  }

  public createLoss(data: any): StockLoss {
    const prod = this.data.products.find(p => p.id === data.productId);
    const qty = Math.abs(Number(data.quantity));
    const cost = prod?.costPrice || 0;
    const totalValue = Number((qty * cost).toFixed(2));

    const newLoss: StockLoss = {
      id: `loss-${Date.now()}`,
      storeId: data.storeId || 'store-01',
      warehouseId: data.warehouseId || 'wh-01-gen',
      productId: data.productId,
      lotId: data.lotId,
      quantity: qty,
      unitCost: cost,
      totalValue,
      reason: data.reason || 'damaged',
      reasonDescription: data.reasonDescription || data.justification || 'Perda registrada no setor',
      userId: this.getActiveUser().id,
      userName: this.getActiveUser().name,
      date: new Date().toISOString(),
    };

    this.data.stockLosses.unshift(newLoss);

    this.createStockMovement({
      productId: data.productId,
      storeId: data.storeId || 'store-01',
      warehouseId: data.warehouseId || 'wh-01-gen',
      type: 'loss_out',
      quantity: qty,
      reason: `Avaria / Perda: ${newLoss.reasonDescription}`,
    });

    this.save();
    return newLoss;
  }

  // --- INVENTORY ---
  public getInventorySessions(): InventorySession[] {
    return this.data.inventorySessions;
  }

  public createInventorySession(data: any): InventorySession {
    const newSession: InventorySession = {
      id: `inv-${Date.now()}`,
      sessionNumber: `INV-${Date.now().toString().slice(-6)}`,
      storeId: data.storeId || 'store-01',
      targetWarehouseId: data.targetWarehouseId,
      targetCategoryId: data.targetCategoryId,
      type: data.type || 'general',
      status: 'open',
      totalItems: this.data.products.length,
      divergentItemsCount: 0,
      totalFinancialImpact: 0,
      openedBy: this.getActiveUser().name,
      items: this.data.products.map(p => {
        const balances = this.data.stockBalances.filter(b => b.productId === p.id);
        const physical = balances.reduce((s, b) => s + b.physicalQty, 0);
        return {
          productId: p.id,
          warehouseId: data.targetWarehouseId || 'wh-01-gen',
          theoreticalQty: physical,
          finalCountQty: physical,
          differenceQty: 0,
          unitCost: p.costPrice,
          financialDifference: 0,
          countedBy: this.getActiveUser().name,
          status: 'pending' as const,
        };
      }),
      createdAt: new Date().toISOString(),
    };

    this.data.inventorySessions.unshift(newSession);
    this.save();
    return newSession;
  }

  public updateInventoryCounts(sessionId: string, items: { productId: string; finalCountQty: number }[]): InventorySession {
    const session = this.data.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão de inventário não encontrada.');

    items.forEach(cnt => {
      const item = session.items.find(i => i.productId === cnt.productId);
      if (item) {
        const prod = this.data.products.find(p => p.id === cnt.productId);
        const cost = prod?.costPrice || item.unitCost || 0;
        item.finalCountQty = Number(cnt.finalCountQty);
        item.differenceQty = item.finalCountQty - item.theoreticalQty;
        item.financialDifference = Number((item.differenceQty * cost).toFixed(2));
        item.status = item.differenceQty === 0 ? 'counted' : 'divergent';
      }
    });

    session.divergentItemsCount = session.items.filter(i => i.differenceQty !== 0).length;
    session.totalFinancialImpact = Number(session.items.reduce((s, i) => s + i.financialDifference, 0).toFixed(2));

    this.save();
    return session;
  }

  public approveInventorySession(sessionId: string): InventorySession {
    const session = this.data.inventorySessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão de inventário não encontrada.');

    session.status = 'approved';
    session.completedAt = new Date().toISOString();
    session.approvedBy = this.getActiveUser().name;

    session.items.forEach(item => {
      if (item.differenceQty !== 0) {
        const isAddition = item.differenceQty > 0;
        this.createStockMovement({
          productId: item.productId,
          storeId: session.storeId,
          warehouseId: session.targetWarehouseId || item.warehouseId || 'wh-01-gen',
          type: isAddition ? 'adjustment_in' : 'adjustment_out',
          quantity: Math.abs(item.differenceQty),
          reason: `Ajuste aprovado em Inventário ${session.sessionNumber}`,
          allowNegative: true,
        });
      }
    });

    this.save();
    return session;
  }

  // --- TRANSFERS ---
  public getTransfers(): StockTransfer[] {
    return this.data.stockTransfers;
  }

  public createTransfer(data: any): StockTransfer {
    const newTransfer: StockTransfer = {
      id: `tr-${Date.now()}`,
      transferNumber: `TRF-${Date.now().toString().slice(-6)}`,
      sourceStoreId: data.originStoreId || data.sourceStoreId || 'store-01',
      sourceWarehouseId: data.originWarehouseId || data.sourceWarehouseId || 'wh-01-gen',
      destinationStoreId: data.destinationStoreId || 'store-02',
      destinationWarehouseId: data.destinationWarehouseId || 'wh-02-gen',
      status: 'in_transit',
      items: data.items || [],
      requestedBy: this.getActiveUser().name,
      dispatchedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.data.stockTransfers.unshift(newTransfer);
    this.save();
    return newTransfer;
  }

  public receiveTransfer(id: string): StockTransfer {
    const tr = this.data.stockTransfers.find(t => t.id === id);
    if (!tr) throw new Error('Transferência não encontrada.');
    tr.status = 'received';
    tr.receivedAt = new Date().toISOString();
    this.save();
    return tr;
  }

  // --- REPLENISHMENT & ABC ANALYTICS ---
  public getReplenishment(storeId?: string): ReplenishmentSuggestion[] {
    const suggestions: ReplenishmentSuggestion[] = [];

    for (const product of this.data.products) {
      if (product.status !== 'active') continue;

      const balances = this.data.stockBalances.filter(
        b => b.productId === product.id && (!storeId || b.storeId === storeId)
      );
      const currentStock = balances.reduce((sum, b) => sum + (b.physicalQty || 0), 0);
      const supplier = this.data.suppliers.find(s => s.id === product.supplierId);
      const leadTime = supplier?.leadTimeDays || 4;
      const avgDaily = Math.max(1, Math.round(product.minStock / 15));
      const reorderPoint = product.reorderPoint || (leadTime * avgDaily + product.safetyStock);

      if (currentStock <= reorderPoint) {
        const targetStock = product.maxStock > 0 ? product.maxStock : reorderPoint * 2.5;
        const suggestedQty = Math.max(product.minStock, Math.round(targetStock - currentStock));
        const urgency: 'critical' | 'medium' | 'normal' = currentStock <= product.safetyStock ? 'critical' : currentStock <= product.minStock ? 'medium' : 'normal';

        suggestions.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock,
          minStock: product.minStock,
          safetyStock: product.safetyStock,
          reorderPoint,
          suggestedQty,
          supplierId: product.supplierId,
          supplierName: supplier?.tradeName || 'Distribuidor',
          leadTimeDays: leadTime,
          avgDailySales: avgDaily,
          costPrice: product.costPrice,
          estimatedCost: Number((suggestedQty * product.costPrice).toFixed(2)),
          urgency,
          reason: currentStock <= product.safetyStock ? 'Abaixo do estoque de segurança' : 'Ponto de reposição atingido',
        });
      }
    }

    return suggestions.sort((a, b) => {
      const order = { critical: 0, medium: 1, normal: 2 };
      return order[a.urgency] - order[b.urgency];
    });
  }

  public getAbc(storeId?: string): { items: AbcItem[]; summary: { aCount: number; bCount: number; cCount: number; totalValuation: number } } {
    const itemsWithValues = this.data.products.map(p => {
      const balances = this.data.stockBalances.filter(
        b => b.productId === p.id && (!storeId || b.storeId === storeId)
      );
      const stockQty = balances.reduce((sum, b) => sum + (b.physicalQty || 0), 0);
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

    return {
      items: classifiedItems,
      summary: {
        aCount,
        bCount,
        cCount,
        totalValuation: Number(totalSalesSum.toFixed(2)),
      },
    };
  }

  // --- AUDIT & NOTIFICATIONS ---
  public getAudit(limit: number = 100): AuditLog[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public getNotifications(): SystemNotification[] {
    return this.data.notifications;
  }

  public markNotificationRead(id: string): { success: boolean } {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    this.save();
    return { success: true };
  }

  // --- LABELS MODULE ---
  public getLabelDashboard(storeId?: string): LabelDashboardStats {
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

  public getLabelTemplates(): LabelTemplate[] {
    return this.data.labelTemplates;
  }

  public createLabelTemplate(data: Partial<LabelTemplate>): LabelTemplate {
    const newTpl: LabelTemplate = {
      id: `tpl-${Date.now()}`,
      name: data.name || 'Novo Modelo',
      description: data.description || '',
      modelCode: data.modelCode || 'B_GONDOLA',
      widthMm: data.widthMm || 60,
      heightMm: data.heightMm || 40,
      orientation: data.orientation || 'landscape',
      columns: data.columns || 1,
      rows: data.rows || 1,
      gapMm: data.gapMm || 2,
      margins: data.margins || { top: 2, right: 2, bottom: 2, left: 2 },
      barcodeType: data.barcodeType || 'EAN13',
      elements: data.elements || (this.data.labelTemplates[0]?.elements as any),
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.labelTemplates.push(newTpl);
    this.save();
    return newTpl;
  }

  public updateLabelTemplate(id: string, updates: Partial<LabelTemplate>): LabelTemplate {
    const idx = this.data.labelTemplates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Modelo não encontrado.');
    this.data.labelTemplates[idx] = { ...this.data.labelTemplates[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.data.labelTemplates[idx];
  }

  public deleteLabelTemplate(id: string): { success: boolean; deletedId: string } {
    this.data.labelTemplates = this.data.labelTemplates.filter(t => t.id !== id);
    this.save();
    return { success: true, deletedId: id };
  }

  public getLabelPrinters(): LabelPrinter[] {
    return this.data.labelPrinters;
  }

  public createLabelPrinter(data: Partial<LabelPrinter>): LabelPrinter {
    const newPrinter: LabelPrinter = {
      id: `prn-${Date.now()}`,
      name: data.name || 'Nova Impressora',
      model: data.model || 'Zebra ZD220',
      protocol: data.protocol || 'ZPL',
      connectionType: data.connectionType || 'network',
      ipAddress: data.ipAddress || '192.168.1.100',
      port: data.port || 9100,
      densityDpi: data.densityDpi || 203,
      speedIps: data.speedIps || 4,
      status: 'online',
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.data.labelPrinters.push(newPrinter);
    this.save();
    return newPrinter;
  }

  public updateLabelPrinter(id: string, updates: Partial<LabelPrinter>): LabelPrinter {
    const idx = this.data.labelPrinters.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Impressora não encontrada.');
    this.data.labelPrinters[idx] = { ...this.data.labelPrinters[idx], ...updates };
    this.save();
    return this.data.labelPrinters[idx];
  }

  public deleteLabelPrinter(id: string): { success: boolean; deletedId: string } {
    this.data.labelPrinters = this.data.labelPrinters.filter(p => p.id !== id);
    this.save();
    return { success: true, deletedId: id };
  }

  public testLabelPrinter(id: string): { success: boolean; status: string; latencyMs: number; message: string } {
    const printer = this.data.labelPrinters.find(p => p.id === id);
    if (!printer) throw new Error('Impressora não encontrada.');
    return {
      success: true,
      status: 'online',
      latencyMs: Math.floor(Math.random() * 15) + 8,
      message: `Comunicação estabelecida com sucesso com ${printer.name} (${printer.protocol} @ ${printer.ipAddress || 'USB'}).`,
    };
  }

  public getLabelPriceChanges(params?: { status?: string; changeType?: string }): LabelPriceChange[] {
    let list = this.data.labelPriceChanges;
    if (params?.status) list = list.filter(pc => pc.status === params.status);
    if (params?.changeType) list = list.filter(pc => pc.changeType === params.changeType);
    return list;
  }

  public markPriceChangesPrinted(ids: string[], printJobId?: string): { success: boolean; count: number } {
    let count = 0;
    this.data.labelPriceChanges.forEach(pc => {
      if (ids.includes(pc.id)) {
        pc.status = 'printed';
        pc.printedAt = new Date().toISOString();
        pc.printJobId = printJobId;
        count++;
      }
    });
    this.save();
    return { success: true, count };
  }

  public getLabelPromotions(): Product[] {
    return this.data.products.filter(p => p.isPromoActive && p.promotionalPrice && p.promotionalPrice < p.salePrice);
  }

  public getLabelJobs(): LabelPrintJob[] {
    return this.data.labelPrintJobs;
  }

  public createLabelJob(data: {
    storeId: string;
    printerId: string;
    templateId: string;
    type?: string;
    items: any[];
    simulateFailure?: boolean;
  }): LabelPrintJob {
    const totalLabels = (data.items || []).reduce((sum, item) => sum + (Number(item.copies) || Number(item.quantity) || 1), 0);
    const store = this.data.stores.find(s => s.id === data.storeId);
    const printer = this.data.labelPrinters.find(p => p.id === data.printerId);
    const template = this.data.labelTemplates.find(t => t.id === data.templateId);
    const user = this.getActiveUser();

    const formattedItems: LabelPrintJobItem[] = (data.items || []).map(item => ({
      productId: item.productId || 'prod-01',
      productName: item.productName || 'Produto',
      sku: item.sku || '',
      ean: item.ean || '',
      salePrice: Number(item.salePrice) || 0,
      promoPrice: item.promoPrice ? Number(item.promoPrice) : undefined,
      unit: item.unit || 'UN',
      brand: item.brand || '',
      copies: Number(item.copies) || Number(item.quantity) || 1,
      printed: !data.simulateFailure,
      printedAt: data.simulateFailure ? undefined : new Date().toISOString(),
    }));

    const newJob: LabelPrintJob = {
      id: `job-${Date.now()}`,
      jobCode: `JOB-${Date.now().toString().slice(-6)}`,
      storeId: data.storeId || 'store-01',
      storeName: store?.name || 'Matriz',
      printerId: data.printerId,
      printerName: printer?.name || 'Zebra ZD220',
      templateId: data.templateId,
      templateName: template?.name || 'Modelo Gôndola',
      type: (data.type as any) || 'batch',
      status: data.simulateFailure ? 'failed' : 'confirmed',
      totalProducts: formattedItems.length,
      totalLabels,
      confirmedLabels: data.simulateFailure ? 0 : totalLabels,
      failedLabels: data.simulateFailure ? totalLabels : 0,
      items: formattedItems,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      createdAt: new Date().toISOString(),
      confirmedAt: data.simulateFailure ? undefined : new Date().toISOString(),
    };

    this.data.labelPrintJobs.unshift(newJob);
    this.save();
    return newJob;
  }

  public retryFailedJobItems(jobId: string): LabelPrintJob {
    const job = this.data.labelPrintJobs.find(j => j.id === jobId);
    if (!job) throw new Error('Trabalho de impressão não encontrado.');
    job.status = 'confirmed';
    job.confirmedLabels = job.totalLabels;
    job.failedLabels = 0;
    job.items.forEach(i => { i.printed = true; });
    this.save();
    return job;
  }

  // --- INTELLIGENCE (Client AI Engine) ---
  public queryIntelligence(prompt: string, storeId?: string): { text: string; fallback: boolean } {
    const prods = this.getProducts({ storeId });
    const lowStock = prods.filter(p => (p.totalPhysicalStock || 0) <= p.minStock);
    const totalValuation = prods.reduce((sum, p) => sum + (p.stockValue || 0), 0);
    const totalSale = prods.reduce((sum, p) => sum + (p.potentialSaleValue || 0), 0);

    const text = `**ASSX Intelligence — Análise Operacional do Supermercado:**\n\n` +
      `• **Patrimônio Estocado (Custo):** R$ ${totalValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• **Faturamento Projetado (Venda):** R$ ${totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `• **Produtos Monitorados:** ${prods.length} itens cadastrados com rastreabilidade.\n` +
      `• **Rupturas / Atenção Imediata:** ${lowStock.length} produto(s) abaixo do estoque mínimo.\n\n` +
      (lowStock.length > 0 ? `Itens críticos: ${lowStock.map(p => `${p.name} (Saldo: ${p.totalPhysicalStock} ${p.unit})`).join(', ')}.\n\n` : '') +
      `Recomenda-se conferência no módulo de Compras & Recebimento e impressão de etiquetas atualizadas na gôndola.`;

    return { text, fallback: false };
  }

  // --- BACKUP & RESTORE ---
  public getBackupData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public restoreBackup(data: any): { success: boolean; message: string } {
    if (!data || !Array.isArray(data.products) || !Array.isArray(data.suppliers)) {
      throw new Error('Arquivo de backup inválido ou estrutura corrompida.');
    }
    this.data = data;
    this.save();
    return { success: true, message: 'Dados restaurados com sucesso!' };
  }
}

export const clientDb = new ClientDatabase();
