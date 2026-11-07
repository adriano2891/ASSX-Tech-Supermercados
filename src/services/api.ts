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
} from '../types/index.ts';

class ApiService {
  private activeUserId: string = 'usr-super';

  public setActiveUser(userId: string) {
    this.activeUserId = userId;
  }

  public getActiveUserId(): string {
    return this.activeUserId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.activeUserId,
      ...(options?.headers || {}),
    };

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Erro na requisição (${res.status})`;
      try {
        const body = await res.json();
        if (body.error) errorMsg = body.error;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Authentication & Sessions
  public login(userId: string): Promise<{ user: UserProfile; token: string; message: string }> {
    return this.request<{ user: UserProfile; token: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  public logout(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  public getMe(): Promise<UserProfile> {
    return this.request<UserProfile>('/auth/me');
  }

  // Users & Operators
  public getUsers(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>('/users');
  }

  public createUser(data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateUser(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public updateUserStatus(id: string, status: 'active' | 'inactive'): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  public updateUserPermissions(id: string, permissions: any): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${id}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  }

  public deleteUser(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request<{ success: boolean; deletedId: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  public getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/audit?limit=${limit}`);
  }

  // Roles & Permissions
  public getRoles(): Promise<RolePermission[]> {
    return this.request<RolePermission[]>('/roles');
  }

  public createRole(data: Partial<RolePermission>): Promise<RolePermission> {
    return this.request<RolePermission>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateRole(id: string, data: Partial<RolePermission>): Promise<RolePermission> {
    return this.request<RolePermission>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public deleteRole(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request<{ success: boolean; deletedId: string }>(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // Stores
  public getStores(): Promise<{ stores: Store[]; warehouses: Warehouse[] }> {
    return this.request<{ stores: Store[]; warehouses: Warehouse[] }>('/stores');
  }

  public createStore(data: Partial<Store>): Promise<Store> {
    return this.request<Store>('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Categories
  public getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  // Suppliers
  public getSuppliers(): Promise<Supplier[]> {
    return this.request<Supplier[]>('/suppliers');
  }

  public createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return this.request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Products
  public getProducts(params?: { q?: string; category?: string; supplier?: string; status?: string; storeId?: string }): Promise<(Product & {
    totalPhysicalStock: number;
    totalAvailableStock: number;
    totalReservedStock: number;
    totalBlockedStock: number;
    stockValue: number;
    potentialSaleValue: number;
    potentialGrossProfit: number;
  })[]> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.supplier) searchParams.set('supplier', params.supplier);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    return this.request(`/products?${searchParams.toString()}`);
  }

  public createProduct(data: any): Promise<Product> {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Stock
  public getStockBalances(storeId?: string, warehouseId?: string): Promise<(StockBalance & {
    product?: Product;
    storeName: string;
    warehouseName: string;
    totalCostValue: number;
    totalSaleValue: number;
  })[]> {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    if (warehouseId) searchParams.set('warehouseId', warehouseId);
    return this.request(`/stock/balances?${searchParams.toString()}`);
  }

  public getStockMovements(params?: { productId?: string; storeId?: string }): Promise<(StockMovement & {
    productName: string;
    productEan?: string;
    productUnit: string;
    storeName: string;
    warehouseName: string;
  })[]> {
    const searchParams = new URLSearchParams();
    if (params?.productId) searchParams.set('productId', params.productId);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    return this.request(`/stock/movements?${searchParams.toString()}`);
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
  }): Promise<StockMovement> {
    return this.request<StockMovement>('/stock/movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lots
  public getStockLots(storeId?: string): Promise<(StockLot & {
    daysUntilExpiry: number;
    productName: string;
    productEan?: string;
    productUnit: string;
    storeName: string;
    warehouseName: string;
    totalCostValue: number;
  })[]> {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    return this.request(`/stock/lots?${searchParams.toString()}`);
  }

  public createStockLot(data: any): Promise<StockLot> {
    return this.request<StockLot>('/stock/lots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Purchases
  public getPurchases(): Promise<PurchaseOrder[]> {
    return this.request<PurchaseOrder[]>('/purchases');
  }

  public createPurchase(data: any): Promise<PurchaseOrder> {
    return this.request<PurchaseOrder>('/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updatePurchaseStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> {
    return this.request<PurchaseOrder>(`/purchases/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public receivePurchase(id: string, data: {
    documentNumber: string;
    targetWarehouseId?: string;
    receivedItems: {
      productId: string;
      receivedQty: number;
      rejectedQty?: number;
      lotNumber?: string;
      manufacturingDate?: string;
      expirationDate?: string;
    }[];
  }): Promise<{ success: boolean; order: PurchaseOrder }> {
    return this.request(`/purchases/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Losses
  public getLosses(): Promise<(StockLoss & {
    productName: string;
    productUnit: string;
    categoryName: string;
    storeName: string;
  })[]> {
    return this.request('/losses');
  }

  public createLoss(data: any): Promise<StockLoss> {
    return this.request<StockLoss>('/losses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Inventory
  public getInventorySessions(): Promise<InventorySession[]> {
    return this.request<InventorySession[]>('/inventory');
  }

  public createInventorySession(data: {
    storeId: string;
    type: InventorySession['type'];
    targetCategoryId?: string;
    targetWarehouseId?: string;
  }): Promise<InventorySession> {
    return this.request<InventorySession>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateInventoryCounts(sessionId: string, items: {
    productId: string;
    finalCountQty: number;
    countedBy?: string;
  }[]): Promise<InventorySession> {
    return this.request<InventorySession>(`/inventory/${sessionId}/counts`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  public approveInventorySession(sessionId: string): Promise<InventorySession> {
    return this.request<InventorySession>(`/inventory/${sessionId}/approve`, {
      method: 'POST',
    });
  }

  // Transfers
  public getTransfers(): Promise<StockTransfer[]> {
    return this.request<StockTransfer[]>('/transfers');
  }

  public createTransfer(data: any): Promise<StockTransfer> {
    return this.request<StockTransfer>('/transfers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public receiveTransfer(id: string): Promise<StockTransfer> {
    return this.request<StockTransfer>(`/transfers/${id}/receive`, {
      method: 'PUT',
    });
  }

  // Replenishment & ABC
  public getReplenishment(storeId?: string): Promise<ReplenishmentSuggestion[]> {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    return this.request(`/analytics/replenishment?${searchParams.toString()}`);
  }

  public getAbc(storeId?: string): Promise<{ items: AbcItem[]; summary: { aCount: number; bCount: number; cCount: number; totalValuation: number } }> {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    return this.request(`/analytics/abc?${searchParams.toString()}`);
  }

  // Audit & Notifications
  public getAudit(limit?: number): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/audit?limit=${limit || 100}`);
  }

  public getNotifications(): Promise<SystemNotification[]> {
    return this.request<SystemNotification[]>('/notifications');
  }

  public markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  // AI Intelligence
  public queryIntelligence(prompt: string, storeId?: string): Promise<{ text: string; fallback?: boolean }> {
    return this.request('/intelligence/query', {
      method: 'POST',
      body: JSON.stringify({ prompt, storeId }),
    });
  }

  // Backup & Restore
  public getBackupExportUrl(): string {
    return '/api/backup/export';
  }

  public restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    return this.request('/backup/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // Labels Module (Gestão & Impressão de Etiquetas)
  // ==========================================
  public getLabelDashboard(storeId?: string): Promise<LabelDashboardStats> {
    const q = storeId ? `?storeId=${storeId}` : '';
    return this.request<LabelDashboardStats>(`/labels/dashboard${q}`);
  }

  public getLabelTemplates(): Promise<LabelTemplate[]> {
    return this.request<LabelTemplate[]>('/labels/templates');
  }

  public createLabelTemplate(data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    return this.request<LabelTemplate>('/labels/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateLabelTemplate(id: string, data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    return this.request<LabelTemplate>(`/labels/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public deleteLabelTemplate(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request(`/labels/templates/${id}`, { method: 'DELETE' });
  }

  public getLabelPrinters(): Promise<LabelPrinter[]> {
    return this.request<LabelPrinter[]>('/labels/printers');
  }

  public createLabelPrinter(data: Partial<LabelPrinter>): Promise<LabelPrinter> {
    return this.request<LabelPrinter>('/labels/printers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public updateLabelPrinter(id: string, data: Partial<LabelPrinter>): Promise<LabelPrinter> {
    return this.request<LabelPrinter>(`/labels/printers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public deleteLabelPrinter(id: string): Promise<{ success: boolean; deletedId: string }> {
    return this.request(`/labels/printers/${id}`, { method: 'DELETE' });
  }

  public testLabelPrinter(id: string): Promise<{ success: boolean; status: string; latencyMs: number; message: string }> {
    return this.request(`/labels/printers/${id}/test`, { method: 'POST' });
  }

  public getLabelPriceChanges(params?: { status?: string; changeType?: string }): Promise<LabelPriceChange[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.changeType) q.set('changeType', params.changeType);
    return this.request<LabelPriceChange[]>(`/labels/price-changes?${q.toString()}`);
  }

  public markPriceChangesPrinted(ids: string[], printJobId?: string): Promise<{ success: boolean; count: number }> {
    return this.request('/labels/price-changes/mark-printed', {
      method: 'POST',
      body: JSON.stringify({ ids, printJobId }),
    });
  }

  public getLabelPromotions(): Promise<Product[]> {
    return this.request<Product[]>('/labels/promotions');
  }

  public getLabelJobs(): Promise<LabelPrintJob[]> {
    return this.request<LabelPrintJob[]>('/labels/jobs');
  }

  public createLabelJob(data: {
    storeId: string;
    printerId: string;
    templateId: string;
    type?: string;
    items: any[];
    simulateFailure?: boolean;
  }): Promise<LabelPrintJob> {
    return this.request<LabelPrintJob>('/labels/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public retryFailedJobItems(jobId: string): Promise<LabelPrintJob> {
    return this.request<LabelPrintJob>(`/labels/jobs/${jobId}/retry-pending`, {
      method: 'POST',
    });
  }
}

export const api = new ApiService();

