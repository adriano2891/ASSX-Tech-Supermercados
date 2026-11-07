import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { StockTransfer, Product } from '../types/index.ts';
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  X,
  AlertCircle,
} from 'lucide-react';

export const TransfersPage: React.FC = () => {
  const { stores, warehouses, currentStoreId } = useApp();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, [currentStoreId]);

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const [trans, prods] = await Promise.all([
        api.getTransfers(),
        api.getProducts(),
      ]);
      setTransfers(trans);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveTransfer = async (id: string) => {
    try {
      await api.receiveTransfer(id);
      loadTransfers();
      alert('Transferência recebida e estoque atualizado na unidade de destino!');
    } catch (err: any) {
      alert(err.message || 'Erro ao receber transferência.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Transferências Entre Filiais & Depósitos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Controle de mercadorias em trânsito com separação, despacho e conferência de destino
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Transferência
        </button>
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transferência</th>
                <th className="py-3 px-4">Origem &rarr; Destino</th>
                <th className="py-3 px-4">Itens Transferidos</th>
                <th className="py-3 px-4">Data Despacho</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma transferência cadastrada.
                  </td>
                </tr>
              ) : (
                transfers.map(trans => {
                  const sourceStore = stores.find(s => s.id === trans.sourceStoreId);
                  const destStore = stores.find(s => s.id === trans.destinationStoreId);

                  return (
                    <tr key={trans.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {trans.transferNumber}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                          <span>{sourceStore?.code || 'Origem'}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#28B88C]" />
                          <span>{destStore?.code || 'Destino'}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {sourceStore?.name} &rarr; {destStore?.name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {trans.items.map((it, idx) => {
                            const prod = products.find(p => p.id === it.productId);
                            return (
                              <div key={idx} className="text-slate-700 dark:text-slate-300">
                                <strong>{it.quantity} un</strong> · {prod?.name || it.productId}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {trans.dispatchedAt ? new Date(trans.dispatchedAt).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      <td className="py-3 px-4">
                        {trans.status === 'in_transit' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 flex items-center gap-1 w-fit">
                            <Truck className="w-3 h-3" /> Em Trânsito
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28B88C]/15 text-[#28B88C] flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Recebido
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {trans.status === 'in_transit' && (
                          <button
                            onClick={() => handleReceiveTransfer(trans.id)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#28B88C] text-white hover:bg-[#229c76] shadow-sm"
                          >
                            Confirmar Recebimento
                          </button>
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

      {/* CREATE TRANSFER MODAL */}
      {isModalOpen && (
        <CreateTransferModal
          stores={stores}
          warehouses={warehouses}
          products={products}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadTransfers();
          }}
        />
      )}
    </div>
  );
};

// Sub-component: CreateTransferModal
const CreateTransferModal: React.FC<{
  stores: any[];
  warehouses: any[];
  products: Product[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ stores, warehouses, products, onClose, onSuccess }) => {
  const [sourceStoreId, setSourceStoreId] = useState(stores[0]?.id || '');
  const [destinationStoreId, setDestinationStoreId] = useState(stores[1]?.id || stores[0]?.id || '');
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState(10);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sourceWh = warehouses.find(w => w.storeId === sourceStoreId)?.id || 'wh-01-gen';
  const destWh = warehouses.find(w => w.storeId === destinationStoreId)?.id || 'wh-02-gen';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceStoreId === destinationStoreId) {
      alert('Selecione filiais de origem e destino diferentes.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createTransfer({
        sourceStoreId,
        sourceWarehouseId: sourceWh,
        destinationStoreId,
        destinationWarehouseId: destWh,
        items: [{ productId, quantity: Number(quantity) }],
        notes,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar transferência.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24445F]">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Despacho de Transferência</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Filial de Origem *</label>
              <select
                value={sourceStoreId}
                onChange={e => setSourceStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Filial de Destino *</label>
              <select
                value={destinationStoreId}
                onChange={e => setDestinationStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Produto a Transferir *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantidade *</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações de Transporte</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Veículo refrigerado placa ABC-1234"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl">
              {submitting ? 'Despachando...' : 'Despachar Mercadoria'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
