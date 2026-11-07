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
import { clientDb } from './clientDb.ts';

class ApiService {
  private activeUserId: string = 'usr-super';
  private backendAvailable: boolean | null = null;
  private checkingBackend: Promise<boolean> | null = null;

  public setActiveUser(userId: string) {
    this.activeUserId = userId;
    clientDb.setActiveUser(userId);
  }

  public getActiveUserId(): string {
    return this.activeUserId;
  }

  /**
   * Intelligently verifies whether the Node.js /api backend is reachable.
   * If on a static CDN (e.g. Netlify, Vercel static, GitHub Pages), or if /api
   * returns 404/HTML, switches instantly to the autonomous persistent Client Database.
   */
  public async isBackendAvailable(): Promise<boolean> {
    if (this.backendAvailable !== null) return this.backendAvailable;

    if (typeof window === 'undefined') {
      this.backendAvailable = false;
      return false;
    }

    // Direct check for static host indicators
    if (window.location.hostname.includes('netlify.app')) {
      this.backendAvailable = false;
      return false;
    }

    if (!this.checkingBackend) {
      this.checkingBackend = (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const res = await fetch('/api/health', { signal: controller.signal });
          clearTimeout(timeoutId);
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const body = await res.json();
            this.backendAvailable = body?.status === 'ok';
            return this.backendAvailable;
          }
        } catch (_) {
          // Server offline, static host, or network timeout
        }
        this.backendAvailable = false;
        return false;
      })();
    }

    return this.checkingBackend;
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

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      let errorMsg = `Erro na requisição (${res.status})`;
      try {
        if (contentType.includes('application/json')) {
          const body = await res.json();
          if (body.error) errorMsg = body.error;
        }
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Authentication & Sessions
  public async login(userId: string): Promise<{ user: UserProfile; token: string; message: string }> {
    if (await this.isBackendAvailable()) {
      try {
        const res = await this.request<{ user: UserProfile; token: string; message: string }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ userId }),
        });
        clientDb.setActiveUser(res.user.id);
        return res;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /auth/login, executando via ClientDB:', err);
      }
    }
    const res = clientDb.login(userId);
    this.setActiveUser(res.user.id);
    return res;
  }

  public async logout(): Promise<{ success: boolean; message: string }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /auth/logout, executando via ClientDB:', err);
      }
    }
    return clientDb.logout();
  }

  public async getMe(): Promise<UserProfile> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<UserProfile>('/auth/me');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /auth/me, executando via ClientDB:', err);
      }
    }
    return clientDb.getMe();
  }

  // Users & Operators
  public async getUsers(): Promise<UserProfile[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<UserProfile[]>('/users');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /users, executando via ClientDB:', err);
      }
    }
    return clientDb.getUsers();
  }

  public async createUser(data: Partial<UserProfile>): Promise<UserProfile> {
    if (await this.isBackendAvailable()) {
      try {
        const user = await this.request<UserProfile>('/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        clientDb.createUser(user);
        return user;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /users, executando via ClientDB:', err);
      }
    }
    return clientDb.createUser(data);
  }

  public async updateUser(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
    if (await this.isBackendAvailable()) {
      try {
        const user = await this.request<UserProfile>(`/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        clientDb.updateUser(id, data);
        return user;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /users, executando via ClientDB:', err);
      }
    }
    return clientDb.updateUser(id, data);
  }

  public async updateUserStatus(id: string, status: 'active' | 'inactive'): Promise<UserProfile> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<UserProfile>(`/users/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PATCH /users/status, executando via ClientDB:', err);
      }
    }
    return clientDb.updateUserStatus(id, status);
  }

  public async updateUserPermissions(id: string, permissions: any): Promise<UserProfile> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<UserProfile>(`/users/${id}/permissions`, {
          method: 'PATCH',
          body: JSON.stringify({ permissions }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PATCH /users/permissions, executando via ClientDB:', err);
      }
    }
    return clientDb.updateUserPermissions(id, permissions);
  }

  public async deleteUser(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (await this.isBackendAvailable()) {
      try {
        const res = await this.request<{ success: boolean; deletedId: string }>(`/users/${id}`, { method: 'DELETE' });
        try { clientDb.deleteUser(id); } catch (_) {}
        return res;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend DELETE /users, executando via ClientDB:', err);
      }
    }
    return clientDb.deleteUser(id);
  }

  public async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.getAudit(limit);
  }

  // Roles & Permissions
  public async getRoles(): Promise<RolePermission[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<RolePermission[]>('/roles');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /roles, executando via ClientDB:', err);
      }
    }
    return clientDb.getRoles();
  }

  public async createRole(data: Partial<RolePermission>): Promise<RolePermission> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<RolePermission>('/roles', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /roles, executando via ClientDB:', err);
      }
    }
    return clientDb.createRole(data);
  }

  public async updateRole(id: string, data: Partial<RolePermission>): Promise<RolePermission> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<RolePermission>(`/roles/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /roles, executando via ClientDB:', err);
      }
    }
    return clientDb.updateRole(id, data);
  }

  public async deleteRole(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<{ success: boolean; deletedId: string }>(`/roles/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend DELETE /roles, executando via ClientDB:', err);
      }
    }
    return clientDb.deleteRole(id);
  }

  // Stores
  public async getStores(): Promise<{ stores: Store[]; warehouses: Warehouse[] }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<{ stores: Store[]; warehouses: Warehouse[] }>('/stores');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /stores, executando via ClientDB:', err);
      }
    }
    return clientDb.getStores();
  }

  public async createStore(data: Partial<Store>): Promise<Store> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<Store>('/stores', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /stores, executando via ClientDB:', err);
      }
    }
    return clientDb.createStore(data);
  }

  // Categories
  public async getCategories(): Promise<Category[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<Category[]>('/categories');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /categories, executando via ClientDB:', err);
      }
    }
    return clientDb.getCategories();
  }

  // Suppliers
  public async getSuppliers(): Promise<Supplier[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<Supplier[]>('/suppliers');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /suppliers, executando via ClientDB:', err);
      }
    }
    return clientDb.getSuppliers();
  }

  public async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    if (await this.isBackendAvailable()) {
      try {
        const sup = await this.request<Supplier>('/suppliers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        clientDb.createSupplier(sup);
        return sup;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /suppliers, executando via ClientDB:', err);
      }
    }
    return clientDb.createSupplier(data);
  }

  public async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    if (await this.isBackendAvailable()) {
      try {
        const sup = await this.request<Supplier>(`/suppliers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        clientDb.updateSupplier(id, data);
        return sup;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /suppliers, executando via ClientDB:', err);
      }
    }
    return clientDb.updateSupplier(id, data);
  }

  // Products
  public async getProducts(params?: { q?: string; category?: string; supplier?: string; status?: string; storeId?: string }): Promise<(Product & {
    totalPhysicalStock: number;
    totalAvailableStock: number;
    totalReservedStock: number;
    totalBlockedStock: number;
    stockValue: number;
    potentialSaleValue: number;
    potentialGrossProfit: number;
  })[]> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (params?.q) searchParams.set('q', params.q);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.supplier) searchParams.set('supplier', params.supplier);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.storeId) searchParams.set('storeId', params.storeId);
        return await this.request(`/products?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /products, executando via ClientDB:', err);
      }
    }
    return clientDb.getProducts(params);
  }

  public async createProduct(data: any): Promise<Product> {
    if (await this.isBackendAvailable()) {
      try {
        const prod = await this.request<Product>('/products', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        clientDb.createProduct(prod);
        return prod;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /products, executando via ClientDB:', err);
      }
    }
    return clientDb.createProduct(data);
  }

  public async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    if (await this.isBackendAvailable()) {
      try {
        const prod = await this.request<Product>(`/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
        clientDb.updateProduct(id, data);
        return prod;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /products, executando via ClientDB:', err);
      }
    }
    return clientDb.updateProduct(id, data);
  }

  // Stock
  public async getStockBalances(storeId?: string, warehouseId?: string): Promise<(StockBalance & {
    product?: Product;
    storeName: string;
    warehouseName: string;
    totalCostValue: number;
    totalSaleValue: number;
  })[]> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (storeId) searchParams.set('storeId', storeId);
        if (warehouseId) searchParams.set('warehouseId', warehouseId);
        return await this.request(`/stock/balances?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /stock/balances, executando via ClientDB:', err);
      }
    }
    return clientDb.getStockBalances(storeId, warehouseId);
  }

  public async getStockMovements(params?: { productId?: string; storeId?: string }): Promise<(StockMovement & {
    productName: string;
    productEan?: string;
    productUnit: string;
    storeName: string;
    warehouseName: string;
  })[]> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (params?.productId) searchParams.set('productId', params.productId);
        if (params?.storeId) searchParams.set('storeId', params.storeId);
        return await this.request(`/stock/movements?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /stock/movements, executando via ClientDB:', err);
      }
    }
    return clientDb.getStockMovements(params);
  }

  public async createStockMovement(data: {
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
    if (await this.isBackendAvailable()) {
      try {
        const mov = await this.request<StockMovement>('/stock/movements', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        try { clientDb.createStockMovement(data); } catch (_) {}
        return mov;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /stock/movements, executando via ClientDB:', err);
      }
    }
    return clientDb.createStockMovement(data);
  }

  // Lots
  public async getStockLots(storeId?: string): Promise<(StockLot & {
    daysUntilExpiry: number;
    productName: string;
    productEan?: string;
    productUnit: string;
    storeName: string;
    warehouseName: string;
    totalCostValue: number;
  })[]> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (storeId) searchParams.set('storeId', storeId);
        return await this.request(`/stock/lots?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /stock/lots, executando via ClientDB:', err);
      }
    }
    return clientDb.getStockLots(storeId);
  }

  public async createStockLot(data: any): Promise<StockLot> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<StockLot>('/stock/lots', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /stock/lots, executando via ClientDB:', err);
      }
    }
    return clientDb.createStockLot(data);
  }

  // Purchases
  public async getPurchases(): Promise<PurchaseOrder[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<PurchaseOrder[]>('/purchases');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /purchases, executando via ClientDB:', err);
      }
    }
    return clientDb.getPurchases();
  }

  public async createPurchase(data: any): Promise<PurchaseOrder> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<PurchaseOrder>('/purchases', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /purchases, executando via ClientDB:', err);
      }
    }
    return clientDb.createPurchase(data);
  }

  public async updatePurchaseStatus(id: string, status: PurchaseOrder['status']): Promise<PurchaseOrder> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<PurchaseOrder>(`/purchases/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /purchases/status, executando via ClientDB:', err);
      }
    }
    return clientDb.updatePurchaseStatus(id, status);
  }

  public async receivePurchase(id: string, data: {
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
    if (await this.isBackendAvailable()) {
      try {
        return await this.request(`/purchases/${id}/receive`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /purchases/receive, executando via ClientDB:', err);
      }
    }
    return clientDb.receivePurchase(id, data);
  }

  // Losses
  public async getLosses(): Promise<(StockLoss & {
    productName: string;
    productUnit: string;
    categoryName: string;
    storeName: string;
  })[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request('/losses');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /losses, executando via ClientDB:', err);
      }
    }
    return clientDb.getLosses();
  }

  public async createLoss(data: any): Promise<StockLoss> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<StockLoss>('/losses', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /losses, executando via ClientDB:', err);
      }
    }
    return clientDb.createLoss(data);
  }

  // Inventory
  public async getInventorySessions(): Promise<InventorySession[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<InventorySession[]>('/inventory');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /inventory, executando via ClientDB:', err);
      }
    }
    return clientDb.getInventorySessions();
  }

  public async createInventorySession(data: {
    storeId: string;
    type: InventorySession['type'];
    targetCategoryId?: string;
    targetWarehouseId?: string;
  }): Promise<InventorySession> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<InventorySession>('/inventory', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /inventory, executando via ClientDB:', err);
      }
    }
    return clientDb.createInventorySession(data);
  }

  public async updateInventoryCounts(sessionId: string, items: {
    productId: string;
    finalCountQty: number;
    countedBy?: string;
  }[]): Promise<InventorySession> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<InventorySession>(`/inventory/${sessionId}/counts`, {
          method: 'PUT',
          body: JSON.stringify({ items }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /inventory/counts, executando via ClientDB:', err);
      }
    }
    return clientDb.updateInventoryCounts(sessionId, items);
  }

  public async approveInventorySession(sessionId: string): Promise<InventorySession> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<InventorySession>(`/inventory/${sessionId}/approve`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /inventory/approve, executando via ClientDB:', err);
      }
    }
    return clientDb.approveInventorySession(sessionId);
  }

  // Transfers
  public async getTransfers(): Promise<StockTransfer[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<StockTransfer[]>('/transfers');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /transfers, executando via ClientDB:', err);
      }
    }
    return clientDb.getTransfers();
  }

  public async createTransfer(data: any): Promise<StockTransfer> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<StockTransfer>('/transfers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /transfers, executando via ClientDB:', err);
      }
    }
    return clientDb.createTransfer(data);
  }

  public async receiveTransfer(id: string): Promise<StockTransfer> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<StockTransfer>(`/transfers/${id}/receive`, {
          method: 'PUT',
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /transfers/receive, executando via ClientDB:', err);
      }
    }
    return clientDb.receiveTransfer(id);
  }

  // Replenishment & ABC
  public async getReplenishment(storeId?: string): Promise<ReplenishmentSuggestion[]> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (storeId) searchParams.set('storeId', storeId);
        return await this.request(`/analytics/replenishment?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /analytics/replenishment, executando via ClientDB:', err);
      }
    }
    return clientDb.getReplenishment(storeId);
  }

  public async getAbc(storeId?: string): Promise<{ items: AbcItem[]; summary: { aCount: number; bCount: number; cCount: number; totalValuation: number } }> {
    if (await this.isBackendAvailable()) {
      try {
        const searchParams = new URLSearchParams();
        if (storeId) searchParams.set('storeId', storeId);
        return await this.request(`/analytics/abc?${searchParams.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /analytics/abc, executando via ClientDB:', err);
      }
    }
    return clientDb.getAbc(storeId);
  }

  // Audit & Notifications
  public async getAudit(limit?: number): Promise<AuditLog[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<AuditLog[]>(`/audit?limit=${limit || 100}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /audit, executando via ClientDB:', err);
      }
    }
    return clientDb.getAudit(limit || 100);
  }

  public async getNotifications(): Promise<SystemNotification[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<SystemNotification[]>('/notifications');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /notifications, executando via ClientDB:', err);
      }
    }
    return clientDb.getNotifications();
  }

  public async markNotificationRead(id: string): Promise<{ success: boolean }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request(`/notifications/${id}/read`, { method: 'PUT' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /notifications/read, executando via ClientDB:', err);
      }
    }
    return clientDb.markNotificationRead(id);
  }

  // AI Intelligence
  public async queryIntelligence(prompt: string, storeId?: string): Promise<{ text: string; fallback?: boolean }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request('/intelligence/query', {
          method: 'POST',
          body: JSON.stringify({ prompt, storeId }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /intelligence/query, executando via ClientDB:', err);
      }
    }
    return clientDb.queryIntelligence(prompt, storeId);
  }

  // Backup & Restore
  public getBackupExportUrl(): string {
    if (this.backendAvailable === false || (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app'))) {
      const data = clientDb.getBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      return URL.createObjectURL(blob);
    }
    return '/api/backup/export';
  }

  public async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    if (await this.isBackendAvailable()) {
      try {
        const res = await this.request<{ success: boolean; message: string }>('/backup/import', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        clientDb.restoreBackup(data);
        return res;
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /backup/import, executando via ClientDB:', err);
      }
    }
    return clientDb.restoreBackup(data);
  }

  // Labels Module
  public async getLabelDashboard(storeId?: string): Promise<LabelDashboardStats> {
    if (await this.isBackendAvailable()) {
      try {
        const q = storeId ? `?storeId=${storeId}` : '';
        return await this.request<LabelDashboardStats>(`/labels/dashboard${q}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/dashboard, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelDashboard(storeId);
  }

  public async getLabelTemplates(): Promise<LabelTemplate[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelTemplate[]>('/labels/templates');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/templates, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelTemplates();
  }

  public async createLabelTemplate(data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelTemplate>('/labels/templates', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /labels/templates, executando via ClientDB:', err);
      }
    }
    return clientDb.createLabelTemplate(data);
  }

  public async updateLabelTemplate(id: string, data: Partial<LabelTemplate>): Promise<LabelTemplate> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelTemplate>(`/labels/templates/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /labels/templates, executando via ClientDB:', err);
      }
    }
    return clientDb.updateLabelTemplate(id, data);
  }

  public async deleteLabelTemplate(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request(`/labels/templates/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend DELETE /labels/templates, executando via ClientDB:', err);
      }
    }
    return clientDb.deleteLabelTemplate(id);
  }

  public async getLabelPrinters(): Promise<LabelPrinter[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrinter[]>('/labels/printers');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/printers, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelPrinters();
  }

  public async createLabelPrinter(data: Partial<LabelPrinter>): Promise<LabelPrinter> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrinter>('/labels/printers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /labels/printers, executando via ClientDB:', err);
      }
    }
    return clientDb.createLabelPrinter(data);
  }

  public async updateLabelPrinter(id: string, data: Partial<LabelPrinter>): Promise<LabelPrinter> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrinter>(`/labels/printers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend PUT /labels/printers, executando via ClientDB:', err);
      }
    }
    return clientDb.updateLabelPrinter(id, data);
  }

  public async deleteLabelPrinter(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request(`/labels/printers/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend DELETE /labels/printers, executando via ClientDB:', err);
      }
    }
    return clientDb.deleteLabelPrinter(id);
  }

  public async testLabelPrinter(id: string): Promise<{ success: boolean; status: string; latencyMs: number; message: string }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request(`/labels/printers/${id}/test`, { method: 'POST' });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/printers/test, executando via ClientDB:', err);
      }
    }
    return clientDb.testLabelPrinter(id);
  }

  public async getLabelPriceChanges(params?: { status?: string; changeType?: string }): Promise<LabelPriceChange[]> {
    if (await this.isBackendAvailable()) {
      try {
        const q = new URLSearchParams();
        if (params?.status) q.set('status', params.status);
        if (params?.changeType) q.set('changeType', params.changeType);
        return await this.request<LabelPriceChange[]>(`/labels/price-changes?${q.toString()}`);
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/price-changes, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelPriceChanges(params);
  }

  public async markPriceChangesPrinted(ids: string[], printJobId?: string): Promise<{ success: boolean; count: number }> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request('/labels/price-changes/mark-printed', {
          method: 'POST',
          body: JSON.stringify({ ids, printJobId }),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/price-changes/mark-printed, executando via ClientDB:', err);
      }
    }
    return clientDb.markPriceChangesPrinted(ids, printJobId);
  }

  public async getLabelPromotions(): Promise<Product[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<Product[]>('/labels/promotions');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/promotions, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelPromotions();
  }

  public async getLabelJobs(): Promise<LabelPrintJob[]> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrintJob[]>('/labels/jobs');
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend /labels/jobs, executando via ClientDB:', err);
      }
    }
    return clientDb.getLabelJobs();
  }

  public async createLabelJob(data: {
    storeId: string;
    printerId: string;
    templateId: string;
    type?: string;
    items: any[];
    simulateFailure?: boolean;
  }): Promise<LabelPrintJob> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrintJob>('/labels/jobs', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend POST /labels/jobs, executando via ClientDB:', err);
      }
    }
    return clientDb.createLabelJob(data);
  }

  public async retryFailedJobItems(jobId: string): Promise<LabelPrintJob> {
    if (await this.isBackendAvailable()) {
      try {
        return await this.request<LabelPrintJob>(`/labels/jobs/${jobId}/retry-pending`, {
          method: 'POST',
        });
      } catch (err) {
        console.warn('[ASSX Tech] Falha no backend retry-pending, executando via ClientDB:', err);
      }
    }
    return clientDb.retryFailedJobItems(jobId);
  }
}

export const api = new ApiService();
