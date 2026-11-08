import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { PurchaseOrder, Supplier, Product } from '../types/index.ts';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Clock,
  PackageCheck,
  FileText,
  AlertCircle,
  Truck,
  X,
  ChevronRight,
  ClipboardList,
  Tag,
} from 'lucide-react';

export const PurchasesPage: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
  const { currentStoreId, warehouses, currentUser } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<any | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [currentStoreId]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const [pos, sups, prods] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getProducts(),
      ]);
      setOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: PurchaseOrder['status']) => {
    try {
      await api.updatePurchaseStatus(orderId, status);
      loadPurchases();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do pedido.');
    }
  };

  const handleGenerateLabelsFromOrder = (orderToPrint: any) => {
    if (!orderToPrint?.items?.length) return;
    const itemsToQueue = orderToPrint.items
      .map((it: any) => ({
        productId: it.productId,
        sku: it.sku,
        productName: it.productName,
        copies: Math.max(1, Number(it.receivedQty || it.quantity || 2)),
      }));
    if (itemsToQueue.length === 0) return;
    localStorage.setItem('assx_label_queue_incoming', JSON.stringify(itemsToQueue));
    if (onNavigate) {
      onNavigate('labels');
    }
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'received':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28B88C]/15 text-[#28B88C]">Recebido 100%</span>;
      case 'partially_received':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">Recebido Parcial</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500">Aprovado p/ Envio</span>;
      case 'sent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-500">Enviado Fornecedor</span>;
      case 'pending_approval':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500">Aguardando Aprovação</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500">Cancelado</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">Rascunho</span>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Gestão de Compras & Recebimento Físico
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fluxo operacional de cotação, pedidos a fornecedores e conferência fiscal/física
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido de Compra
        </button>
      </div>

      {/* Orders List */}
      <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Pedido / Emissão</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4">Previsão Entrega</th>
                <th className="py-3 px-4">Itens Solicitados</th>
                <th className="py-3 px-4 text-right">Valor Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhum pedido de compra emitido.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 dark:text-white block">{order.orderNumber}</span>
                      <span className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block leading-tight">{order.supplierName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{order.paymentTerms}</span>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {order.expectedDeliveryDate}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        {order.items.slice(0, 2).map((item: any, idx: number) => (
                          <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300">
                            <strong>{item.quantity} {item.productUnit || 'un'}</strong> · {item.productName}
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{order.items.length - 2} outro(s) item(ns)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      R$ {order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(order.status)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {order.status === 'pending_approval' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'approved')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                          >
                            Aprovar Pedido
                          </button>
                        )}

                        {(order.status === 'approved' || order.status === 'sent' || order.status === 'partially_received') && (
                          <button
                            onClick={() => setReceivingOrder(order)}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Conferência / Receber
                          </button>
                        )}

                        {order.status === 'received' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#28B88C] flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#28B88C]" />
                              Conferido
                            </span>
                            <button
                              onClick={() => handleGenerateLabelsFromOrder(order)}
                              title="Gerar etiquetas dos produtos recebidos deste pedido"
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-[#28B88C]/15 text-[#28B88C] hover:bg-[#28B88C]/25 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Tag className="w-3 h-3" />
                              Etiquetas
                            </button>
                          </div>
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

      {/* CREATE PURCHASE ORDER MODAL */}
      {isCreateModalOpen && (
        <CreatePurchaseModal
          suppliers={suppliers}
          products={products}
          currentStoreId={currentStoreId}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadPurchases();
          }}
        />
      )}

      {/* GOODS RECEIPT CONFERENCE MODAL */}
      {receivingOrder && (
        <GoodsReceiptModal
          order={receivingOrder}
          warehouses={warehouses}
          onClose={() => setReceivingOrder(null)}
          onSuccess={(generateLabels, receivedItems) => {
            const savedOrder = receivingOrder;
            setReceivingOrder(null);
            loadPurchases();
            if (generateLabels && receivedItems) {
              handleGenerateLabelsFromOrder({ ...savedOrder, items: receivedItems });
            }
          }}
        />
      )}
    </div>
  );
};

