import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { StockMovement, Product, MovementType } from '../types/index.ts';
import {
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  ShieldAlert,
  RefreshCw,
  Building2,
  Check,
} from 'lucide-react';

export const StockMovementsPage: React.FC = () => {
  const { currentStoreId, stores, warehouses, currentUser, refreshAll } = useApp();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('');
  const [successToast, setSuccessToast] = useState<{ message: string; sub?: string } | null>(null);

  // New Movement Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadMovements();
  }, [currentStoreId]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      // If a specific currentStoreId exists, load for it, or load all
      const [movs, prods] = await Promise.all([
        api.getStockMovements(currentStoreId ? { storeId: currentStoreId } : undefined),
        api.getProducts(),
      ]);
      setMovements(movs);
      setProducts(prods);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMovementCreated = (createdMovement?: any) => {
    setIsModalOpen(false);

    if (createdMovement) {
      // Prepend optimistically to the movements list
      setMovements(prev => {
        const withoutNew = prev.filter(m => m.id !== createdMovement.id);
        return [createdMovement, ...withoutNew];
      });

      setSuccessToast({
        message: 'Movimentação registrada com sucesso!',
        sub: `${createdMovement.productName || 'Produto'} — Saldo atualizado para ${createdMovement.newBalance} ${createdMovement.productUnit || 'UN'}`,
      });

      setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
    }

    // Refresh background state and products
    loadMovements();
    refreshAll();
  };

  const filtered = movements.filter(m => {
    const term = searchTerm.trim().toLowerCase();
    const productName = (m.productName || '').toLowerCase();
    const productEan = (m.productEan || '').toLowerCase();
    const reason = (m.reason || '').toLowerCase();
    const doc = (m.documentNumber || '').toLowerCase();
    const user = (m.userName || '').toLowerCase();
    const warehouse = (m.warehouseName || '').toLowerCase();
    const store = (m.storeName || '').toLowerCase();

    const matchesSearch =
      !term ||
      productName.includes(term) ||
      productEan.includes(term) ||
      reason.includes(term) ||
      doc.includes(term) ||
      user.includes(term) ||
      warehouse.includes(term) ||
      store.includes(term);

    const matchesType = !selectedType || m.type === selectedType;
    const matchesStore = !selectedStoreFilter || m.storeId === selectedStoreFilter;

    return matchesSearch && matchesType && matchesStore;
  });

  const movementLabels: Record<MovementType, { label: string; isExit: boolean }> = {
    purchase_in: { label: 'Entrada por Compra', isExit: false },
    return_in: { label: 'Devolução de Cliente', isExit: false },
    adjustment_in: { label: 'Ajuste de Estoque (+)', isExit: false },
    transfer_in: { label: 'Transferência Recebida', isExit: false },
    other_in: { label: 'Outras Entradas Autorizadas', isExit: false },
    consumption_out: { label: 'Consumo Interno', isExit: true },
    loss_out: { label: 'Perda / Avaria', isExit: true },
    expiration_out: { label: 'Vencimento / Descarte', isExit: true },
    transfer_out: { label: 'Transferência Enviada', isExit: true },
    supplier_return_out: { label: 'Devolução a Fornecedor', isExit: true },
    adjustment_out: { label: 'Ajuste de Estoque (-)', isExit: true },
    sale_out: { label: 'Saída Operacional Balcão', isExit: true },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl animate-in slide-in-from-top-3 border border-emerald-400/30 text-xs">
          <div className="p-1 rounded-full bg-white/20">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold">{successToast.message}</div>
            {successToast.sub && <div className="text-[11px] text-emerald-100">{successToast.sub}</div>}
          </div>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-white/70 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-[#28B88C]" />
            Movimentações & Rastreabilidade de Estoque
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Trilha completa de auditoria: entradas, saídas, consumos e ajustes com saldo anterior e posterior
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadMovements()}
            title="Atualizar listagem de movimentações"
            className="p-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#24445F] transition-colors border border-slate-200 dark:border-[#24445F]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#28B88C]' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Movimentação
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
            placeholder="Buscar por produto, EAN, documento (NF), motivo ou responsável..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
          />
        </div>

        {/* Store filter */}
        <select
          value={selectedStoreFilter}
          onChange={e => setSelectedStoreFilter(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="">Todas as Unidades</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Operation type filter */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value)}
          className="text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="">Todos os Tipos de Movimento</option>
          <option value="purchase_in">Entrada por Compra</option>
          <option value="adjustment_in">Ajuste Positivo (+)</option>
          <option value="sale_out">Saída Operacional Balcão</option>
          <option value="consumption_out">Consumo Interno</option>
          <option value="loss_out">Perda / Avaria</option>
          <option value="expiration_out">Vencimento / Descarte</option>
          <option value="adjustment_out">Ajuste Negativo (-)</option>
          <option value="transfer_in">Transferência Recebida</option>
          <option value="transfer_out">Transferência Enviada</option>
          <option value="supplier_return_out">Devolução a Fornecedor</option>
        </select>
      </div>

      {/* Movements History Table */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-[#142334] border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Exibindo <strong className="text-slate-800 dark:text-slate-200">{filtered.length}</strong> movimentação(ões) auditada(s)
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-400">
            Trilha em tempo real com conformidade fiscal & auditoria de saldos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Tipo de Operação</th>
                <th className="py-3 px-4 min-w-[200px]">Produto & Depósito</th>
                <th className="py-3 px-4 text-center">Saldo Anterior</th>
                <th className="py-3 px-4 text-center">Quantidade</th>
                <th className="py-3 px-4 text-center">Saldo Posterior</th>
                <th className="py-3 px-4 min-w-[180px]">Motivo / Documento</th>
                <th className="py-3 px-4">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {loading && movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#28B88C] mb-2" />
                    Carregando movimentações de estoque...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma movimentação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map(m => {
                  const info = movementLabels[m.type as MovementType] || { label: m.type, isExit: false };
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR')} {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-lg text-[11px] ${
                          info.isExit
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-[#28B88C]/10 text-[#28B88C] border border-[#28B88C]/25'
                        }`}>
                          {info.isExit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {info.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                          {m.productName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{m.warehouseName || 'Depósito Geral'}</span>
                          {m.storeName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-500">{m.storeName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-500 dark:text-slate-400">
                        {m.previousBalance} {m.productUnit || 'UN'}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={info.isExit ? 'text-red-500' : 'text-[#28B88C]'}>
                          {info.isExit ? '-' : '+'}{m.quantity} {m.productUnit || 'UN'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {m.newBalance} {m.productUnit || 'UN'}
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed">{m.reason || 'Ajuste operacional'}</p>
                        {m.documentNumber && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block mt-0.5">
                            Doc: {m.documentNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-white block">{m.userName || 'Operador'}</span>
                        {m.authorizedBy && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                            Aprov: {m.authorizedBy}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MOVEMENT MODAL */}
      {isModalOpen && (
        <CreateMovementModal
          products={products}
          warehouses={warehouses}
          stores={stores}
          currentStoreId={currentStoreId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleMovementCreated}
        />
      )}
    </div>
  );
};

// Sub-component: CreateMovementModal
interface CreateMovementModalProps {
  products: Product[];
  warehouses: any[];
  stores: any[];
  currentStoreId: string;
  onClose: () => void;
  onSuccess: (newMovement?: any) => void;
}

const CreateMovementModal: React.FC<CreateMovementModalProps> = ({
  products,
  warehouses,
  stores,
  currentStoreId,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useApp();
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [type, setType] = useState<MovementType>('adjustment_in');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [allowNegative, setAllowNegative] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync state if products or warehouses load asynchronously
  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(products[0].id);
    }
  }, [products, productId]);

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  const selectedProduct = products.find(p => p.id === productId) || products[0];

  // Quick reason shortcuts
  const quickReasons = [
    'Conferência de prateleira / gôndola',
    'Abastecimento matinal de loja',
    'Ajuste físico de inventário',
    'Devolução de balcão pelo cliente',
    'Correção de saldo operacional',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const effectiveProductId = productId || products[0]?.id;
    if (!effectiveProductId) {
      setErrorMsg('Nenhum produto selecionado. Aguarde o carregamento do catálogo.');
      return;
    }

    const effectiveWarehouseId = warehouseId || warehouses[0]?.id;
    const selectedWarehouse = warehouses.find(w => w.id === effectiveWarehouseId);
    const effectiveStoreId = selectedWarehouse?.storeId || currentStoreId || (stores[0]?.id || 'store-01');

    const numQty = Number(quantity);
    if (!numQty || numQty <= 0) {
      setErrorMsg('Informe uma quantidade válida maior que zero.');
      return;
    }

    const finalReason = reason.trim() || (
      type === 'adjustment_in' ? 'Ajuste positivo de estoque via conferência operacional' :
      type === 'adjustment_out' ? 'Ajuste negativo de regularização de saldo' :
      type === 'purchase_in' ? 'Entrada operacional de mercadorias' :
      type === 'sale_out' ? 'Saída de estoque no ponto de venda / balcão' :
      type === 'consumption_out' ? 'Consumo interno operacional' :
      type === 'loss_out' ? 'Avaria / Perda física constatada' :
      type === 'expiration_out' ? 'Descarte por prazo de validade expirado' :
      'Movimentação manual de estoque registrada pelo operador'
    );

    setSubmitting(true);

    try {
      const created = await api.createStockMovement({
        productId: effectiveProductId,
        storeId: effectiveStoreId,
        warehouseId: effectiveWarehouseId || 'wh-01-gen',
        type,
        quantity: numQty,
        reason: finalReason,
        documentNumber: documentNumber.trim() || undefined,
        authorizedBy: allowNegative ? currentUser.name : undefined,
        allowNegative,
      });

      onSuccess(created);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar movimentação no servidor.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#28B88C]" />
            Registrar Movimentação de Estoque
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Selecionar Produto *
            </label>
            <select
              value={productId || products[0]?.id || ''}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Operação *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <optgroup label="Entradas (+)">
                  <option value="adjustment_in">Ajuste Positivo (+)</option>
                  <option value="purchase_in">Entrada por Compra</option>
                  <option value="return_in">Devolução de Cliente</option>
                  <option value="other_in">Outras Entradas</option>
                </optgroup>
                <optgroup label="Saídas (-)">
                  <option value="adjustment_out">Ajuste Negativo (-)</option>
                  <option value="sale_out">Saída Operacional Balcão</option>
                  <option value="consumption_out">Consumo Interno</option>
                  <option value="loss_out">Perda / Avaria</option>
                  <option value="expiration_out">Vencimento / Descarte</option>
                  <option value="supplier_return_out">Devolução a Fornecedor</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Depósito / Local de Armazenagem *
              </label>
              <select
                value={warehouseId || warehouses[0]?.id || ''}
                onChange={e => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Document */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade ({selectedProduct?.unit || 'UN'}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nº Documento / NF / Requisição
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={e => setDocumentNumber(e.target.value)}
                placeholder="Ex: NF-120409"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Motivo e Justificativa Operacional
              </label>
              <span className="text-[10px] text-slate-400">Opcional — Padrão automático</span>
            </div>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Ajuste após conferência de prateleira ou abastecimento matinal"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
            {/* Quick reason badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickReasons.map(qr => (
                <button
                  type="button"
                  key={qr}
                  onClick={() => setReason(qr)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1A2E44] hover:bg-[#28B88C]/15 hover:text-[#28B88C] text-slate-600 dark:text-slate-300 text-[10px] transition-colors border border-slate-200 dark:border-[#24445F] cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>

          {/* Negative stock authorization check */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={e => setAllowNegative(e.target.checked)}
                className="mt-0.5 rounded text-[#28B88C]"
              />
              <span className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                <strong>Autorização Excepcional:</strong> Permitir saldo negativo caso o estoque físico seja inferior. O responsável <em>({currentUser.name})</em> será gravado na trilha de auditoria.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl disabled:opacity-50 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              {submitting ? 'Gravando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
