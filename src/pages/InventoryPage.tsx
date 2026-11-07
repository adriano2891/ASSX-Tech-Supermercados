import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { InventorySession, Category } from '../types/index.ts';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  X,
  ScanLine,
  Search,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { currentStoreId, warehouses, openScanner } = useApp();
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Active session being counted or reviewed
  const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
  const [countsMap, setCountsMap] = useState<Record<string, number>>({});
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [currentStoreId]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const [sess, cats] = await Promise.all([
        api.getInventorySessions(),
        api.getCategories(),
      ]);
      setSessions(sess);
      setCategoriesList(cats);
    } catch (err) {
      console.error('Error loading inventory sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCountSession = (session: InventorySession) => {
    setActiveSession(session);
    const initialMap: Record<string, number> = {};
    session.items.forEach(it => {
      initialMap[it.productId] = it.finalCountQty !== undefined ? it.finalCountQty : it.theoreticalQty;
    });
    setCountsMap(initialMap);
  };

  const handleSaveCounts = async () => {
    if (!activeSession) return;
    setSubmitting(true);
    try {
      const itemsPayload = Object.entries(countsMap).map(([productId, finalCountQty]) => ({
        productId,
        finalCountQty,
      }));
      const updated = await api.updateInventoryCounts(activeSession.id, itemsPayload);
      setActiveSession(updated);
      loadSessions();
      alert('Contagens atualizadas com sucesso! Analise as divergências antes da aprovação.');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar contagens.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSession = async () => {
    if (!activeSession) return;
    if (!confirm('Deseja aprovar e conciliar este inventário? Os saldos de estoque serão corrigidos automaticamente com base nas divergências.')) {
      return;
    }
    setSubmitting(true);
    try {
      const approved = await api.approveInventorySession(activeSession.id);
      setActiveSession(null);
      loadSessions();
      alert(`Inventário ${approved.sessionNumber} aprovado e reconciliado no estoque!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao aprovar inventário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Inventário Físico & Contagem Rotativa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Congelamento de saldos teóricos, apuração de divergências e ajuste automático de estoque
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Abrir Nova Sessão de Inventário
        </button>
      </div>

      {/* Active Counting Interface if a session is opened */}
      {activeSession ? (
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#24445F]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Sessão {activeSession.sessionNumber} ({activeSession.type.toUpperCase()})
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  activeSession.status === 'approved' ? 'bg-[#28B88C]/15 text-[#28B88C]' : 'bg-blue-500/15 text-blue-500'
                }`}>
                  {activeSession.status === 'approved' ? 'Aprovado / Reconciliado' : 'Em Contagem & Auditoria'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aberta por {activeSession.openedBy} em {new Date(activeSession.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  openScanner(barcode => {
                    const item = activeSession.items.find(i => i.productId.includes(barcode) || true);
                    alert(`Código lido: ${barcode}`);
                  });
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5"
              >
                <ScanLine className="w-4 h-4 text-[#28B88C]" />
                Leitor Câmera / USB
              </button>
              <button
                onClick={() => setActiveSession(null)}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300"
              >
                Voltar à Lista
              </button>
            </div>
          </div>

          {/* Divergence Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Total de Itens Auditados</span>
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{activeSession.items.length}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Itens Divergentes</span>
              <span className="text-xl font-bold font-mono text-amber-500">{activeSession.divergentItemsCount}</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Impacto Financeiro Apurado</span>
              <span className={`text-xl font-bold font-mono ${
                activeSession.totalFinancialImpact < 0 ? 'text-red-500' : 'text-[#28B88C]'
              }`}>
                R$ {activeSession.totalFinancialImpact.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Counting Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Item / ID</th>
                  <th className="py-2.5 px-4 text-center">Saldo Teórico (Sistema)</th>
                  <th className="py-2.5 px-4 text-center">Contagem Física</th>
                  <th className="py-2.5 px-4 text-center">Divergência (Qtd)</th>
                  <th className="py-2.5 px-4 text-right">Diferença em R$</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                {activeSession.items.map(item => {
                  const currentCount = countsMap[item.productId] ?? item.theoreticalQty;
                  const diff = currentCount - item.theoreticalQty;
                  const finDiff = Number((diff * item.unitCost).toFixed(2));

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {item.productId}
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                        {item.theoreticalQty} un
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        <input
                          type="number"
                          disabled={activeSession.status === 'approved'}
                          value={currentCount}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setCountsMap(prev => ({ ...prev, [item.productId]: val }));
                          }}
                          className="w-24 text-center font-mono font-bold py-1 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#28B88C]"
                        />
                      </td>

                      <td className="py-2.5 px-4 text-center font-mono font-bold">
                        <span className={diff < 0 ? 'text-red-500' : diff > 0 ? 'text-[#28B88C]' : 'text-slate-400'}>
                          {diff > 0 ? `+${diff}` : diff} un
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        <span className={finDiff < 0 ? 'text-red-500' : finDiff > 0 ? 'text-[#28B88C]' : 'text-slate-400'}>
                          R$ {finDiff.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {diff !== 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500">
                            Divergente
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#28B88C]/10 text-[#28B88C]">
                            Conforme
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          {activeSession.status !== 'approved' && (
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-[#24445F]">
              <span className="text-xs text-slate-500">
                Ao aprovar, as divergências gerarão movimentações de ajuste automático rastreadas.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCounts}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                >
                  Salvar Contagens
                </button>
                <button
                  onClick={handleApproveSession}
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Aprovar & Reconciliar Estoque
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sessions Table */
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2E44] border-b border-slate-200 dark:border-[#24445F] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Sessão / Número</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Abertura</th>
                  <th className="py-3 px-4 text-center">Itens Auditados</th>
                  <th className="py-3 px-4 text-center">Divergências</th>
                  <th className="py-3 px-4 text-right">Impacto Financeiro</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/60">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      Nenhuma sessão de inventário aberta.
                    </td>
                  </tr>
                ) : (
                  sessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {s.sessionNumber}
                      </td>

                      <td className="py-3 px-4 uppercase text-slate-600 dark:text-slate-300 font-semibold">
                        {s.type}
                      </td>

                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')} por {s.openedBy}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-medium">
                        {s.totalItems}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={s.divergentItemsCount > 0 ? 'text-amber-500' : 'text-[#28B88C]'}>
                          {s.divergentItemsCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={s.totalFinancialImpact < 0 ? 'text-red-500' : 'text-[#28B88C]'}>
                          R$ {s.totalFinancialImpact.toFixed(2)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'approved' ? 'bg-[#28B88C]/15 text-[#28B88C]' : 'bg-blue-500/15 text-blue-500'
                        }`}>
                          {s.status === 'approved' ? 'Reconciliado' : 'Em Andamento'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenCountSession(s)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-[#28B88C] hover:text-white transition-colors"
                        >
                          {s.status === 'approved' ? 'Visualizar' : 'Contar / Auditar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW SESSION MODAL */}
      {isNewModalOpen && (
        <CreateInventoryModal
          categories={categoriesList}
          warehouses={warehouses}
          currentStoreId={currentStoreId}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => {
            setIsNewModalOpen(false);
            loadSessions();
          }}
        />
      )}
    </div>
  );
};

// Sub-component: CreateInventoryModal
const CreateInventoryModal: React.FC<{
  categories: Category[];
  warehouses: any[];
  currentStoreId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ categories, warehouses, currentStoreId, onClose, onSuccess }) => {
  const [type, setType] = useState<InventorySession['type']>('general');
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [targetWarehouse, setTargetWarehouse] = useState<string>(warehouses[0]?.id || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createInventorySession({
        storeId: currentStoreId,
        type,
        targetCategoryId: type === 'category' ? targetCategory : undefined,
        targetWarehouseId: targetWarehouse,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir inventário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24445F]">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Abrir Sessão de Inventário</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Escopo do Inventário</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
            >
              <option value="general">Inventário Geral (Todos os Produtos)</option>
              <option value="category">Inventário por Categoria</option>
              <option value="cyclical">Inventário Rotativo de Alta Prioridade</option>
            </select>
          </div>

          {type === 'category' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Categoria Alvo</label>
              <select
                value={targetCategory}
                onChange={e => setTargetCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Depósito a Auditar</label>
            <select
              value={targetWarehouse}
              onChange={e => setTargetWarehouse(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-slate-500">
            A abertura da sessão congela uma cópia lógica dos saldos do sistema para comparação com as contagens físicas.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl">
              {submitting ? 'Iniciando...' : 'Iniciar Inventário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
