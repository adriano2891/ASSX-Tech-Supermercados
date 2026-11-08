import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { ReplenishmentSuggestion, AbcItem } from '../types/index.ts';
import {
  LineChart,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { currentStoreId } = useApp();
  const [replenishment, setReplenishment] = useState<ReplenishmentSuggestion[]>([]);
  const [abcData, setAbcData] = useState<{
    items: AbcItem[];
    summary: { aCount: number; bCount: number; cCount: number; totalValuation: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingOrder, setGeneratingOrder] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [currentStoreId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [repl, abc] = await Promise.all([
        api.getReplenishment(currentStoreId),
        api.getAbc(currentStoreId),
      ]);
      setReplenishment(repl);
      setAbcData(abc);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrderFromSuggestion = async (item: ReplenishmentSuggestion) => {
    setGeneratingOrder(item.productId);
    try {
      await api.createPurchase({
        storeId: currentStoreId,
        supplierId: item.supplierId,
        expectedDeliveryDate: new Date(Date.now() + item.leadTimeDays * 86400000).toISOString().split('T')[0],
        paymentTerms: '30 DDL',
        items: [
          {
            productId: item.productId,
            quantity: item.suggestedQty,
            unitCost: item.costPrice,
          },
        ],
        notes: `Pedido gerado pelo Motor de Reposição Inteligente: ${item.reason}`,
      });
      alert(`Pedido de compra emitido com sucesso para ${item.suggestedQty} un de ${item.productName}!`);
      loadAnalytics();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar pedido de compra.');
    } finally {
      setGeneratingOrder(null);
    }
  };

  const abcChartData = abcData ? [
    { name: 'Classe A (Curva 80%)', count: abcData.summary.aCount, fill: '#28B88C' },
    { name: 'Classe B (Curva 15%)', count: abcData.summary.bCount, fill: '#3B82F6' },
    { name: 'Classe C (Curva 5%)', count: abcData.summary.cCount, fill: '#64748B' },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Inteligência de Estoque & Reposição Estratégica
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Análise de Curva ABC por faturamento e motor matemático de ponto de pedido e lead time
        </p>
      </div>

      {/* REPLENISHMENT MOTOR SECTION */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Recomendações do Motor de Reposição (Prevenção de Ruptura)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fórmula: Ponto de Pedido = (Consumo Médio Diário &times; Lead Time) + Estoque de Segurança
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
            {replenishment.length} produtos em risco
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
          {replenishment.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Todos os produtos estão com níveis de estoque confortáveis acima do ponto de pedido.
            </p>
          ) : (
            replenishment.map(item => (
              <div key={item.productId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.productName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.urgency === 'critical' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}>
                      {item.urgency === 'critical' ? 'Risco Crítico' : 'Alerta Reposição'}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    {item.reason}
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Estoque Atual: <strong>{item.currentStock} un</strong></span>
                    <span>·</span>
                    <span>Ponto de Pedido: <strong>{item.reorderPoint} un</strong></span>
                    <span>·</span>
                    <span>Fornecedor: <strong>{item.supplierName} ({item.leadTimeDays}d)</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Compra Sugerida</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      +{item.suggestedQty} un
                    </span>
                    <span className="text-[11px] text-[#28B88C] font-mono block">
                      ~R$ {item.estimatedCost.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCreateOrderFromSuggestion(item)}
                    disabled={generatingOrder === item.productId}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    {generatingOrder === item.productId ? 'Gerando...' : 'Gerar Pedido'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CURVA ABC SECTION */}
      {abcData && (
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Classificação da Curva ABC de Produtos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segmentação por Pareto de impacto financeiro (Produtos A concentram ~80% do faturamento da loja)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#28B88C] font-bold">A: {abcData.summary.aCount} itens</span>
              <span>·</span>
              <span className="text-blue-500 font-bold">B: {abcData.summary.bCount} itens</span>
              <span>·</span>
              <span className="text-slate-400 font-bold">C: {abcData.summary.cCount} itens</span>
            </div>
          </div>

          {/* ABC Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={abcChartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val} produtos`, 'Volume']}
                  contentStyle={{ backgroundColor: '#101D2B', borderColor: '#24445F', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {abcChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top ABC Products Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Classe</th>
                  <th className="py-2.5 px-4">Produto</th>
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4 text-center">Estoque Físico</th>
                  <th className="py-2.5 px-4 text-right">Valor em Custo</th>
                  <th className="py-2.5 px-4 text-right">Potencial de Venda</th>
                  <th className="py-2.5 px-4 text-right">% Acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                {abcData.items.map(item => (
                  <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30">
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.classification === 'A'
                          ? 'bg-[#28B88C]/15 text-[#28B88C]'
                          : item.classification === 'B'
                          ? 'bg-blue-500/15 text-blue-500'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        Classe {item.classification}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                      {item.productName}
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {item.categoryName}
                    </td>

                    <td className="py-2.5 px-4 text-center font-mono font-medium">
                      {item.stockQty} un
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      R$ {item.totalCostValue.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      R$ {item.totalSalesValue.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#28B88C]">
                      {item.cumulativeSalesPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
