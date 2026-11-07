import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { Product, StockMovement, ReplenishmentSuggestion, StockLot } from '../types/index.ts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Plus,
  ArrowLeftRight,
  ScanLine,
  Coins,
  DollarSign,
  Wallet,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { currentStoreId, openScanner } = useApp();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [replenishment, setReplenishment] = useState<ReplenishmentSuggestion[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentStoreId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [prods, movs, repl, stockLots, cats] = await Promise.all([
        api.getProducts(),
        api.getStockMovements({ storeId: currentStoreId }),
        api.getReplenishment(currentStoreId),
        api.getStockLots(currentStoreId),
        api.getCategories(),
      ]);

      setProducts(prods);
      setMovements(movs);
      setReplenishment(repl);
      setLots(stockLots);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // KPIs Financeiros e Operacionais
  const totalPhysicalUnits = products.reduce((sum, p) => sum + Math.max(0, p.totalPhysicalStock || 0), 0);
  const totalCostValuation = products.reduce((sum, p) => {
    const qty = Math.max(0, p.totalPhysicalStock || 0);
    return sum + (p.stockValue ?? Number((qty * (p.costPrice || 0)).toFixed(2)));
  }, 0);
  const totalSalePotential = products.reduce((sum, p) => {
    const qty = Math.max(0, p.totalPhysicalStock || 0);
    return sum + (p.potentialSaleValue ?? Number((qty * (p.salePrice || 0)).toFixed(2)));
  }, 0);
  const totalPotentialGrossProfit = totalSalePotential - totalCostValuation;
  const overallGrossMarginPct = totalSalePotential > 0
    ? Number((((totalSalePotential - totalCostValuation) / totalSalePotential) * 100).toFixed(1))
    : 0;
  const overallMarkupPct = totalCostValuation > 0
    ? Number((((totalSalePotential - totalCostValuation) / totalCostValuation) * 100).toFixed(1))
    : 0;

  const criticalItemsCount = replenishment.filter(r => r.urgency === 'critical').length;
  const expiringLotsCount = lots.filter(l => l.daysUntilExpiry <= 30 && l.currentQuantity > 0).length;

  // Entries vs Exits Chart Data
  const entriesCount = movements.filter(m => m.type.includes('_in')).reduce((sum, m) => sum + m.quantity, 0);
  const exitsCount = movements.filter(m => m.type.includes('_out')).reduce((sum, m) => sum + m.quantity, 0);

  const movementsComparisonData = [
    { name: 'Entradas (un)', valor: entriesCount, fill: '#28B88C' },
    { name: 'Saídas (un)', valor: exitsCount, fill: '#EF4444' },
  ];

  // Stock by category chart data
  const categoryStockData = categories.map(cat => {
    const catProds = products.filter(p => p.categoryId === cat.id);
    const catVal = catProds.reduce((sum, p) => sum + (p.stockValue || 0), 0);
    return {
      name: cat.name.split(' ')[0],
      valor: catVal,
      color: cat.color || '#24445F',
    };
  }).filter(c => c.valor > 0);

  const COLORS = ['#28B88C', '#24445F', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#06B6D4', '#6366F1'];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Painel Executivo de Estoque & Finanças
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Patrimônio estocado, potencial de faturamento, margens brutas e integridade física da operação
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('movements')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#28B88C]" />
            Nova Movimentação
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            Novo Pedido
          </button>
          <button
            onClick={() => openScanner()}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Scanner Rápido
          </button>
        </div>
      </div>

      {/* KPI Cards Grid: 4 Indicadores Financeiros Centrais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Capital Total Investido em Estoque (Custo) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Capital Investido (Custo)
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            R$ {totalCostValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Saldo Físico × Custo ({totalPhysicalUnits.toLocaleString('pt-BR')} itens)
          </span>
        </div>

        {/* KPI 2: Valor Potencial Total de Venda do Estoque */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Valor Potencial de Venda
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
            R$ {totalSalePotential.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Faturamento bruto potencial a preço cadastrado
          </span>
        </div>

        {/* KPI 3: Lucro Bruto Potencial do Estoque */}
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
            {totalPotentialGrossProfit >= 0 ? '+' : ''} R$ {totalPotentialGrossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Ganho bruto projetado: (Venda − Custo Total)
          </span>
        </div>

        {/* KPI 4: Margem Bruta Estimada Geral */}
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
              {overallGrossMarginPct}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
              (Margem)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
            Markup Geral Estimado: <strong className="text-indigo-600 dark:text-indigo-400">{overallMarkupPct}%</strong>
          </span>
        </div>
      </div>

      {/* Alertas Operacionais: Ruptura & FEFO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Alerta 1: Itens Críticos de Reposição */}
        <div
          onClick={() => onNavigate('analytics')}
          className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs cursor-pointer hover:border-amber-400 transition-colors flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Risco de Ruptura na Gôndola
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Produtos com saldo físico igual ou inferior ao estoque mínimo cadastrado
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {criticalItemsCount}
            </span>
            <span className="text-[11px] text-slate-400 block font-semibold flex items-center justify-end gap-1">
              Ver lista <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Alerta 2: Lotes Próximos do Vencimento */}
        <div
          onClick={() => onNavigate('lots')}
          className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs cursor-pointer hover:border-red-400 transition-colors flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                Controle FEFO & Validades Críticas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lotes com vencimento em até 30 dias que necessitam de liquidação rápida
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums">
              {expiringLotsCount}
            </span>
            <span className="text-[11px] text-slate-400 block font-semibold flex items-center justify-end gap-1">
              Ver lotes <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Estoque por Categoria */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Capital Imobilizado por Categoria</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição do valor financeiro do estoque por setor</p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#28B88C]">Total R$ {totalCostValuation.toFixed(2)}</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStockData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                <Tooltip
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor em Estoque']}
                  contentStyle={{ backgroundColor: '#101D2B', borderColor: '#24445F', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {categoryStockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Fluxo Entradas vs Saídas */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Fluxo de Movimentação</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Relação de entradas versus saídas registradas</p>
          </div>

          <div className="h-48 w-full my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={movementsComparisonData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="valor"
                >
                  {movementsComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} unidades`, '']}
                  contentStyle={{ backgroundColor: '#101D2B', borderColor: '#24445F', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-[#24445F] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#28B88C]" />
              <span className="text-slate-600 dark:text-slate-300">Entradas: <strong>{entriesCount} un</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-600 dark:text-slate-300">Saídas: <strong>{exitsCount} un</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Movements & Critical Stock Replenishment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Últimas Movimentações Auditadas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Entradas, saídas e transferências com rastreabilidade</p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs font-semibold text-[#28B88C] hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#24445F]/50 max-h-72 overflow-y-auto">
            {movements.slice(0, 5).map(m => {
              const isExit = m.type.includes('_out');
              return (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isExit ? 'bg-red-500/10 text-red-500' : 'bg-[#28B88C]/10 text-[#28B88C]'}`}>
                      {isExit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{m.productName}</p>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {m.reason} · Por {m.userName}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-bold ${isExit ? 'text-red-500' : 'text-[#28B88C]'}`}>
                      {isExit ? '-' : '+'}{m.quantity} {m.productUnit}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      Saldo: {m.newBalance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Urgent Replenishments */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sugestões de Compra Imediata</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cálculo do motor de reposição (Lead Time + Estoque Mínimo)</p>
            </div>
            <button
              onClick={() => onNavigate('purchases')}
              className="text-xs font-semibold text-[#28B88C] hover:underline"
            >
              Criar Pedido
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#24445F]/50 max-h-72 overflow-y-auto">
            {replenishment.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">Nenhum produto em nível de reposição no momento.</p>
            ) : (
              replenishment.slice(0, 5).map(item => (
                <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        item.urgency === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {item.urgency === 'critical' ? 'Crítico' : 'Alerta'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Estoque: {item.currentStock} un · Fornecedor: {item.supplierName} ({item.leadTimeDays}d)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 dark:text-white font-mono block">
                      +{item.suggestedQty} un
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ~R$ {item.estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
