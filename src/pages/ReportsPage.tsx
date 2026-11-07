import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { AuditLog, Product, StockBalance, Category, StockMovement, StockLoss } from '../types/index.ts';
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  History,
  CheckCircle2,
  DollarSign,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Sparkles,
} from 'lucide-react';
import {
  exportStockPositionReport,
  exportStockMovementsReport,
  exportStockLossesReport,
} from '../utils/exportReports.ts';

export const ReportsPage: React.FC = () => {
  const { currentStoreId, currentStore } = useApp();
  const [activeTab, setActiveTab] = useState<'financial' | 'audit' | 'critical'>('financial');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [losses, setLosses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    loadReportsData();
  }, [currentStoreId]);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [audits, prods, bals, cats, movs, loss] = await Promise.all([
        api.getAudit(200),
        api.getProducts(),
        api.getStockBalances(currentStoreId),
        api.getCategories(),
        api.getStockMovements({ storeId: currentStoreId }),
        api.getLosses(),
      ]);
      setAuditLogs(audits);
      setProducts(prods);
      setBalances(bals);
      setCategories(cats);
      setMovements(movs);
      setLosses(loss);
    } catch (err) {
      console.error('Error fetching reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Export Handlers
  const handleExportPosition = async (format: 'xlsx' | 'csv') => {
    const key = `pos-${format}`;
    setExporting(key);
    try {
      // Ensure latest products and categories
      const prods = products.length > 0 ? products : await api.getProducts();
      const cats = categories.length > 0 ? categories : await api.getCategories();
      exportStockPositionReport(prods, cats, currentStore?.name || 'Matriz Centro', format);
      setToast({
        type: 'success',
        text: format === 'xlsx'
          ? 'Planilha Excel (XLSX) de Posição de Estoque gerada com sucesso!'
          : 'Arquivo CSV de Posição de Estoque exportado com sucesso!',
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || 'Erro ao exportar relatório.' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportMovements = async (format: 'xlsx' | 'csv') => {
    const key = `mov-${format}`;
    setExporting(key);
    try {
      const movs = movements.length > 0 ? movements : await api.getStockMovements({ storeId: currentStoreId });
      exportStockMovementsReport(movs, format);
      setToast({
        type: 'success',
        text: format === 'xlsx'
          ? 'Planilha Excel (XLSX) do Extrato de Movimentações gerada com sucesso!'
          : 'Arquivo CSV do Extrato de Movimentações exportado com sucesso!',
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || 'Erro ao exportar movimentações.' });
    } finally {
      setExporting(null);
    }
  };

  const handleExportLosses = async (format: 'xlsx' | 'csv') => {
    const key = `loss-${format}`;
    setExporting(key);
    try {
      const lossList = losses.length > 0 ? losses : await api.getLosses();
      exportStockLossesReport(lossList, format);
      setToast({
        type: 'success',
        text: format === 'xlsx'
          ? 'Planilha Excel (XLSX) de Apuração de Perdas e Quebras gerada com sucesso!'
          : 'Arquivo CSV de Apuração de Perdas e Quebras exportado com sucesso!',
      });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || 'Erro ao exportar perdas.' });
    } finally {
      setExporting(null);
    }
  };

  const totalCostValuation = products.reduce((sum, p) => sum + (p.stockValue || 0), 0);
  const totalSalePotential = products.reduce((sum, p) => sum + (p.potentialSaleValue || 0), 0);
  const estimatedGrossProfit = totalSalePotential - totalCostValuation;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error'
            ? 'bg-red-600 text-white border-red-700 shadow-red-900/30'
            : 'bg-[#28B88C] text-white border-emerald-600 shadow-emerald-900/30'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 p-0.5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Central de Relatórios Gerenciais & Auditoria
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportação contábil, valorização de estoque, demonstrativo de margem e trilha de conformidade
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir Relatório
          </button>
        </div>
      </div>

      {/* EXCEL (XLSX) & CSV CONSOLIDATED REPORT EXPORT CARDS */}
      <div className="space-y-3 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#28B88C]" />
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Exportação Estruturada em Planilhas Excel (XLSX) e CSV
            </h2>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#28B88C]/10 text-[#28B88C] border border-[#28B88C]/20">
            DADOS REAIS CONSOLIDADOS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CARD 1: Posição e Saldo Atual de Estoque */}
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-[#28B88C]/50">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#28B88C]/15 text-[#28B88C] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3.5">
                Posição e Saldo Atual de Estoque
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Consolidado de saldos físicos por depósito, valor imobilizado a custo médio (CMP) e status de ruptura.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#24445F]/70 flex items-center gap-2">
              <button
                onClick={() => handleExportPosition('xlsx')}
                disabled={exporting === 'pos-xlsx'}
                className="flex-1 py-2 px-3 bg-[#28B88C] hover:bg-[#229c76] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting === 'pos-xlsx' ? 'Gerando...' : 'Planilha Excel'}</span>
              </button>
              <button
                onClick={() => handleExportPosition('csv')}
                disabled={exporting === 'pos-csv'}
                className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </div>

          {/* CARD 2: Extrato Auditado de Movimentações */}
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-blue-500/50">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3.5">
                Extrato Auditado de Movimentações
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Trilha completa de auditoria de todas as entradas, saídas, estornos e transferências por operador e data.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#24445F]/70 flex items-center gap-2">
              <button
                onClick={() => handleExportMovements('xlsx')}
                disabled={exporting === 'mov-xlsx'}
                className="flex-1 py-2 px-3 bg-[#28B88C] hover:bg-[#229c76] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting === 'mov-xlsx' ? 'Gerando...' : 'Planilha Excel'}</span>
              </button>
              <button
                onClick={() => handleExportMovements('csv')}
                disabled={exporting === 'mov-csv'}
                className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </div>

          {/* CARD 3: Apuração de Perdas e Quebras */}
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-red-500/50">
            <div>
              <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3.5">
                Apuração de Perdas e Quebras
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Demonstrativo de quebras operacionais, descartes de vencimento e prejuízos classificados por motivo.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-[#24445F]/70 flex items-center gap-2">
              <button
                onClick={() => handleExportLosses('xlsx')}
                disabled={exporting === 'loss-xlsx'}
                className="flex-1 py-2 px-3 bg-[#28B88C] hover:bg-[#229c76] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting === 'loss-xlsx' ? 'Gerando...' : 'Planilha Excel'}</span>
              </button>
              <button
                onClick={() => handleExportLosses('csv')}
                disabled={exporting === 'loss-csv'}
                className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-[#24445F] pb-3 no-print">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'financial'
              ? 'bg-[#28B88C] text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44]'
          }`}
        >
          Demonstrativo Financeiro do Estoque
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'audit'
              ? 'bg-[#28B88C] text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44]'
          }`}
        >
          Trilha Imutável de Auditoria (Logs)
        </button>
        <button
          onClick={() => setActiveTab('critical')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'critical'
              ? 'bg-[#28B88C] text-white'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44]'
          }`}
        >
          Relatório de Itens Críticos & Ruptura
        </button>
      </div>

      {/* TAB 1: FINANCIAL VALUATION */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-xs uppercase text-slate-500 font-semibold block">Valor em Custo Médio</span>
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                R$ {totalCostValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-xs uppercase text-slate-500 font-semibold block">Receita Potencial de Venda</span>
              <span className="text-2xl font-black font-mono text-blue-500 mt-1 block">
                R$ {totalSalePotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-4 bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F]">
              <span className="text-xs uppercase text-slate-500 font-semibold block">Margem Projetada</span>
              <span className="text-2xl font-black font-mono text-[#28B88C] mt-1 block">
                R$ {estimatedGrossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[11px] text-[#28B88C] font-semibold">
                (~{totalSalePotential > 0 ? ((estimatedGrossProfit / totalSalePotential) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-[#24445F]">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Posição Detalhada por Produto</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Valoração ponderada em custo e preço de venda</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Cód / SKU</th>
                    <th className="py-2.5 px-4">Produto</th>
                    <th className="py-2.5 px-4 text-center">Saldo Físico</th>
                    <th className="py-2.5 px-4 text-right">Custo Unitário</th>
                    <th className="py-2.5 px-4 text-right">Preço Venda</th>
                    <th className="py-2.5 px-4 text-right">Subtotal Custo</th>
                    <th className="py-2.5 px-4 text-right">Subtotal Venda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{p.code}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold">{p.totalPhysicalStock || 0} {p.unit}</td>
                      <td className="py-2.5 px-4 text-right font-mono">R$ {p.costPrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">R$ {p.salePrice.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        R$ {(p.stockValue || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#28B88C]">
                        R$ {(p.potentialSaleValue || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#24445F] flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#28B88C]" /> Trilha de Auditoria & Conformidade
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Registro inviolável de todas as ações sensíveis, alterações de saldo, cadastros e aprovações
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} eventos gravados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Data / Timestamp</th>
                  <th className="py-2.5 px-4">Módulo</th>
                  <th className="py-2.5 px-4">Ação</th>
                  <th className="py-2.5 px-4">Usuário / Papel</th>
                  <th className="py-2.5 px-4">Detalhes do Evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30">
                    <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>

                    <td className="py-2.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {log.module}
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white block">{log.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{log.userRole}</span>
                    </td>

                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CRITICAL STOCK */}
      {activeTab === 'critical' && (
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#24445F]">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Produtos com Estoque Crítico</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Itens cujo saldo físico está abaixo do estoque de segurança estipulado</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Produto</th>
                  <th className="py-2.5 px-4 text-center">Saldo Físico</th>
                  <th className="py-2.5 px-4 text-center">Estoque Mínimo</th>
                  <th className="py-2.5 px-4 text-center">Estoque Segurança</th>
                  <th className="py-2.5 px-4 text-center">Ponto de Reposição</th>
                  <th className="py-2.5 px-4 text-right">Custo Estimado Reposição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                {products.filter(p => (p.totalPhysicalStock || 0) <= p.minStock).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30">
                    <td className="py-2.5 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">EAN: {p.ean} · SKU: {p.sku}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-red-500">
                      {p.totalPhysicalStock || 0} {p.unit}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">{p.minStock} {p.unit}</td>
                    <td className="py-2.5 px-4 text-center font-mono">{p.safetyStock} {p.unit}</td>
                    <td className="py-2.5 px-4 text-center font-mono">{p.reorderPoint} {p.unit}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#28B88C]">
                      R$ {((p.maxStock - (p.totalPhysicalStock || 0)) * p.costPrice).toFixed(2)}
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
