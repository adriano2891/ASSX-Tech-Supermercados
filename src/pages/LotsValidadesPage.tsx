import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { StockLot, Product } from '../types/index.ts';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  X,
  Tag,
} from 'lucide-react';

export const LotsValidadesPage: React.FC = () => {
  const { currentStoreId, warehouses, openLabelModal, currentUser } = useApp();
  const [lots, setLots] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New Lot Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Write-off / Loss Modal
  const [discardLot, setDiscardLot] = useState<any | null>(null);

  useEffect(() => {
    loadLots();
  }, [currentStoreId]);

  const loadLots = async () => {
    setLoading(true);
    try {
      const [lts, prods] = await Promise.all([
        api.getStockLots(currentStoreId),
        api.getProducts(),
      ]);
      setLots(lts);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading lots:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLots = lots.filter(l => {
    const matchesSearch =
      !searchTerm ||
      l.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.documentNumber && l.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !statusFilter || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string, days: number) => {
    if (status === 'expired') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase">
          VENCIDO ({Math.abs(days)}d atrás)
        </span>
      );
    }
    if (status === 'critical') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
          Urgente ({days}d restantes)
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
          Atenção ({days}d restantes)
        </span>
      );
    }
    if (status === 'depleted') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
          Esgotado
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#28B88C]/15 text-[#28B88C]">
        Regular ({days}d restantes)
      </span>
    );
  };

  const handleDiscardLot = async (lot: any, reason: string) => {
    try {
      await api.createLoss({
        productId: lot.productId,
        storeId: lot.storeId,
        warehouseId: lot.warehouseId,
        lotId: lot.id,
        quantity: lot.currentQuantity,
        reason: 'expired',
        reasonDescription: `Descarte de lote ${lot.lotNumber}: ${reason}`,
      });
      setDiscardLot(null);
      loadLots();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar descarte.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Controle de Lotes & Validades (FEFO)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Regra FEFO (First Expire, First Out), prevenção de perdas e conformidade sanitária
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Lote
        </button>
      </div>

      {/* FEFO Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-red-500/30 shadow-xs">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-semibold uppercase">Vencimento Urgente (&le; 7 dias)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
            {lots.filter(l => l.status === 'critical').length}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Ação: Remanejar para ponta de gôndola ou oferta relâmpago
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-amber-500/30 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-semibold uppercase">Alerta (&le; 30 dias)</span>
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {lots.filter(l => l.status === 'warning').length}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Prioridade no rodízio de reposição física
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-[#28B88C]/30 shadow-xs">
          <div className="flex items-center justify-between text-[#28B88C] mb-1">
            <span className="text-xs font-semibold uppercase">Lotes Regulares Ativos</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-[#28B88C] font-mono">
            {lots.filter(l => l.status === 'active').length}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
            Conformidade plena com validade estendida
          </span>
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white dark:bg-[#101D2B] p-4 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por lote, produto ou documento NF..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="">Todos os Status de Validade</option>
          <option value="critical">Urgente (&le; 7 dias)</option>
          <option value="warning">Atenção (&le; 30 dias)</option>
          <option value="active">Regular</option>
          <option value="expired">Vencidos</option>
        </select>
      </div>

      {/* FEFO Lots Table (Sorted with earliest expiration first) */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Lote / Rastreio</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Fabricação</th>
                <th className="py-3 px-4 font-bold text-red-600 dark:text-red-400">Data Validade</th>
                <th className="py-3 px-4">Status FEFO</th>
                <th className="py-3 px-4 text-right">Saldo do Lote</th>
                <th className="py-3 px-4 text-right">Valor em Custo</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhum lote registrado.
                  </td>
                </tr>
              ) : (
                filteredLots.map(lot => (
                  <tr key={lot.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">{lot.lotNumber}</span>
                      <span className="text-[10px] text-slate-400">{lot.documentNumber || 'Sem NF'}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block leading-tight">{lot.productName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{lot.warehouseName}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {lot.manufacturingDate}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {lot.expirationDate}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(lot.status, lot.daysUntilExpiry)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {lot.currentQuantity} {lot.productUnit}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      R$ {lot.totalCostValue.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            const prod = products.find(p => p.id === lot.productId);
                            if (prod) openLabelModal(prod);
                          }}
                          title="Imprimir Etiqueta de Gôndola com Lote"
                          className="p-1.5 text-slate-500 hover:text-[#28B88C] hover:bg-[#28B88C]/10 rounded-lg transition-colors"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                        {lot.currentQuantity > 0 && (
                          <button
                            onClick={() => setDiscardLot(lot)}
                            title="Descarte / Baixa de Perda por Vencimento"
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <TrendingDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW LOT MODAL */}
      {isModalOpen && (
        <CreateLotModal
          products={products}
          warehouses={warehouses}
          currentStoreId={currentStoreId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadLots();
          }}
        />
      )}

      {/* DISCARD LOT CONFIRMATION MODAL */}
      {discardLot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs">
            <h3 className="font-bold text-base text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Descarte / Baixa por Validade
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Deseja registrar a baixa de <strong>{discardLot.currentQuantity} {discardLot.productUnit}</strong> do produto <strong>{discardLot.productName}</strong> (Lote: {discardLot.lotNumber})?
              Essa ação registrará uma perda financeira de R$ {discardLot.totalCostValue.toFixed(2)}.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDiscardLot(null)}
                className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDiscardLot(discardLot, 'Vencimento sanitário atingido')}
                className="px-5 py-2 font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Confirmar Descarte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: CreateLotModal
const CreateLotModal: React.FC<{
  products: Product[];
  warehouses: any[];
  currentStoreId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ products, warehouses, currentStoreId, onClose, onSuccess }) => {
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [lotNumber, setLotNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(50);
  const [documentNumber, setDocumentNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expirationDate) {
      alert('Data de validade é obrigatória.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createStockLot({
        productId,
        storeId: currentStoreId,
        warehouseId,
        lotNumber: lotNumber || `LT-${Date.now().toString().slice(-6)}`,
        manufacturingDate,
        expirationDate,
        initialQuantity: Number(initialQuantity),
        unitCost: selectedProduct?.costPrice || 0,
        supplierId: selectedProduct?.supplierId || 'sup-01',
        documentNumber,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar lote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Cadastrar Novo Lote de Mercadoria</h3>
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
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Identificador do Lote *</label>
              <input
                type="text"
                required
                value={lotNumber}
                onChange={e => setLotNumber(e.target.value)}
                placeholder="Ex: LT-2026-088"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data de Fabricação</label>
              <input
                type="date"
                value={manufacturingDate}
                onChange={e => setManufacturingDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Data de Validade (Vencimento) *</label>
              <input
                type="date"
                required
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantidade Inicial ({selectedProduct?.unit || 'UN'}) *</label>
              <input
                type="number"
                required
                min="1"
                value={initialQuantity}
                onChange={e => setInitialQuantity(parseInt(e.target.value) || 0)}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Documento / Nota Fiscal</label>
              <input
                type="text"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                placeholder="Ex: NF-44021"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl">
              {submitting ? 'Salvando...' : 'Salvar Lote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
