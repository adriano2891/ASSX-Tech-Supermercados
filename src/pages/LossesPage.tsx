import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { StockLoss, Product } from '../types/index.ts';
import {
  TrendingDown,
  Plus,
  AlertOctagon,
  Search,
  Filter,
  DollarSign,
  PieChart as PieIcon,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export const LossesPage: React.FC = () => {
  const { currentStoreId, warehouses, currentUser } = useApp();
  const [losses, setLosses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLosses();
  }, [currentStoreId]);

  const loadLosses = async () => {
    setLoading(true);
    try {
      const [lossData, prods] = await Promise.all([
        api.getLosses(),
        api.getProducts(),
      ]);
      setLosses(lossData);
      setProducts(prods);
    } catch (err) {
      console.error('Error fetching losses:', err);
    } finally {
      setLoading(false);
    }
  };

  const reasonLabels: Record<string, string> = {
    expired: 'Produto Vencido',
    damaged: 'Avaria em Embalagem',
    broken: 'Quebra Acidental',
    theft: 'Furto / Desvio',
    discard: 'Descarte Sanitário',
    operational_error: 'Erro Operacional',
    other: 'Outras Perdas',
  };

  const filteredLosses = losses.filter(l =>
    !searchTerm ||
    l.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.reasonDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLossValue = losses.reduce((sum, l) => sum + l.totalValue, 0);
  const totalLossUnits = losses.reduce((sum, l) => sum + l.quantity, 0);

  // Losses by reason chart data
  const reasonAggregated: Record<string, number> = {};
  losses.forEach(l => {
    const label = reasonLabels[l.reason] || l.reason;
    reasonAggregated[label] = (reasonAggregated[label] || 0) + l.totalValue;
  });

  const chartData = Object.entries(reasonAggregated).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Controle de Perdas, Avarias & Desperdícios
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registro de quebras, mercadorias vencidas, avarias e cálculo de impacto financeiro
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Registrar Nova Perda
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-red-500/30 shadow-xs">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-semibold uppercase">Impacto Financeiro Total</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            R$ {totalLossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Valor a preço de custo absorvido pela operação
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Unidades Perdidas</span>
            <AlertOctagon className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalLossUnits}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Itens físicos baixados do saldo de estoque
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Ocorrências Registradas</span>
            <TrendingDown className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {losses.length}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Termos de avaria e descarte com aprovação
          </span>
        </div>
      </div>

      {/* Chart & Reason breakdown */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Perdas por Causa / Motivo</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribuição do prejuízo financeiro acumulado</p>
            </div>

            <div className="h-56 w-full my-auto flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Impacto']}
                    contentStyle={{ backgroundColor: '#101D2B', borderColor: '#24445F', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-[#24445F] text-[11px]">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Prevenção e Diretrizes Operacionais</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Recomendações técnicas para redução de quebras no supermercado</p>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                <strong className="text-slate-900 dark:text-white block">1. Rotação FEFO Rigorosa:</strong>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Garantir que novos lotes recebidos fiquem sempre atrás dos lotes mais antigos na gôndola e nas câmaras frias.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                <strong className="text-slate-900 dark:text-white block">2. Empilhamento e Doca:</strong>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Respeitar a quantidade máxima de caixas por lastro para evitar estufamento e rompimento de embalagens frágeis.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                <strong className="text-slate-900 dark:text-white block">3. Campanhas de Validade Próxima:</strong>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Itens com menos de 7 dias de validade devem receber precificação promocional imediata antes da perda total.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Losses List Table */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Motivo da Perda</th>
                <th className="py-3 px-4 text-center">Quantidade</th>
                <th className="py-3 px-4 text-right">Custo Unitário</th>
                <th className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">Prejuízo Total</th>
                <th className="py-3 px-4">Justificativa / Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {filteredLosses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma perda registrada.
                  </td>
                </tr>
              ) : (
                filteredLosses.map(loss => (
                  <tr key={loss.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(loss.date).toLocaleDateString('pt-BR')}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block leading-tight">{loss.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{loss.categoryName}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400">
                        {reasonLabels[loss.reason] || loss.reason}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {loss.quantity} {loss.productUnit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                      R$ {loss.unitCost.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-red-600 dark:text-red-400">
                      R$ {loss.totalValue.toFixed(2)}
                    </td>

                    <td className="py-3 px-4">
                      <p className="text-slate-800 dark:text-slate-200 leading-tight">{loss.reasonDescription}</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Por {loss.userName} {loss.approvedBy && `(Aprovado: ${loss.approvedBy})`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE LOSS MODAL */}
      {isModalOpen && (
        <CreateLossModal
          products={products}
          warehouses={warehouses}
          currentStoreId={currentStoreId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadLosses();
          }}
        />
      )}
    </div>
  );
};

// Sub-component: CreateLossModal
const CreateLossModal: React.FC<{
  products: Product[];
  warehouses: any[];
  currentStoreId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ products, warehouses, currentStoreId, onClose, onSuccess }) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<StockLoss['reason']>('damaged');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createLoss({
        productId,
        storeId: currentStoreId,
        warehouseId,
        quantity: Number(quantity),
        reason,
        reasonDescription: description || 'Perda registrada na operação',
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar perda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Registrar Perda / Avaria / Descarte</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Produto *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.unit})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Motivo Principal *</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="damaged">Avaria / Amassado</option>
                <option value="broken">Quebra Física</option>
                <option value="expired">Produto Vencido</option>
                <option value="theft">Furto Identificado</option>
                <option value="discard">Descarte Sanitário</option>
                <option value="operational_error">Erro Operacional</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Depósito *</label>
              <select
                value={warehouseId}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantidade a Baixar ({selectedProduct?.unit || 'UN'}) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Descrição e Circunstância *</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Vidro quebrado por queda acidental no corredor central"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl">
              {submitting ? 'Gravando...' : 'Confirmar Baixa de Perda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
