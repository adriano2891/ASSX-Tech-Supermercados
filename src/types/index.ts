export type UnitOfMeasure = 'UN' | 'KG' | 'CX' | 'PCT' | 'L' | 'G' | 'FD';

export type ProductStatus = 'active' | 'inactive';

export interface Product {
  id: string;
  code: string; // Código interno
  sku: string;
  ean: string; // Código de barras EAN-13 / GTIN
  additionalBarcodes?: string[];
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId?: string;
  brand: string;
  manufacturer?: string;
  unit: UnitOfMeasure;
  packageType?: string;
  unitsPerPackage?: number;
  weight?: number;
  volume?: number;
  costPrice: number; // Preço de custo
  salePrice: number; // Preço de venda
  profitMargin: number; // Margem de lucro %
  markup: number; // Markup %
  minStock: number; // Estoque mínimo
  maxStock: number; // Estoque máximo
  safetyStock: number; // Estoque de segurança
  reorderPoint: number; // Ponto de reposição
  supplierId: string;
  imageUrl?: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  // Label, price change and promotion management
  previousPrice?: number;
  lastPriceChangeDate?: string;
  promotionalPrice?: number;
  promoStartDate?: string;
  promoEndDate?: string;
  isPromoActive?: boolean;
  needsLabelReprint?: boolean;
  lastLabelPrintedAt?: string;
  // Financial & inventory aggregated metrics
  totalPhysicalStock?: number;
  totalAvailableStock?: number;
  totalReservedStock?: number;
  totalBlockedStock?: number;
  stockValue?: number; // Valor Total a Custo (Saldo Físico × Preço de Custo)
  potentialSaleValue?: number; // Valor Total Estimado de Venda (Saldo Físico × Preço de Venda)
  potentialGrossProfit?: number; // Lucro Bruto Potencial ((Saldo Físico × Venda) - (Saldo Físico × Custo))
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: 'active' | 'inactive';
}

export interface Supplier {
  id: string;
  corporateName: string; // Razão social
  tradeName: string; // Nome fantasia
  cnpj: string;
  stateRegistration?: string; // Inscrição estadual
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  paymentTerms: string;
  leadTimeDays: number; // Prazo médio de entrega
  rating: number; // 1 a 5
  notes?: string;
  status: 'active' | 'inactive';
}

export interface Store {
  id: string;
  name: string;
  code: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  timezone: string;
  isMain: boolean;
}

export interface Warehouse {
  id: string;
  storeId: string;
  name: string;
  code: string;
  type: 'general' | 'cold_storage' | 'sales_floor' | 'quarantine';
}

export interface StockBalance {
  id: string;
  productId: string;
  storeId: string;
  warehouseId: string;
  physicalQty: number; // Físico
  reservedQty: number; // Reservado
  availableQty: number; // Disponível = physical - reserved
  blockedQty: number; // Bloqueado (vencidos/avarias)
  avgCost: number; // Custo médio ponderado
  updatedAt: string;
}

export type MovementType = 
  | 'purchase_in' // Compra
  | 'return_in' // Devolução cliente
  | 'adjustment_in' // Ajuste positivo
  | 'transfer_in' // Transferência recebida
  | 'other_in' // Outras entradas
  | 'consumption_out' // Consumo interno
  | 'loss_out' // Perda / Avaria
  | 'expiration_out' // Vencimento
  | 'transfer_out' // Transferência enviada
  | 'supplier_return_out' // Devolução ao fornecedor
  | 'adjustment_out' // Ajuste negativo
  | 'sale_out'; // Saída operacional