// Sub-component: CreatePurchaseModal
const CreatePurchaseModal: React.FC<{
  suppliers: Supplier[];
  products: Product[];
  currentStoreId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ suppliers, products, currentStoreId, onClose, onSuccess }) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('30 DDL');
  const [items, setItems] = useState<{ productId: string; quantity: number; unitCost: number }[]>([
    { productId: products[0]?.id || '', quantity: 20, unitCost: products[0]?.costPrice || 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addItemRow = () => {
    const nextProd = products.find(p => !items.some(it => it.productId === p.id)) || products[0];
    setItems([...items, { productId: nextProd.id, quantity: 10, unitCost: nextProd.costPrice }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const handleProductChange = (idx: number, newProductId: string) => {
    const prod = products.find(p => p.id === newProductId);
    const updated = [...items];
    updated[idx].productId = newProductId;
    if (prod) updated[idx].unitCost = prod.costPrice;
    setItems(updated);
  };

  const handleQtyChange = (idx: number, qty: number) => {
    const updated = [...items];
    updated[idx].quantity = qty;
    setItems(updated);
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createPurchase({
        storeId: currentStoreId,
        supplierId,
        expectedDeliveryDate: expectedDate,
        paymentTerms,
        items,
        notes,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar pedido de compra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Emitir Pedido de Compra</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Fornecedor *</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.tradeName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Previsão Entrega *</label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Condição Pagamento</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                placeholder="Ex: 30 DDL"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-[#24445F] rounded-xl p-3 bg-slate-50 dark:bg-[#1A2E44]/30 space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Itens da Ordem de Compra
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-semibold text-[#28B88C] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            {items.map((row, idx) => {
              const currentProd = products.find(p => p.id === row.productId);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={row.productId}
                      onChange={e => handleProductChange(idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={e => handleQtyChange(idx, parseInt(e.target.value) || 1)}
                      className="w-full font-mono px-2 py-1.5 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white text-right"
                    />
                  </div>

                  <div className="w-24 font-mono text-right text-slate-700 dark:text-slate-300">
                    R$ {(row.quantity * row.unitCost).toFixed(2)}
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-[#24445F] font-bold">
              <span>Total Estimado:</span>
              <span className="font-mono text-sm text-[#28B88C]">R$ {totalValue.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações Operacionais</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Entrega na doca 2 no período matutino."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl">
              {submitting ? 'Emitindo...' : 'Emitir Pedido de Compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Sub-component: GoodsReceiptModal (Conferência de Mercadorias)
const GoodsReceiptModal: React.FC<{
  order: any;
  warehouses: any[];
  onClose: () => void;
  onSuccess: (generateLabels?: boolean, receivedItems?: any[]) => void;
}> = ({ order, warehouses, onClose, onSuccess }) => {
  const [docNumber, setDocNumber] = useState(`NF-${order.orderNumber.replace('PED-', '')}`);
  const [targetWarehouseId, setTargetWarehouseId] = useState(warehouses[0]?.id || '');
  const [itemsConference, setItemsConference] = useState<any[]>(
    order.items.map((i: any) => ({
      productId: i.productId,
      productName: i.productName,
      productUnit: i.productUnit || 'UN',
      requestedQty: i.quantity,
      alreadyReceived: i.receivedQty || 0,
      receivedQty: Math.max(0, i.quantity - (i.receivedQty || 0)),
      rejectedQty: 0,
      lotNumber: `LT-${Date.now().toString().slice(-6)}`,
      expirationDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0], // 6 months standard default
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleProcessReceipt = async (generateLabels: boolean) => {
    setSubmitting(true);
    try {
      const itemsPayload = itemsConference.map(it => ({
        productId: it.productId,
        productName: it.productName,
        receivedQty: Number(it.receivedQty),
        rejectedQty: Number(it.rejectedQty || 0),
        lotNumber: it.lotNumber,
        expirationDate: it.expirationDate,
      }));
      await api.receivePurchase(order.id, {
        documentNumber: docNumber,
        targetWarehouseId,
        receivedItems: itemsPayload,
      });
      onSuccess(generateLabels, itemsPayload);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar recebimento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleProcessReceipt(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Conferência & Recebimento Físico de Mercadorias
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pedido {order.orderNumber} · Fornecedor: {order.supplierName}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número da Nota Fiscal (NF-e) *
              </label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={e => setDocNumber(e.target.value)}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Depósito de Entrada *
              </label>
              <select
                value={targetWarehouseId}
                onChange={e => setTargetWarehouseId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              >
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <span className="font-bold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
              Itens a Conferir na Doca (Físico vs Pedido)
            </span>

            {itemsConference.map((it, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{it.productName}</span>
                  <span className="font-mono text-xs text-slate-500">
                    Solicitado: {it.requestedQty} {it.productUnit}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Qtd Recebida *</label>
                    <input
                      type="number"
                      min="0"
                      value={it.receivedQty}
                      onChange={e => {
                        const updated = [...itemsConference];
                        updated[idx].receivedQty = parseInt(e.target.value) || 0;
                        setItemsConference(updated);
                      }}
                      className="w-full font-mono px-2 py-1 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Qtd Recusada/Avaria</label>
                    <input
                      type="number"
                      min="0"
                      value={it.rejectedQty}
                      onChange={e => {
                        const updated = [...itemsConference];
                        updated[idx].rejectedQty = parseInt(e.target.value) || 0;
                        setItemsConference(updated);
                      }}
                      className="w-full font-mono px-2 py-1 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white text-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Lote Físico *</label>
                    <input
                      type="text"
                      value={it.lotNumber}
                      onChange={e => {
                        const updated = [...itemsConference];
                        updated[idx].lotNumber = e.target.value;
                        setItemsConference(updated);
                      }}
                      className="w-full font-mono px-2 py-1 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Data Validade *</label>
                    <input
                      type="date"
                      value={it.expirationDate}
                      onChange={e => {
                        const updated = [...itemsConference];
                        updated[idx].expirationDate = e.target.value;
                        setItemsConference(updated);
                      }}
                      className="w-full font-mono px-2 py-1 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex flex-wrap justify-between items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleProcessReceipt(true)}
                className="px-4 py-2 font-semibold text-[#28B88C] bg-[#28B88C]/15 hover:bg-[#28B88C]/25 border border-[#28B88C]/30 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Tag className="w-4 h-4" />
                Receber e Gerar Etiquetas
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl flex items-center gap-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                {submitting ? 'Processando Entrada...' : 'Confirmar Recebimento e Atualizar Estoque'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
