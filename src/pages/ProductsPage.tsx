import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { Product, Category, Supplier, UnitOfMeasure } from '../types/index.ts';
import {
  Search,
  Plus,
  Filter,
  Tag,
  Download,
  Upload,
  Edit2,
  Barcode,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  X,
  AlertCircle,
  Lock,
  Unlock,
  TrendingUp,
  Wallet,
  Coins,
  DollarSign,
  Package,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { openLabelModal, currentStoreId } = useApp();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [modalFeedback, setModalFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedSupplier]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [prods, cats, sups] = await Promise.all([
        api.getProducts({
          category: selectedCategory || undefined,
        }),
        api.getCategories(),
        api.getSuppliers(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ean.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSupplier = !selectedSupplier || p.supplierId === selectedSupplier;

    return matchesSearch && matchesSupplier;
  });

  // Indicadores Financeiros Consolidados do Estoque (Recálculo Automático)
  const financialTotals = React.useMemo(() => {
    let physicalUnits = 0;
    let totalCost = 0;
    let totalSale = 0;

    for (const p of filteredProducts) {
      const qty = Math.max(0, p.totalPhysicalStock || 0);
      const cost = Math.max(0, p.costPrice || 0);
      const sale = Math.max(0, p.salePrice || 0);
      const costVal = p.stockValue ?? Number((qty * cost).toFixed(2));
      const saleVal = p.potentialSaleValue ?? Number((qty * sale).toFixed(2));
      physicalUnits += qty;
      totalCost += costVal;
      totalSale += saleVal;
    }

    const grossProfit = Number((totalSale - totalCost).toFixed(2));
    const grossMarginPct = totalSale > 0 ? Number(((grossProfit / totalSale) * 100).toFixed(1)) : 0;
    const markupPct = totalCost > 0 ? Number(((grossProfit / totalCost) * 100).toFixed(1)) : 0;

    return {
      physicalUnits,
      totalCost,
      totalSale,
      grossProfit,
      grossMarginPct,
      markupPct,
    };
  }, [filteredProducts]);

  const handleExportCSV = () => {
    const headers = [
      'Codigo',
      'SKU',
      'EAN',
      'Nome',
      'Marca',
      'Categoria',
      'Unidade',
      'PrecoCusto',
      'PrecoVenda',
      'MargemBrutaPct',
      'MarkupPct',
      'SaldoFisico',
      'ValorTotalACusto',
      'ValorTotalEstimadoVenda',
      'LucroBrutoPotencial',
    ];
    const rows = filteredProducts.map(p => {
      const cat = categories.find(c => c.id === p.categoryId)?.name || '';
      const physical = Math.max(0, p.totalPhysicalStock || 0);
      const cost = Math.max(0, p.costPrice || 0);
      const sale = Math.max(0, p.salePrice || 0);
      const totalCost = p.stockValue ?? Number((physical * cost).toFixed(2));
      const totalSale = p.potentialSaleValue ?? Number((physical * sale).toFixed(2));
      const grossProfit = Number((totalSale - totalCost).toFixed(2));
      const margin = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(2)) : 0;
      const markup = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(2)) : 0;

      return [
        `"${p.code}"`,
        `"${p.sku}"`,
        `"${p.ean}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.brand}"`,
        `"${cat}"`,
        `"${p.unit}"`,
        cost.toFixed(2),
        sale.toFixed(2),
        margin.toFixed(2),
        markup.toFixed(2),
        physical,
        totalCost.toFixed(2),
        totalSale.toFixed(2),
        grossProfit.toFixed(2),
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `assx-produtos-estoque-financeiro-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchImport = async () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        setModalFeedback('O formato deve ser um array JSON de produtos.');
        return;
      }
      for (const item of parsed) {
        await api.createProduct(item);
      }
      setIsImportModalOpen(false);
      setImportJsonText('');
      loadProducts();
    } catch (err: any) {
      setModalFeedback(`Erro ao importar: ${err.message}`);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Catálogo & Cadastro de Mercadorias
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Administração completa de códigos EAN/GTIN, SKU, custos, preços de venda, margem e estoque
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-[#101D2B] p-4 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código interno, EAN, SKU ou marca..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">Todos os Fornecedores</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.tradeName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards: Indicadores Financeiros do Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Capital Investido (Valor Total a Custo) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Valor Total a Custo
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            R$ {financialTotals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Saldo Físico × Preço de Custo ({financialTotals.physicalUnits.toLocaleString('pt-BR')} itens)
          </span>
        </div>

        {/* KPI 2: Valor Total Estimado de Venda */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Valor Total Estimado de Venda
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
            R$ {financialTotals.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Faturamento potencial a preço de venda cadastrado
          </span>
        </div>

        {/* KPI 3: Lucro Bruto Potencial */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Lucro Bruto Potencial
            </span>
            <div className="p-1.5 rounded-lg bg-[#28B88C]/15 text-[#28B88C]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-[#28B88C] tabular-nums tracking-tight">
            {financialTotals.grossProfit >= 0 ? '+' : ''} R$ {financialTotals.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Ganho bruto projetado: (Venda − Custo)
          </span>
        </div>

        {/* KPI 4: Margem Bruta Estimada & Markup */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Margem Bruta Estimada
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {financialTotals.grossMarginPct}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              (Margem)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
            Markup Geral Médio: <strong className="text-indigo-600 dark:text-indigo-400">{financialTotals.markupPct}%</strong>
          </span>
        </div>
      </div>

      {/* Products Table with Enhanced Financial Columns (Desktop View) */}
      <div className="hidden md:block bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1020px]">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3">Cód / SKU</th>
                <th className="py-3 px-3 min-w-[200px]">Produto & EAN</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3 text-right">Preço Custo</th>
                <th className="py-3 px-3 text-right">Preço Venda</th>
                <th className="py-3 px-3 text-right" title="Margem Bruta = ((Venda - Custo) / Venda) * 100 | Markup = ((Venda - Custo) / Custo) * 100">
                  <span className="block text-slate-700 dark:text-slate-200">Margem Bruta %</span>
                  <span className="block text-[9px] font-normal text-slate-400 font-mono">Markup %</span>
                </th>
                <th className="py-3 px-3 text-right">Saldo Físico</th>
                <th className="py-3 px-3 text-right" title="Fórmula: Saldo Físico × Preço de Custo Unitário">
                  <span className="text-slate-800 dark:text-slate-200 block">VALOR TOTAL A CUSTO</span>
                  <span className="block text-[9px] font-normal text-slate-400 font-sans">Saldo × Custo</span>
                </th>
                <th className="py-3 px-3 text-right bg-blue-50/50 dark:bg-blue-950/20" title="Fórmula: Saldo Físico × Preço de Venda Unitário">
                  <span className="text-blue-700 dark:text-blue-300 font-bold block">VALOR TOTAL ESTIMADO DE VENDA</span>
                  <span className="block text-[9px] font-normal text-blue-500/80 font-sans">Saldo × Preço Venda</span>
                </th>
                <th className="py-3 px-3 text-right bg-emerald-50/50 dark:bg-emerald-950/20" title="Fórmula: (Saldo Físico × Venda) - (Saldo Físico × Custo)">
                  <span className="text-[#28B88C] font-bold block">LUCRO BRUTO POTENCIAL</span>
                  <span className="block text-[9px] font-normal text-emerald-600/80 font-sans">Venda − Custo Total</span>
                </th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const cat = categories.find(c => c.id === p.categoryId);
                  const physical = Math.max(0, p.totalPhysicalStock || 0);
                  const cost = Math.max(0, p.costPrice || 0);
                  const sale = Math.max(0, p.salePrice || 0);
                  const totalCost = Number((physical * cost).toFixed(2));
                  const totalSale = Number((physical * sale).toFixed(2));
                  const grossProfit = Number((totalSale - totalCost).toFixed(2));
                  const grossMarginPct = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(1)) : 0;
                  const markupPct = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(1)) : 0;
                  const isStockCritical = physical <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white block">{p.code}</span>
                        <span className="text-[10px] text-slate-400">{p.sku}</span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>EAN: {p.ean}</span>
                          <span>·</span>
                          <span>{p.brand}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 dark:text-slate-300">
                          {cat?.name || 'Geral'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        R$ {sale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span className="text-[#28B88C] font-bold block text-xs">
                          {grossMarginPct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-normal">
                          MKP: {markupPct.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono">
                        <span className={`font-bold ${isStockCritical ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                          {physical.toLocaleString('pt-BR')} {p.unit}
                        </span>
                        {isStockCritical && (
                          <span className="block text-[10px] text-red-500 font-sans font-semibold">
                            Abaixo do mín ({p.minStock})
                          </span>
                        )}
                      </td>

                      {/* 2. MANTER VALOR TOTAL DE ESTOQUE A CUSTO (Renomeado) */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                        R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 1. NOVA COLUNA: VALOR TOTAL ESTIMADO DE VENDA */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50/25 dark:bg-blue-950/10">
                        R$ {totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 3. NOVA COLUNA: LUCRO BRUTO POTENCIAL */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#28B88C] bg-emerald-50/25 dark:bg-emerald-950/10">
                        {grossProfit >= 0 ? '+' : ''} R$ {grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openLabelModal(p)}
                            title="Imprimir Etiqueta de Gôndola / Código de Barras"
                            className="p-1.5 text-slate-500 hover:text-[#28B88C] hover:bg-[#28B88C]/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsCreateModalOpen(true);
                            }}
                            title="Editar Dados do Produto"
                            className="p-1.5 text-slate-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* TFOOT: Totalizador Geral da Listagem */}
            {filteredProducts.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-[#1A2E44]/80 border-t-2 border-slate-300 dark:border-[#24445F] font-bold text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    TOTALIZADOR GERAL ({filteredProducts.length} produtos exibidos)
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    Margem Média: <strong className="text-[#28B88C]">{financialTotals.grossMarginPct}%</strong> · Markup: <strong className="text-slate-700 dark:text-slate-300">{financialTotals.markupPct}%</strong>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-white">
                    {financialTotals.physicalUnits.toLocaleString('pt-BR')} itens
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-white">
                    R$ {financialTotals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-900/30">
                    R$ {financialTotals.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#28B88C] bg-emerald-100/50 dark:bg-emerald-900/30">
                    {financialTotals.grossProfit >= 0 ? '+' : ''} R$ {financialTotals.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Products Cards (Mobile & Tablet View) */}
      <div className="block md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Nenhum produto encontrado com os filtros selecionados.
          </div>
        ) : (
          filteredProducts.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            const physical = Math.max(0, p.totalPhysicalStock || 0);
            const cost = Math.max(0, p.costPrice || 0);
            const sale = Math.max(0, p.salePrice || 0);
            const totalCost = Number((physical * cost).toFixed(2));
            const totalSale = Number((physical * sale).toFixed(2));
            const grossProfit = Number((totalSale - totalCost).toFixed(2));
            const grossMarginPct = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(1)) : 0;
            const markupPct = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(1)) : 0;
            const isStockCritical = physical <= p.minStock;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-4 space-y-3 shadow-xs"
              >
                {/* Header: Title, Category & Codes */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {p.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>Cód: <strong className="text-slate-800 dark:text-slate-200">{p.code}</strong></span>
                      <span>·</span>
                      <span>EAN: {p.ean}</span>
                      {p.brand && (
                        <>
                          <span>·</span>
                          <span>{p.brand}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300">
                    {cat?.name || 'Geral'}
                  </span>
                </div>

                {/* Financial 2-Column Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-[#24445F]/60">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/40 border border-slate-200 dark:border-[#24445F]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Preço de Custo</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      R$ {cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/40 border border-slate-200 dark:border-[#24445F]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Preço de Venda</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white block text-xs">
                      R$ {sale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/40 border border-slate-200 dark:border-[#24445F]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Margem & Markup</span>
                    <span className="font-mono font-bold text-[#28B88C] block text-xs">
                      {grossMarginPct.toFixed(1)}% <span className="text-slate-400 font-normal text-[10px]">MKP: {markupPct.toFixed(1)}%</span>
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/40 border border-slate-200 dark:border-[#24445F]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Saldo Físico</span>
                    <span className={`font-mono font-bold block text-xs ${isStockCritical ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                      {physical.toLocaleString('pt-BR')} {p.unit}
                    </span>
                    {isStockCritical && (
                      <span className="text-[9px] text-red-500 font-semibold block leading-tight">Abaixo do mín ({p.minStock})</span>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/40 border border-slate-200 dark:border-[#24445F]">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Total a Custo</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                    <span className="text-[10px] text-blue-600 dark:text-blue-300 font-medium block">Venda Estimada</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 block text-xs">
                      R$ {totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Lucro Bruto Potencial Banner */}
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/25 border border-[#28B88C]/30 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px]">
                    Lucro Bruto Potencial:
                  </span>
                  <span className="font-mono font-black text-[#28B88C] text-sm">
                    {grossProfit >= 0 ? '+' : ''} R$ {grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Action Buttons with 44px touch hitbox */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-[#24445F]/60">
                  <button
                    onClick={() => openLabelModal(p)}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Barcode className="w-4 h-4 text-[#28B88C]" />
                    <span>Etiqueta</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setIsCreateModalOpen(true);
                    }}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#28B88C]/15 hover:bg-[#28B88C]/25 text-[#28B88C] border border-[#28B88C]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Totalizer Card */}
        {filteredProducts.length > 0 && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200">TOTALIZADOR GERAL</span>
              <span className="font-mono text-[#28B88C] font-bold">{filteredProducts.length} produtos</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Itens Físicos</span>
                <span className="font-mono font-bold">{financialTotals.physicalUnits.toLocaleString('pt-BR')} itens</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Valor a Custo</span>
                <span className="font-mono font-bold">R$ {financialTotals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Venda Estimada</span>
                <span className="font-mono font-bold text-blue-400">R$ {financialTotals.totalSale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Lucro Potencial</span>
                <span className="font-mono font-bold text-[#28B88C]">+{financialTotals.grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Margem Média: <strong className="text-[#28B88C]">{financialTotals.grossMarginPct}%</strong></span>
              <span>Markup Médio: <strong className="text-indigo-400">{financialTotals.markupPct}%</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isCreateModalOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadProducts();
          }}
        />
      )}

      {/* BATCH IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Importação em Lote de Produtos (JSON)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-2">
              Cole um array JSON com objetos de produto contendo nome, ean, costPrice, salePrice, unit, etc:
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='[ { "name": "Produto Exemplo", "ean": "7890000000001", "costPrice": 10.5, "salePrice": 16.9, "unit": "UN" } ]'
              className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
            />

            {modalFeedback && (
              <p className="text-xs text-red-500 mt-2">{modalFeedback}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchImport}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76]"
              >
                Executar Importação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: ProductFormModal
interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  suppliers,
  onClose,
  onSuccess,
}) => {
  const { currentUser, roles } = useApp();

  const [formData, setFormData] = useState({
    name: product?.name || '',
    code: product?.code || '',
    sku: product?.sku || '',
    ean: product?.ean || '',
    categoryId: product?.categoryId || categories[0]?.id || 'cat-01',
    brand: product?.brand || '',
    manufacturer: product?.manufacturer || '',
    unit: (product?.unit || 'UN') as UnitOfMeasure,
    packageType: product?.packageType || '',
    unitsPerPackage: product?.unitsPerPackage || 1,
    costPrice: product?.costPrice || 0,
    salePrice: product?.salePrice || 0,
    minStock: product?.minStock || 20,
    maxStock: product?.maxStock || 200,
    safetyStock: product?.safetyStock || 10,
    reorderPoint: product?.reorderPoint || 30,
    supplierId: product?.supplierId || suppliers[0]?.id || 'sup-01',
    initialStock: 0,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if current user has permission to edit profit margin directly
  const hasMarginPermission = React.useMemo(() => {
    if (!currentUser) return false;
    const roleCode = (currentUser.role || '').toLowerCase();
    // Privileged commercial roles
    if (['superadmin', 'admin', 'manager', 'buyer', 'gerente', 'comprador'].includes(roleCode)) {
      return true;
    }
    // Explicit permission flags on user
    if (currentUser.canEditMargin || currentUser.canApprovePurchases || currentUser.canAdjustInventory) {
      return true;
    }
    // Check matched role in roles matrix
    const matchedRole = roles?.find(
      r => r.code?.toLowerCase() === roleCode ||
           r.id?.toLowerCase() === roleCode ||
           r.name?.toLowerCase() === roleCode
    );
    if (matchedRole && (matchedRole.canEditMargin || matchedRole.canApprovePurchases || matchedRole.canAdjustInventory)) {
      return true;
    }
    return false;
  }, [currentUser, roles]);

  // Initial margin input state
  const [marginInput, setMarginInput] = useState<string>(() => {
    const c = product?.costPrice || 0;
    const s = product?.salePrice || 0;
    if (s > 0) {
      return (((s - c) / s) * 100).toFixed(2);
    }
    if (product?.profitMargin) {
      return product.profitMargin.toFixed(2);
    }
    return '30.00';
  });

  // Auto calculate margins and markup for display
  const cost = Number(formData.costPrice) || 0;
  const sale = Number(formData.salePrice) || 0;
  const marginPct = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(2) : '0';
  const markupPct = cost > 0 ? (((sale - cost) / cost) * 100).toFixed(2) : '0';

  // Handler for cost price change (recalculates margin)
  const handleCostPriceChange = (val: number) => {
    const safeCost = Math.max(0, val);
    setFormData(prev => ({ ...prev, costPrice: safeCost }));
    const currentSale = Number(formData.salePrice) || 0;
    if (currentSale > 0) {
      const newMargin = (((currentSale - safeCost) / currentSale) * 100).toFixed(2);
      setMarginInput(newMargin);
    }
  };

  // Handler for sale price change (recalculates margin)
  const handleSalePriceChange = (val: number) => {
    const safeSale = Math.max(0, val);
    setFormData(prev => ({ ...prev, salePrice: safeSale }));
    const currentCost = Number(formData.costPrice) || 0;
    if (safeSale > 0) {
      const newMargin = (((safeSale - currentCost) / safeSale) * 100).toFixed(2);
      setMarginInput(newMargin);
    } else {
      setMarginInput('0.00');
    }
  };

  // Handler for direct margin input change (for authorized users)
  // Formula: Preço de Venda = Custo / (1 - Margem/100)
  const handleMarginInputChange = (valStr: string) => {
    setMarginInput(valStr);
    const m = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(m) && m < 100 && m >= -100) {
      const currentCost = Number(formData.costPrice) || 0;
      if (currentCost > 0) {
        const calculatedSale = currentCost / (1 - m / 100);
        const roundedSale = Math.round(calculatedSale * 100) / 100;
        setFormData(prev => ({
          ...prev,
          salePrice: roundedSale,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const finalProfitMargin = parseFloat(marginInput.replace(',', '.')) || (sale > 0 ? Number(marginPct) : 0);
    const finalMarkup = Number(markupPct) || 0;

    const payload = {
      ...formData,
      profitMargin: finalProfitMargin,
      markup: finalMarkup,
    };

    try {
      if (product) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {product ? 'Editar Produto' : 'Novo Cadastro de Produto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Name */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo do Produto *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Arroz Agulhinha Tipo 1 Camil 5kg"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
            />
          </div>

          {/* Row 2: Codes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Código EAN-13 / GTIN *
              </label>
              <input
                type="text"
                required
                value={formData.ean}
                onChange={e => setFormData({ ...formData, ean: e.target.value })}
                placeholder="789..."
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Código Interno (Opcional)
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: 1042"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU de Estoque
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ex: MRC-ARR-001"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              />
            </div>
          </div>

          {/* Row 3: Category, Supplier, Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria / Departamento *
              </label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fornecedor Principal *
              </label>
              <select
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.tradeName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unidade de Medida
              </label>
              <select
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
              >
                <option value="UN">Unidade (UN)</option>
                <option value="KG">Quilo (KG)</option>
                <option value="PCT">Pacote (PCT)</option>
                <option value="CX">Caixa (CX)</option>
                <option value="L">Litro (L)</option>
                <option value="FD">Fardo (FD)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Pricing & Margins */}
          <div className="bg-slate-50 dark:bg-[#1A2E44]/50 p-4 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                Formação de Preço & Rentabilidade
              </span>
              <div className="flex items-center gap-1.5">
                {hasMarginPermission ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#28B88C]/15 text-[#28B88C] border border-[#28B88C]/30 flex items-center gap-1">
                    <Unlock className="w-3 h-3" />
                    Edição de Margem Autorizada
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1" title="Seu perfil não possui alçada para editar margem">
                    <Lock className="w-3 h-3" />
                    Margem Restrita (Sem Alçada)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preço de Custo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.costPrice}
                  onChange={e => handleCostPriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono px-3 py-2 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Preço de Venda (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.salePrice}
                  onChange={e => handleSalePriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono px-3 py-2 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
                />
              </div>

              {/* Card Margem de Lucro: editável para quem tem permissão */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Margem de Lucro
                  </label>
                  {hasMarginPermission ? (
                    <span className="text-[10px] font-bold text-[#28B88C] flex items-center gap-0.5">
                      <Unlock className="w-2.5 h-2.5" />
                      Livre
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Bloqueado
                    </span>
                  )}
                </div>

                {hasMarginPermission ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="-99"
                      max="99.9"
                      value={marginInput}
                      onChange={e => handleMarginInputChange(e.target.value)}
                      placeholder="Ex: 30.70"
                      title="Digite a margem de lucro desejada. O preço de venda e markup são recalculados em tempo real."
                      className="w-full font-mono font-bold px-3 py-2 bg-white dark:bg-[#101D2B] border-2 border-[#28B88C] focus:border-[#28B88C] rounded-xl text-[#28B88C] text-sm focus:outline-none focus:ring-2 focus:ring-[#28B88C]/30 text-center pr-7 shadow-2xs"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#28B88C] pointer-events-none">
                      %
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => alert(`Seu perfil atual (${currentUser?.name || 'Operador'}) não possui alçada para alterar a margem de lucro diretamente. Solicite autorização ao Superadministrador.`)}
                    className="p-2 bg-white dark:bg-[#101D2B] rounded-xl border border-slate-200 dark:border-[#24445F] text-center cursor-not-allowed opacity-80 hover:border-amber-500/50 transition-colors"
                    title="Acesso restrito: seu perfil não tem permissão para alterar margem"
                  >
                    <span className="text-base font-bold font-mono text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      {marginPct}%
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Markup
                </label>
                <div className="py-2 px-3 bg-white dark:bg-[#101D2B] rounded-xl border border-slate-200 dark:border-[#24445F] text-center">
                  <span className="text-base font-bold font-mono text-blue-500">{markupPct}%</span>
                </div>
              </div>
            </div>

            {/* Helper row with real-time gross margin calculation */}
            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-[#24445F]/50">
              <span className="flex items-center gap-1">
                {hasMarginPermission ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#28B88C]" />
                    <span>Ao alterar a <strong>Margem de Lucro (%)</strong>, o <strong>Preço de Venda</strong> é recalculado automaticamente.</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Edição direta de margem restrita a <strong>Superadmin</strong>, <strong>Gerente</strong> e <strong>Compradores</strong>.</span>
                  </>
                )}
              </span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                Lucro Bruto: R$ {(Math.max(0, (formData.salePrice || 0) - (formData.costPrice || 0))).toFixed(2)} / un
              </span>
            </div>
          </div>

          {/* Row 5: Stock Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estoque Mínimo
              </label>
              <input
                type="number"
                value={formData.minStock}
                onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estoque Máximo
              </label>
              <input
                type="number"
                value={formData.maxStock}
                onChange={e => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estoque de Segurança
              </label>
              <input
                type="number"
                value={formData.safetyStock}
                onChange={e => setFormData({ ...formData, safetyStock: parseInt(e.target.value) || 0 })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ponto de Reposição
              </label>
              <input
                type="number"
                value={formData.reorderPoint}
                onChange={e => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {!product && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estoque Físico Inicial de Implantação (Opcional)
              </label>
              <input
                type="number"
                value={formData.initialStock}
                onChange={e => setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 50"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : product ? 'Atualizar Produto' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
