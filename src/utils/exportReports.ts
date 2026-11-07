import * as XLSX from 'xlsx';
import { Product, StockMovement, StockLoss } from '../types/index.ts';

// Helper to trigger browser download for CSV with UTF-8 BOM
const downloadCsvFile = (filename: string, content: string) => {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 1. Posição e Saldo Atual de Estoque
export const exportStockPositionReport = (
  products: (Product & {
    totalPhysicalStock?: number;
    totalAvailableStock?: number;
    stockValue?: number;
    potentialSaleValue?: number;
  })[],
  categories: { id: string; name: string }[] = [],
  storeName: string = 'Todas as Unidades',
  format: 'xlsx' | 'csv' = 'xlsx'
) => {
  const catMap = new Map(categories.map(c => [c.id, c.name]));

  const headers = [
    'Código',
    'Código de Barras (EAN)',
    'SKU',
    'Produto / Descrição',
    'Categoria',
    'Saldo Físico',
    'Unidade',
    'Custo Unitário (R$)',
    'Valor Imobilizado Custo (R$)',
    'Preço Venda (R$)',
    'Potencial de Faturamento (R$)',
    'Margem Bruta (%)',
    'Estoque Mínimo',
    'Estoque Segurança',
    'Ponto Reposição',
    'Status de Ruptura',
  ];

  const rows = products.map(p => {
    const physical = p.totalPhysicalStock ?? 0;
    const costVal = p.stockValue ?? Number((physical * p.costPrice).toFixed(2));
    const saleVal = p.potentialSaleValue ?? Number((physical * p.salePrice).toFixed(2));
    const margin = p.salePrice > 0 ? Number((((p.salePrice - p.costPrice) / p.salePrice) * 100).toFixed(1)) : 0;
    const category = catMap.get(p.categoryId) || 'Geral';

    let ruptureStatus = 'Normal (Equilibrado)';
    if (physical <= 0) {
      ruptureStatus = 'RUPTURA TOTAL (Sem Estoque)';
    } else if (physical <= p.safetyStock) {
      ruptureStatus = 'CRÍTICO (Abaixo da Segurança)';
    } else if (physical <= p.minStock) {
      ruptureStatus = 'ALERTA (Abaixo do Mínimo)';
    } else if (physical <= p.reorderPoint) {
      ruptureStatus = 'PONTO DE REPOSIÇÃO';
    }

    return [
      p.code,
      p.ean,
      p.sku,
      p.name,
      category,
      physical,
      p.unit,
      p.costPrice.toFixed(2),
      costVal.toFixed(2),
      p.salePrice.toFixed(2),
      saleVal.toFixed(2),
      margin.toFixed(1),
      p.minStock,
      p.safetyStock,
      p.reorderPoint,
      ruptureStatus,
    ];
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const baseFilename = `posicao-saldo-estoque-${storeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${timestamp}`;

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 38 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
  ];

  if (format === 'csv') {
    const csvData = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    downloadCsvFile(`${baseFilename}.csv`, csvData);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Posição de Estoque');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  }
};

// 2. Extrato Auditado de Movimentações
export const exportStockMovementsReport = (
  movements: (StockMovement & {
    productName?: string;
    productEan?: string;
    productUnit?: string;
    storeName?: string;
    warehouseName?: string;
  })[],
  format: 'xlsx' | 'csv' = 'xlsx'
) => {
  const movementLabels: Record<string, string> = {
    purchase_in: 'Entrada por Compra (Recebimento)',
    return_in: 'Devolução de Cliente',
    adjustment_in: 'Ajuste Positivo de Inventário',
    transfer_in: 'Transferência Recebida (Entrada)',
    other_in: 'Outras Entradas',
    consumption_out: 'Consumo Interno / Amostra',
    loss_out: 'Perda / Avaria Operacional',
    expiration_out: 'Descarte por Validade Expirada',
    transfer_out: 'Transferência Enviada (Saída)',
    supplier_return_out: 'Devolução ao Fornecedor',
    adjustment_out: 'Ajuste Negativo de Inventário',
    sale_out: 'Saída por Venda (PDV)',
  };

  const headers = [
    'Data / Hora',
    'ID Movimento',
    'Tipo de Movimentação',
    'Código Produto',
    'Código EAN',
    'Produto / Descrição',
    'Quantidade',
    'Unidade',
    'Loja / Filial',
    'Depósito / Local',
    'Documento / NF',
    'Motivo / Justificativa',
    'Operador Responsável',
    'Autorizado Por',
  ];

  const rows = movements.map(m => {
    const dateFormatted = new Date(m.createdAt).toLocaleString('pt-BR');
    const typeLabel = movementLabels[m.type] || m.type;

    return [
      dateFormatted,
      m.id,
      typeLabel,
      m.productId,
      m.productEan || '',
      m.productName || m.productId,
      m.quantity,
      m.productUnit || 'UN',
      m.storeName || m.storeId,
      m.warehouseName || m.warehouseId,
      m.documentNumber || 'S/N',
      m.reason,
      m.userName || 'Sistema',
      m.authorizedBy || m.userName || 'Automático',
    ];
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const baseFilename = `extrato-movimentacoes-auditado-${timestamp}`;

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 32 },
    { wch: 14 },
    { wch: 16 },
    { wch: 36 },
    { wch: 12 },
    { wch: 8 },
    { wch: 26 },
    { wch: 22 },
    { wch: 18 },
    { wch: 38 },
    { wch: 24 },
    { wch: 24 },
  ];

  if (format === 'csv') {
    const csvData = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    downloadCsvFile(`${baseFilename}.csv`, csvData);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato Movimentações');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  }
};

// 3. Apuração de Perdas e Quebras
export const exportStockLossesReport = (
  losses: (StockLoss & {
    productName?: string;
    productUnit?: string;
    categoryName?: string;
    storeName?: string;
  })[],
  format: 'xlsx' | 'csv' = 'xlsx'
) => {
  const reasonLabels: Record<string, string> = {
    expired: 'Validade Expirada (Vencimento)',
    damaged: 'Avaria / Quebra Operacional',
    broken: 'Fratura de Embalagem / Queda',
    theft: 'Divergência de Contagem / Furto',
    discard: 'Descarte Sanitário / Deterioração',
    operational_error: 'Erro de Armazenamento / Cadeia de Frio',
    other: 'Outras Perdas Operacionais',
  };

  const headers = [
    'Data do Registro',
    'ID Registro',
    'Código Produto',
    'Nome do Produto',
    'Categoria',
    'Unidade / Loja',
    'Quantidade Avariada',
    'Unidade Medida',
    'Custo Unitário (R$)',
    'Prejuízo Total (R$)',
    'Motivo da Perda',
    'Descrição / Justificativa',
    'Operador Responsável',
    'Aprovado Por',
  ];

  const rows = losses.map(l => {
    const dateFormatted = new Date(l.date).toLocaleString('pt-BR');
    const reasonLabel = reasonLabels[l.reason] || l.reason;

    return [
      dateFormatted,
      l.id,
      l.productId,
      l.productName || l.productId,
      l.categoryName || 'Geral',
      l.storeName || l.storeId,
      l.quantity,
      l.productUnit || 'UN',
      l.unitCost.toFixed(2),
      l.totalValue.toFixed(2),
      reasonLabel,
      l.reasonDescription,
      l.userName || 'Sistema',
      l.approvedBy || l.userName || 'Gerência Operacional',
    ];
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const baseFilename = `apuracao-perdas-quebras-${timestamp}`;

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 36 },
    { wch: 20 },
    { wch: 26 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 20 },
    { wch: 32 },
    { wch: 40 },
    { wch: 24 },
    { wch: 24 },
  ];

  if (format === 'csv') {
    const csvData = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    downloadCsvFile(`${baseFilename}.csv`, csvData);
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Apuração de Perdas');
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  }
};