export interface StockMovement {
  id: string;
  productId: string;
  storeId: string;
  warehouseId: string;
  lotId?: string;
  type: MovementType;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  unitCost: number;
  totalCost: number;
  reason: string;
  documentNumber?: string;
  authorizedBy?: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface StockLot {
  id: string;
  productId: string;
  storeId: string;
  warehouseId: string;
  lotNumber: string;
  manufacturingDate: string;
  expirationDate: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number;
  supplierId: string;
  documentNumber?: string;
  status: 'active' | 'warning' | 'critical' | 'expired' | 'depleted';
}

export interface StockLoss {
  id: string;
  storeId: string;
  warehouseId: string;
  productId: string;
  lotId?: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  reason: 'expired' | 'damaged' | 'broken' | 'theft' | 'discard' | 'operational_error' | 'other';
  reasonDescription: string;
  userId: string;
  userName: string;
  approvedBy?: string;
  date: string;
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty?: number;
  rejectedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  supplierId: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  items: PurchaseItem[];
  totalValue: number;
  expectedDeliveryDate: string;
  paymentTerms: string;
  notes?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  receiptHistory?: {
    receiptId: string;
    date: string;
    receivedBy: string;
    documentNumber: string;
  }[];
}

export interface InventoryItemCount {
  productId: string;
  warehouseId: string;
  lotNumber?: string;
  theoreticalQty: number;
  firstCountQty?: number;
  recountQty?: number;
  finalCountQty: number;
  differenceQty: number; // final - theoretical
  unitCost: number;
  financialDifference: number; // differenceQty * unitCost
  countedBy: string;
  status: 'pending' | 'counted' | 'divergent' | 'approved';
}

export interface InventorySession {
  id: string;
  sessionNumber: string;
  storeId: string;
  type: 'general' | 'cyclical' | 'category' | 'warehouse';
  targetCategoryId?: string;
  targetWarehouseId?: string;
  status: 'open' | 'counting' | 'reviewing' | 'approved' | 'cancelled';
  openedBy: string;
  approvedBy?: string;
  items: InventoryItemCount[];
  totalItems: number;
  divergentItemsCount: number;
  totalFinancialImpact: number;
  createdAt: string;
  completedAt?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceStoreId: string;
  sourceWarehouseId: string;
  destinationStoreId: string;
  destinationWarehouseId: string;
  status: 'requested' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  items: {
    productId: string;
    quantity: number;
    lotNumber?: string;
    receivedQty?: number;
  }[];
  requestedBy: string;
  approvedBy?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  entityId: string;
  entityType: string;
  storeId?: string;
  userId: string;
  userName: string;
  userRole: string;
  details: string;
  previousState?: any;
  newState?: any;
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  category: 'stock_critical' | 'out_of_stock' | 'overstock' | 'expiring' | 'expired' | 'purchase' | 'inventory_diff';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ModulePermissions {
  dashboard: boolean;
  products: boolean;
  movements: boolean;
  lots: boolean;
  losses: boolean;
  inventory: boolean;
  labels: boolean;
  purchases: boolean;
  transfers: boolean;
  suppliers: boolean;
  analytics: boolean;
  intelligence: boolean;
  reports: boolean;
  settings: boolean;
  operators: boolean;
}

export interface ActionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canCancel: boolean;
  canExport: boolean;
  canPrint: boolean;
  canEditMargin?: boolean;
  canMove?: boolean;
  canAdjustInventory?: boolean;
  canApprovePurchases?: boolean;
  canAudit?: boolean;
}

export interface OperatorPermissions {
  modules: ModulePermissions;
  actions: ActionPermissions;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'manager' | 'buyer' | 'stockist' | 'checker' | 'auditor' | string;
  jobTitle?: string; // Cargo (ex: Supervisor de Estoque, Comprador)
  department?: string; // Setor (ex: Depósito & Câmaras Frias)
  status?: 'active' | 'inactive'; // Status operacional
  lastLoginAt?: string;
  loginCount?: number;
  permissions?: OperatorPermissions;
  storeIds: string[]; // Access scope
  avatarUrl?: string;
  scopeLocation?: string; // Onde poderá atuar
  allowedAreas?: string[]; // Setores autorizados
  canView?: boolean;
  canMove?: boolean;
  canApprovePurchases?: boolean;
  canAdjustInventory?: boolean;
  canAudit?: boolean;
  canEditMargin?: boolean;
}

export interface RolePermission {
  id: string;
  name: string;
  code: string;
  description: string;
  scopeLocation: string; // "Onde poderá atuar" (ex: "Doca de Recebimento", "Câmaras Frias & Depósito")
  allowedAreas: string[];
  canView: boolean;
  canMove: boolean;
  canApprovePurchases: boolean;
  canAdjustInventory: boolean;
  canAudit: boolean;
  canEditMargin?: boolean;
  isSystem?: boolean;
}

export interface ReplenishmentSuggestion {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  safetyStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  avgDailySales: number;
  suggestedQty: number;
  supplierId: string;
  supplierName: string;
  costPrice: number;
  estimatedCost: number;
  urgency: 'critical' | 'medium' | 'normal';
  reason: string;
}

export interface AbcItem {
  productId: string;
  productName: string;
  categoryName: string;
  stockQty: number;
  totalCostValue: number;
  totalSalesValue: number;
  cumulativeSalesPercentage: number;
  classification: 'A' | 'B' | 'C';
}

// ==========================================
// MÓDULO DE IMPRESSÃO DE ETIQUETAS — TYPES
// ==========================================

export type BarcodeFormat = 'EAN13' | 'EAN8' | 'UPCA' | 'CODE128' | 'CODE39' | 'QR';

export type LabelModelPreset =
  | 'A_TRADITIONAL' // Modelo A — Produto Tradicional (50x30mm)
  | 'B_GONDOLA'     // Modelo B — Etiqueta de Gôndola com Preço por kg/L (60x40mm)
  | 'C_PROMOTIONAL' // Modelo C — Promocional com de/por e % desconto (100x50mm)
  | 'D_IDENTIFICATION' // Modelo D — Identificação Estoque / Caixa (100x150mm)
  | 'E_PRODUCE'     // Modelo E — Hortifruti & Pesáveis (60x40mm)
  | 'CUSTOM';       // Personalizado

export interface LabelTemplateElements {
  showStoreName: boolean;
  showProductName: boolean;
  showSku: boolean;
  showBarcode: boolean;
  showBarcodeText: boolean;
  showPrice: boolean;
  showPromoPrice: boolean;
  showOldPrice: boolean;
  showUnit: boolean;
  showPricePerKg: boolean;
  showDiscountBadge: boolean;
  showPromoValidity: boolean;
  showCategory: boolean;
  showBrand: boolean;
  showLotNumber: boolean;
  showExpiryDate: boolean;
  showBorder: boolean;
  customText?: string;
  fontSize: 'small' | 'medium' | 'large';
  boldPrice: boolean;
  alignment: 'left' | 'center' | 'right';
}

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  modelCode: LabelModelPreset;
  widthMm: number;
  heightMm: number;
  orientation: 'landscape' | 'portrait';
  columns: number; // Por folha/rolo
  rows: number;
  gapMm: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  barcodeType: BarcodeFormat;
  elements: LabelTemplateElements;
  isSystemDefault?: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PrinterProtocol = 'ZPL' | 'EPL' | 'ESC_POS' | 'PDF';
export type PrinterConnectionType = 'network' | 'usb' | 'local_agent' | 'browser_pdf';

export interface LabelPrinter {
  id: string;
  name: string;
  model: string;
  connectionType: PrinterConnectionType;
  protocol: PrinterProtocol;
  ipAddress?: string;
  port?: number;
  densityDpi: 203 | 300;
  speedIps: number;
  isDefault: boolean;
  status: 'online' | 'ready' | 'offline' | 'error';
  lastCommunication?: string;
  defaultTemplateId?: string;
  createdAt: string;
}

export interface LabelPriceChange {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  ean: string;
  categoryId: string;
  categoryName: string;
  previousPrice: number;
  newPrice: number;
  difference: number;
  percentageChange: number;
  changeType: 'increase' | 'decrease';
  changedAt: string;
  changedBy: string;
  status: 'pending' | 'printed';
  printedAt?: string;
  printJobId?: string;
}

export interface LabelPrintJobItem {
  productId: string;
  productName: string;
  sku: string;
  ean: string;
  salePrice: number;
  promoPrice?: number;
  unit: string;
  brand: string;
  categoryName?: string;
  lotNumber?: string;
  expirationDate?: string;
  copies: number;
  printed: boolean;
  printedAt?: string;
  errorReason?: string;
}

export interface LabelPrintJob {
  id: string;
  jobCode: string; // Ex: JOB-2026-0042
  storeId: string;
  storeName: string;
  printerId: string;
  printerName: string;
  templateId: string;
  templateName: string;
  type: 'single' | 'batch' | 'sector' | 'price_change' | 'promo' | 'receiving';
  totalProducts: number;
  totalLabels: number;
  confirmedLabels: number;
  failedLabels: number;
  status: 'requested' | 'sent' | 'confirmed' | 'failed';
  failureReason?: string;
  items: LabelPrintJobItem[];
  userId: string;
  userName: string;
  userRole: string;
  createdAt: string;
  confirmedAt?: string;
  zplContent?: string;
}

export interface LabelDashboardStats {
  totalPrintedToday: number;
  totalAvailableProducts: number;
  priceChangedPendingCount: number;
  priceChangedTotalCount: number;
  activePromosCount: number;
  monthPrintsCount: number;
  lastPrintJob?: LabelPrintJob;
  pendingAlertsCount: number;
  missingBarcodesCount: number;
}

