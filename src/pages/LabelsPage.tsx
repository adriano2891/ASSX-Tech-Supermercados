import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import {
  Product,
  Category,
  Store,
  LabelTemplate,
  LabelPrinter,
  LabelPriceChange,
  LabelPrintJob,
  LabelDashboardStats,
  LabelModelPreset,
} from '../types/index.ts';
import {
  generateEan13BitString,
  generateCode128BitString,
  generateQrMatrix,
  formatUnitPrice,
  ensureValidEan13,
} from '../utils/barcodeGenerator.ts';
import { generateZplLabel, generateBatchZpl } from '../utils/zplGenerator.ts';
import { exportLabelsToPdf } from '../utils/labelPdfExport.ts';
import { PrinterModal } from '../components/labels/PrinterModal.tsx';
import {
  Tag,
  Printer,
  Layers,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sliders,
  FileText,
  Percent,
  TrendingDown,
  TrendingUp,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  X,
  Package,
  Barcode,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Info,
  Check,
  RotateCcw,
  Eye,
  Settings,
} from 'lucide-react';

export interface PrintQueueItem {
  product: Product;
  copies: number;
}

export const LabelsPage: React.FC = () => {
  const { stores, currentStoreId, currentUser, roles } = useApp();

  // Active top subtab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'batch' | 'sectors' | 'price_changes' | 'promotions' | 'templates' | 'printers' | 'history'
  >('overview');

  // Core data states
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<LabelDashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [printers, setPrinters] = useState<LabelPrinter[]>([]);
  const [priceChanges, setPriceChanges] = useState<LabelPriceChange[]>([]);
  const [promotions, setPromotions] = useState<Product[]>([]);
  const [historyJobs, setHistoryJobs] = useState<LabelPrintJob[]>([]);

  // Active selections
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);

  // Search & Filters in Product Selection
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [batchDefaultCopies, setBatchDefaultCopies] = useState<number>(4);

  // Sector Tab state
  const [activeSectorId, setActiveSectorId] = useState<string>('');

  // Preview zoom & mode
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewViewMode, setPreviewViewMode] = useState<'roll' | 'grid'>('roll');
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);

  // Modals & execution states
  const [isExecutingPrint, setIsExecutingPrint] = useState<boolean>(false);
  const [printJobSuccessModal, setPrintJobSuccessModal] = useState<LabelPrintJob | null>(null);
  const [zplModalContent, setZplModalContent] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Template Editor state
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);

  // Printer Config state
  const [editingPrinter, setEditingPrinter] = useState<LabelPrinter | null>(null);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState<boolean>(false);
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

  // Job Details Modal
  const [viewingJobDetails, setViewingJobDetails] = useState<LabelPrintJob | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load all data
  const loadAllLabelData = async () => {
    setLoading(true);
    try {
      const [
        dashboardStats,
        templatesData,
        printersData,
        priceChangesData,
        promosData,
        jobsData,
        productsData,
        categoriesData,
      ] = await Promise.all([
        api.getLabelDashboard(currentStoreId),
        api.getLabelTemplates(),
        api.getLabelPrinters(),
        api.getLabelPriceChanges(),
        api.getLabelPromotions(),
        api.getLabelJobs(),
        api.getProducts(),
        api.getCategories(),
      ]);

      setStats(dashboardStats);
      setTemplates(templatesData);
      setPrinters(printersData);
      setPriceChanges(priceChangesData);
      setPromotions(promosData);
      setHistoryJobs(jobsData);
      setProducts(productsData);
      setCategories(categoriesData);

      // Set default template and printer if not selected
      if (!selectedTemplateId) {
        const defTpl = templatesData.find(t => t.isDefault) || templatesData[0];
        if (defTpl) setSelectedTemplateId(defTpl.id);
      }
      if (!selectedPrinterId) {
        const defPrinter = printersData.find(p => p.isDefault) || printersData[0];
        if (defPrinter) setSelectedPrinterId(defPrinter.id);
      }
      if (!activeSectorId && categoriesData.length > 0) {
        setActiveSectorId(categoriesData[0].id);
      }

      // Check for incoming label queue from Goods Receipt (Recebimento de Mercadorias)
      const incomingQueueStr = localStorage.getItem('assx_label_queue_incoming');
      if (incomingQueueStr) {
        try {
          const incomingData = JSON.parse(incomingQueueStr);
          localStorage.removeItem('assx_label_queue_incoming');
          if (Array.isArray(incomingData) && incomingData.length > 0) {
            const incomingItems: PrintQueueItem[] = [];
            incomingData.forEach((it: any) => {
              const matchedProd = productsData.find(p => p.id === it.productId || p.sku === it.sku);
              if (matchedProd) {
                incomingItems.push({
                  product: matchedProd,
                  copies: Math.max(1, Number(it.copies || 1)),
                });
              }
            });
            if (incomingItems.length > 0) {
              setPrintQueue(incomingItems);
              setActiveTab('batch');
              setToastMessage({
                type: 'success',
                text: `${incomingItems.length} produto(s) recebidos carregados para impressão de etiquetas em lote!`,
              });
              return;
            }
          }
        } catch (e) {
          console.error('Falha ao processar fila recebida:', e);
        }
      }

      // Pre-populate queue with first 2 products if empty
      if (printQueue.length === 0 && productsData.length > 0) {
        setPrintQueue([
          { product: productsData[0], copies: 4 },
          { product: productsData[1] || productsData[0], copies: 4 },
        ]);
      }
    } catch (err: any) {
      console.error('Error loading labels data:', err);
      setToastMessage({ type: 'error', text: err.message || 'Erro ao carregar dados do módulo de etiquetas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllLabelData();
  }, [currentStoreId]);

  // Active template & printer references
  const currentTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const currentPrinter = useMemo(() => {
    return printers.find(p => p.id === selectedPrinterId) || printers[0];
  }, [printers, selectedPrinterId]);

  // Filtered Products for Search tab
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ean.includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;
      const matchBrand = selectedBrandFilter === 'all' || p.brand === selectedBrandFilter;

      return matchSearch && matchCategory && matchBrand;
    });
  }, [products, searchTerm, selectedCategoryFilter, selectedBrandFilter]);

  // Unique brands for filter
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [products]);

  // Sector products
  const sectorProducts = useMemo(() => {
    return products.filter(p => p.categoryId === activeSectorId);
  }, [products, activeSectorId]);

  // Total summary of current print queue
  const queueSummary = useMemo(() => {
    const totalProducts = printQueue.length;
    const totalLabels = printQueue.reduce((sum, item) => sum + (Number(item.copies) || 1), 0);
    // Rough estimate: each label is ~heightMm + gapMm on thermal roll
    const rollMeters = currentTemplate
      ? (((currentTemplate.heightMm + currentTemplate.gapMm) * totalLabels) / 1000).toFixed(2)
      : '0.00';

    return {
      totalProducts,
      totalLabels,
      rollMeters,
    };
  }, [printQueue, currentTemplate]);

  // Queue actions
  const addToQueue = (product: Product, copies: number = 4) => {
    setPrintQueue(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, copies: item.copies + copies } : item
        );
      }
      return [...prev, { product, copies }];
    });
    setToastMessage({ type: 'success', text: `"${product.name}" adicionado à fila (${copies} etiquetas).` });
  };

  const removeFromQueue = (productId: string) => {
    setPrintQueue(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQueueCopies = (productId: string, copies: number) => {
    const valid = Math.max(1, copies);
    setPrintQueue(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, copies: valid } : item))
    );
  };

  const setAllCopies = (copies: number) => {
    const valid = Math.max(1, copies);
    setPrintQueue(prev => prev.map(item => ({ ...item, copies: valid })));
    setToastMessage({ type: 'info', text: `Todas as ${printQueue.length} etiquetas ajustadas para ${valid} cópias cada.` });
  };

  const clearQueue = () => {
    setPrintQueue([]);
    setToastMessage({ type: 'info', text: 'Fila de impressão limpa.' });
  };

  const addAllFilteredToQueue = () => {
    const newItems: PrintQueueItem[] = [];
    filteredProducts.forEach(p => {
      const inQueue = printQueue.find(it => it.product.id === p.id);
      if (!inQueue) {
        newItems.push({ product: p, copies: batchDefaultCopies });
      }
    });

    if (newItems.length === 0) {
      setToastMessage({ type: 'info', text: 'Todos os produtos desta busca já estão na fila.' });
      return;
    }

    setPrintQueue(prev => [...prev, ...newItems]);
    setToastMessage({ type: 'success', text: `${newItems.length} novos produtos adicionados à fila de impressão!` });
  };

  // EXECUTE PRINT (Direct PDF / Browser Print / Thermal API)
  const handleExecutePrint = async (simulateFailure: boolean = false) => {
    if (printQueue.length === 0) {
      setToastMessage({ type: 'error', text: 'A fila de impressão está vazia.' });
      return;
    }

    if (!currentTemplate) {
      setToastMessage({ type: 'error', text: 'Selecione um modelo de etiqueta válido.' });
      return;
    }

    setIsExecutingPrint(true);
    try {
      const itemsPayload = printQueue.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        ean: item.product.ean,
        salePrice: item.product.salePrice,
        promoPrice: item.product.isPromoActive ? item.product.promotionalPrice : undefined,
        unit: item.product.unit,
        brand: item.product.brand,
        categoryName: categories.find(c => c.id === item.product.categoryId)?.name || 'Geral',
        copies: item.copies,
      }));

      const job = await api.createLabelJob({
        storeId: currentStoreId || stores[0]?.id || 'store-01',
        printerId: currentPrinter?.id || 'printer-zebra-01',
        templateId: currentTemplate.id,
        type: activeTab === 'price_changes' ? 'price_change' : activeTab === 'promotions' ? 'promo' : activeTab === 'sectors' ? 'sector' : 'batch',
        items: itemsPayload,
        simulateFailure,
      });

      // Reload data to reflect updated statistics and printed flags
      await loadAllLabelData();

      setPrintJobSuccessModal(job);
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Erro ao processar impressão.' });
    } finally {
      setIsExecutingPrint(false);
    }
  };

  // Download PDF directly
  const handleDownloadPdf = async () => {
    if (printQueue.length === 0 || !currentTemplate) return;

    try {
      const exportItems = printQueue.map(q => ({
        id: q.product.id,
        name: q.product.name,
        sku: q.product.sku,
        ean: q.product.ean,
        salePrice: q.product.salePrice,
        promoPrice: q.product.isPromoActive ? q.product.promotionalPrice : undefined,
        unit: q.product.unit,
        brand: q.product.brand,
        copies: q.copies,
      }));

      const currentStore = stores.find(s => s.id === currentStoreId) || stores[0];
      const blob = await exportLabelsToPdf(exportItems, currentTemplate, currentStore?.name);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas-assx-${currentTemplate.modelCode}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage({ type: 'success', text: 'Arquivo PDF gerado e baixado com sucesso!' });
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Erro ao gerar PDF.' });
    }
  };

  // View ZPL code
  const handleViewZpl = () => {
    if (printQueue.length === 0 || !currentTemplate) return;
    const zpl = generateBatchZpl(printQueue, currentTemplate);
    setZplModalContent(zpl);
  };

  // Test printer connection
  const handleTestPrinter = async (printerId: string) => {
    setTestingPrinterId(printerId);
    try {
      const res = await api.testLabelPrinter(printerId);
      setToastMessage({ type: 'success', text: `${res.message} (Latência: ${res.latencyMs}ms)` });
      await loadAllLabelData();
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Falha na comunicação com a impressora.' });
    } finally {
      setTestingPrinterId(null);
    }
  };

  // Retry failed items in a job
  const handleRetryFailedItems = async (jobId: string) => {
    try {
      const retried = await api.retryFailedJobItems(jobId);
      setToastMessage({ type: 'success', text: `Reimpressão iniciada com sucesso (${retried.jobCode}). Apenas itens pendentes!` });
      await loadAllLabelData();
      if (viewingJobDetails && viewingJobDetails.id === jobId) {
        setViewingJobDetails(retried);
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Erro ao reprocessar pendências.' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. TOP HEADER & METRICS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#24445F]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gestão Inteligente de Impressão de Etiquetas
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#28B88C]/15 text-[#28B88C] font-mono border border-[#28B88C]/30">
              GS1 · ABNT · TÉRMICA
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Geração, personalização e impressão em lote para gôndolas, caixas, hortifruti e rolos térmicos Zebra/Argox
          </p>
        </div>

        {/* Action Header shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadPdf()}
            disabled={printQueue.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Baixar lote atual em PDF com medidas reais"
          >
            <Download className="w-4 h-4 text-[#28B88C]" />
            Baixar PDF
          </button>

          <button
            onClick={handleViewZpl}
            disabled={printQueue.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Visualizar comandos ZPL II para envio direto à porta de impressão"
          >
            <Barcode className="w-4 h-4 text-purple-500" />
            Código ZPL
          </button>

          <button
            onClick={() => handleExecutePrint(false)}
            disabled={printQueue.length === 0 || isExecutingPrint}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {isExecutingPrint ? 'Imprimindo...' : `Imprimir Lote (${queueSummary.totalLabels})`}
          </button>
        </div>
      </div>

      {/* 2. KPI METRIC CARDS (REAL DATA INDICATORS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Impressas Hoje */}
        <div className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Impressas Hoje
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {stats?.totalPrintedToday || 0}
            </span>
            <span className="text-[10px] text-slate-400">etiquetas</span>
          </div>
          <span className="text-[10px] text-[#28B88C] block mt-1">Lotes confirmados</span>
        </div>

        {/* Metric 2: Produtos no Catálogo */}
        <div className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Disponíveis
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {stats?.totalAvailableProducts || products.length}
            </span>
            <span className="text-[10px] text-slate-400">produtos</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">100% integrados</span>
        </div>

        {/* Metric 3: Preços Alterados Pendentes */}
        <div
          onClick={() => setActiveTab('price_changes')}
          className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Preços Alterados
            </span>
            {(stats?.priceChangedPendingCount || 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {stats?.priceChangedPendingCount || 0}
            </span>
            <span className="text-[10px] text-slate-400">pendentes</span>
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-1">Aguardam nova gôndola</span>
        </div>

        {/* Metric 4: Ofertas / Promoções Ativas */}
        <div
          onClick={() => setActiveTab('promotions')}
          className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs cursor-pointer hover:border-red-400 transition-colors"
        >
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Ofertas Ativas
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-red-600 dark:text-red-400 font-mono tabular-nums">
              {stats?.activePromosCount || promotions.length}
            </span>
            <span className="text-[10px] text-slate-400">em vigor</span>
          </div>
          <span className="text-[10px] text-red-500 block mt-1">Etiquetas promocionais</span>
        </div>

        {/* Metric 5: Mês Atual */}
        <div className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total do Mês
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
              {stats?.monthPrintsCount || 0}
            </span>
            <span className="text-[10px] text-slate-400">etiquetas</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Auditoria contínua</span>
        </div>

        {/* Metric 6: Última Impressão */}
        <div
          onClick={() => setActiveTab('history')}
          className="bg-white dark:bg-[#101D2B] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs cursor-pointer hover:border-[#28B88C] transition-colors"
        >
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Último Lote
          </span>
          <div className="mt-1 truncate">
            <span className="font-bold text-xs text-slate-900 dark:text-white font-mono block truncate">
              {stats?.lastPrintJob?.jobCode || 'Nenhum'}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {stats?.lastPrintJob ? `${stats.lastPrintJob.confirmedLabels} etiq.` : 'Sem emissões'}
            </span>
          </div>
          <span className="text-[10px] text-[#28B88C] block mt-1">Ver histórico</span>
        </div>
      </div>

      {/* 3. NAVIGATION SUBTABS (ATALHOS OPERACIONAIS) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-[#24445F] text-xs font-semibold">
        {[
          { id: 'overview', label: 'Nova Impressão & Fila', icon: Tag, count: printQueue.length },
          { id: 'batch', label: 'Impressão em Lote', icon: Layers, highlight: true },
          { id: 'sectors', label: 'Imprimir por Setor', icon: Package },
          {
            id: 'price_changes',
            label: 'Preços Alterados',
            icon: TrendingUp,
            badge: priceChanges.filter(pc => pc.status === 'pending').length,
          },
          { id: 'promotions', label: 'Etiquetas Promocionais', icon: Percent, badge: promotions.length },
          { id: 'templates', label: 'Modelos de Etiquetas', icon: Sliders },
          { id: 'printers', label: 'Configurar Impressoras', icon: Printer, count: printers.length },
          { id: 'history', label: 'Histórico & Auditoria', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#28B88C]/20 text-[#28B88C] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. MAIN CONTENT AREA SPLIT: CONTROLS & LIVE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: ACTIVE WORKSPACE TAB (7 of 12 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB 1: OVERVIEW & GENERAL PRODUCT SELECTION */}
          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Seleção & Pesquisa de Produtos</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Localize por nome, SKU, EAN ou fornecedor e adicione à fila de impressão
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addAllFilteredToQueue}
                    disabled={filteredProducts.length === 0}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#28B88C]/15 text-[#28B88C] hover:bg-[#28B88C]/25 transition-colors disabled:opacity-40"
                  >
                    + Todos da Busca ({filteredProducts.length})
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Nome, SKU, EAN ou Marca..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <select
                    value={selectedCategoryFilter}
                    onChange={e => setSelectedCategoryFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="all">Todas as Categorias</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedBrandFilter}
                    onChange={e => setSelectedBrandFilter(e.target.value)}
                    className="w-full py-2 px-3 text-xs bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="all">Todas as Marcas</option>
                    {uniqueBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Table with Quick Add */}
              <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 sticky top-0 z-10 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3">SKU / EAN</th>
                      <th className="py-2 px-3 text-right">Preço Venda</th>
                      <th className="py-2 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Nenhum produto localizado com estes filtros.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const inQueue = printQueue.find(item => item.product.id === p.id);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <strong className="text-slate-900 dark:text-white block font-bold text-xs leading-tight">
                                {p.name}
                              </strong>
                              <span className="text-[10px] text-slate-400 block">
                                {p.brand} · {p.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              <span>{p.sku}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{p.ean}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {p.isPromoActive && p.promotionalPrice ? (
                                <div>
                                  <span className="line-through text-slate-400 text-[10px] block">
                                    R$ {p.salePrice.toFixed(2)}
                                  </span>
                                  <span className="text-red-500 font-bold">
                                    R$ {p.promotionalPrice.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                `R$ ${p.salePrice.toFixed(2)}`
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {inQueue ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#28B88C] font-semibold">
                                  <Check className="w-3.5 h-3.5" /> Na Fila ({inQueue.copies})
                                </span>
                              ) : (
                                <button
                                  onClick={() => addToQueue(p, 4)}
                                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors"
                                >
                                  + Adicionar
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
          )}

          {/* TAB 2: IMPRESSÃO EM LOTE (PRIORITY FEATURE) */}
          {activeTab === 'batch' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Impressão em Lote — Fila Operacional</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina cópias em massa, confira os itens e envie grandes volumes sem travar o sistema
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAllCopies(2)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2E44] rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Todos: 2 cópias
                  </button>
                  <button
                    onClick={() => setAllCopies(4)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2E44] rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Todos: 4 cópias
                  </button>
                  <button
                    onClick={() => setAllCopies(8)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2E44] rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  >
                    Todos: 8 cópias
                  </button>
                </div>
              </div>

              {/* Batch Actions Bar */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-[#1A2E44]/50 p-3 rounded-xl border border-slate-200 dark:border-[#24445F] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {queueSummary.totalProducts} produtos selecionados
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-bold text-[#28B88C] font-mono">
                    {queueSummary.totalLabels} etiquetas no total
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Aprox. {queueSummary.rollMeters}m de rolo
                  </span>
                </div>

                <button
                  onClick={clearQueue}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 text-[11px] font-semibold hover:underline"
                >
                  Limpar Fila
                </button>
              </div>

              {/* Batch items table with individual quantity editor */}
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 sticky top-0 z-10 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Preço</th>
                      <th className="py-2 px-3 text-center min-w-[140px]">Qtd. de Etiquetas</th>
                      <th className="py-2 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                    {printQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Sua fila de impressão está vazia. Adicione produtos na aba "Nova Impressão", "Por Setor" ou "Preços Alterados".
                        </td>
                      </tr>
                    ) : (
                      printQueue.map((item, idx) => (
                        <tr key={item.product.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-900 dark:text-white block font-bold text-xs">
                              {item.product.name}
                            </strong>
                            <span className="text-[10px] text-slate-400 font-mono">
                              EAN: {item.product.ean} · {item.product.brand}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            {item.product.sku}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            R$ {item.product.salePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => updateQueueCopies(item.product.id, item.copies - 1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={200}
                                value={item.copies}
                                onChange={e => updateQueueCopies(item.product.id, Number(e.target.value))}
                                className="w-12 text-center py-1 text-xs font-mono font-bold bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded"
                              />
                              <button
                                onClick={() => updateQueueCopies(item.product.id, item.copies + 1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => removeFromQueue(item.product.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded"
                              title="Remover item da fila"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Simulation test failure option (to demonstrate prompt requirement #4) */}
              <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/30 rounded-xl border border-slate-200 dark:border-[#24445F] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Testar tolerância a falhas térmicas: permite simular falta de papel e repetir apenas os itens pendentes sem duplicar os já impressos.
                  </span>
                </div>
                <button
                  onClick={() => handleExecutePrint(true)}
                  disabled={printQueue.length === 0}
                  className="px-3 py-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/10 transition-colors"
                >
                  Simular Falha Parcial
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: IMPRESSÃO POR SETOR & CATEGORIA */}
          {activeTab === 'sectors' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Imprimir por Setor & Categoria</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Selecione um departamento da loja para carregar todos os seus produtos e gerar etiquetas
                  </p>
                </div>
                <button
                  onClick={() => {
                    sectorProducts.forEach(p => addToQueue(p, 4));
                    setToastMessage({ type: 'success', text: `Todos os produtos deste setor foram adicionados à fila!` });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors"
                >
                  + Adicionar Todos do Setor ({sectorProducts.length})
                </button>
              </div>

              {/* Sectors Horizontal Pill Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveSectorId(cat.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      activeSectorId === cat.id
                        ? 'bg-[#28B88C] text-white border-[#28B88C] shadow-sm font-bold'
                        : 'bg-slate-50 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24445F] hover:border-slate-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Sector Products List */}
              <div className="border border-slate-200 dark:border-[#24445F] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">SKU / EAN</th>
                      <th className="py-2.5 px-3 text-right">Preço Atual</th>
                      <th className="py-2.5 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                    {sectorProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Nenhum produto cadastrado neste setor.
                        </td>
                      </tr>
                    ) : (
                      sectorProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <strong className="text-slate-900 dark:text-white block font-bold text-xs">{p.name}</strong>
                            <span className="text-[10px] text-slate-400">{p.brand} · {p.unit}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                            <span>{p.sku}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{p.ean}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            R$ {p.salePrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => addToQueue(p, 4)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#28B88C]/15 text-[#28B88C] hover:bg-[#28B88C]/25 transition-colors"
                            >
                              + Adicionar
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

          {/* TAB 4: ETIQUETAS COM PREÇOS ALTERADOS */}
          {activeTab === 'price_changes' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Etiquetas com Preços Alterados</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Identificação automática de produtos que tiveram aumento ou redução de preço e necessitam de novas etiquetas
                  </p>
                </div>
                <button
                  onClick={() => {
                    const pendingList = priceChanges.filter(pc => pc.status === 'pending');
                    pendingList.forEach(pc => {
                      const prod = products.find(p => p.id === pc.productId);
                      if (prod) addToQueue(prod, 4);
                    });
                    setToastMessage({ type: 'success', text: `${pendingList.length} produtos com preço alterado adicionados à fila de impressão!` });
                  }}
                  disabled={priceChanges.filter(pc => pc.status === 'pending').length === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-40"
                >
                  Imprimir Todas as Pendentes ({priceChanges.filter(pc => pc.status === 'pending').length})
                </button>
              </div>

              {/* Price changes list */}
              <div className="border border-slate-200 dark:border-[#24445F] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3">Preço Anterior</th>
                      <th className="py-2.5 px-3">Preço Novo</th>
                      <th className="py-2.5 px-3">Variação</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                    {priceChanges.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Nenhuma alteração de preço registrada recentemente.
                        </td>
                      </tr>
                    ) : (
                      priceChanges.map(pc => {
                        const isIncrease = pc.changeType === 'increase';
                        const isPending = pc.status === 'pending';
                        return (
                          <tr key={pc.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <strong className="text-slate-900 dark:text-white block font-bold text-xs">{pc.productName}</strong>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {pc.sku} · Alterado em {new Date(pc.changedAt).toLocaleDateString('pt-BR')} por {pc.changedBy}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-500 line-through">
                              R$ {pc.previousPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              R$ {pc.newPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold">
                              <span className={`inline-flex items-center gap-1 ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                {isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                {pc.percentageChange > 0 ? `+${pc.percentageChange}%` : `${pc.percentageChange}%`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isPending ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Pendente
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  Reimpresso
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  const prod = products.find(p => p.id === pc.productId);
                                  if (prod) addToQueue(prod, 4);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#28B88C]/15 text-[#28B88C] hover:bg-[#28B88C]/25 transition-colors"
                              >
                                + Adicionar à Fila
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ETIQUETAS PROMOCIONAIS */}
          {activeTab === 'promotions' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Etiquetas Promocionais & Ofertas</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Preço anterior riscado, preço promocional em destaque, % de desconto e prazo de validade
                  </p>
                </div>
                <button
                  onClick={() => {
                    promotions.forEach(p => addToQueue(p, 4));
                    setToastMessage({ type: 'success', text: `${promotions.length} produtos em oferta adicionados à fila!` });
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Adicionar Todas as Ofertas ({promotions.length})
                </button>
              </div>

              {/* Promotions grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {promotions.map(promo => {
                  const discountPct = Math.round(((promo.salePrice - (promo.promotionalPrice || promo.salePrice)) / promo.salePrice) * 100);
                  return (
                    <div
                      key={promo.id}
                      className="p-3.5 bg-slate-50 dark:bg-[#1A2E44]/40 border border-red-500/30 rounded-xl space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        -{discountPct}% OFF
                      </div>

                      <strong className="text-slate-900 dark:text-white block font-bold text-xs pr-14">
                        {promo.name}
                      </strong>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        SKU: {promo.sku} · EAN: {promo.ean}
                      </span>

                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-xs text-slate-400 line-through font-mono">
                          De: R$ {promo.salePrice.toFixed(2)}
                        </span>
                        <span className="text-base font-extrabold text-red-600 dark:text-red-400 font-mono">
                          Por: R$ {promo.promotionalPrice?.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#24445F]/50 text-[10px] text-slate-500">
                        <span>Validade: até {promo.promoEndDate ? new Date(promo.promoEndDate).toLocaleDateString('pt-BR') : 'Indeterminado'}</span>
                        <button
                          onClick={() => addToQueue(promo, 4)}
                          className="px-2 py-1 bg-red-600/10 text-red-600 dark:text-red-400 font-bold rounded hover:bg-red-600/20"
                        >
                          + Fila (4 cópias)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: EDITOR DE MODELOS DE ETIQUETAS */}
          {activeTab === 'templates' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Editor de Modelos & Formatos</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gerencie dimensões físicas (50x30, 60x40, 100x50, 100x150mm), campos visíveis e estilos
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsTemplateModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Novo Modelo Personalizado
                </button>
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#28B88C] bg-[#28B88C]/5'
                          : 'border-slate-200 dark:border-[#24445F] bg-slate-50 dark:bg-[#1A2E44]/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-slate-900 dark:text-white text-xs block font-bold">
                            {tpl.name}
                          </strong>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {tpl.description}
                          </span>
                        </div>
                        {tpl.isDefault && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#28B88C]/15 text-[#28B88C] border border-[#28B88C]/30">
                            Padrão
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                        <span>{tpl.widthMm} × {tpl.heightMm} mm</span>
                        <span>·</span>
                        <span>{tpl.barcodeType}</span>
                        <span>·</span>
                        <span>{tpl.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}</span>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-[#24445F]/50 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedTemplateId(tpl.id)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-[#28B88C] text-white font-bold'
                              : 'bg-slate-200 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ Modelo Ativo' : 'Selecionar'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTemplate(tpl);
                              setIsTemplateModalOpen(true);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            title="Editar modelo"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 7: CONFIGURAÇÃO DE IMPRESSORAS */}
          {activeTab === 'printers' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F] gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Parque de Impressoras Térmicas & Rede</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gerenciamento de equipamentos Zebra (ZPL), Argox (EPL), Elgin (ESC/POS) e Spooler PDF
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPrinter(null);
                    setIsPrinterModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Impressora
                </button>
              </div>

              {/* Printers List */}
              <div className="space-y-3">
                {printers.map(printer => {
                  const isSelected = selectedPrinterId === printer.id;
                  const isTesting = testingPrinterId === printer.id;
                  return (
                    <div
                      key={printer.id}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#28B88C] bg-[#28B88C]/5'
                          : 'border-slate-200 dark:border-[#24445F] bg-slate-50 dark:bg-[#1A2E44]/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white text-xs font-bold">
                            {printer.name}
                          </strong>
                          {printer.isDefault && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                              Padrão
                            </span>
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-[#101D2B] text-slate-600 dark:text-slate-300">
                            {printer.protocol}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>Modelo: {printer.model}</span>
                          <span>·</span>
                          <span>Conexão: {printer.connectionType.toUpperCase()}</span>
                          {printer.ipAddress && <span>({printer.ipAddress}:{printer.port})</span>}
                          <span>·</span>
                          <span>{printer.densityDpi} DPI</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTestPrinter(printer.id)}
                          disabled={isTesting}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          {isTesting ? 'Testando...' : 'Teste de Comunicação'}
                        </button>

                        <button
                          onClick={() => {
                            setEditingPrinter(printer);
                            setIsPrinterModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#24445F] transition-colors flex items-center gap-1"
                          title="Editar configurações desta impressora"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => setSelectedPrinterId(printer.id)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-[#28B88C] text-white font-bold'
                              : 'bg-slate-200 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ Selecionada' : 'Usar Esta'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 8: HISTÓRICO & AUDITORIA DE IMPRESSÕES */}
          {activeTab === 'history' && (
            <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Histórico de Lotes & Auditoria</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rastreamento de data, operador, impressora, status e opções de repetição
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Lote / Data</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3">Impressora</th>
                      <th className="py-2.5 px-3 text-center">Etiquetas</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                    {historyJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Nenhum lote de impressão registrado.
                        </td>
                      </tr>
                    ) : (
                      historyJobs.map(job => (
                        <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2E44]/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <strong className="font-mono text-slate-900 dark:text-white block font-bold">
                              {job.jobCode}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              {new Date(job.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-slate-800 dark:text-slate-200 block font-semibold">
                              {job.userName}
                            </span>
                            <span className="text-[10px] text-slate-400">{job.storeName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            <span>{job.printerName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">{job.templateName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {job.confirmedLabels} / {job.totalLabels}
                          </td>
                          <td className="py-2.5 px-3">
                            {job.status === 'confirmed' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                Confirmada
                              </span>
                            ) : job.status === 'failed' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30">
                                Falha Parcial
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                Enviada
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingJobDetails(job)}
                                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200"
                                title="Ver detalhes do lote"
                              >
                                Detalhes
                              </button>

                              {job.failedLabels > 0 && (
                                <button
                                  onClick={() => handleRetryFailedItems(job.id)}
                                  className="px-2 py-1 text-[11px] font-semibold bg-amber-500 text-white rounded hover:bg-amber-600"
                                  title="Repetir apenas itens pendentes"
                                >
                                  Repetir Pendentes
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
          )}
        </div>

        {/* RIGHT COLUMN: REAL-TIME FAITHFUL PREVIEW (5 of 12 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-5 shadow-xs space-y-4">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider block">
                  Pré-Visualização em Tempo Real
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentTemplate ? `${currentTemplate.name} (${currentTemplate.widthMm}x${currentTemplate.heightMm}mm)` : 'Carregando...'}
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2E44] p-1 rounded-xl">
                <button
                  onClick={() => setPreviewZoom(prev => Math.max(70, prev - 15))}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-700 dark:text-slate-300">
                  {previewZoom}%
                </span>
                <button
                  onClick={() => setPreviewZoom(prev => Math.min(150, prev + 15))}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Template & Printer Quick Selectors */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  Modelo Ativo
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={e => setSelectedTemplateId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white font-semibold text-xs"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  Impressora Destino
                </label>
                <select
                  value={selectedPrinterId}
                  onChange={e => setSelectedPrinterId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-lg text-slate-900 dark:text-white font-semibold text-xs"
                >
                  {printers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.protocol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Canvas / Label Simulation Container */}
            <div className="bg-slate-200/60 dark:bg-[#0A121B] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#24445F] flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
              {printQueue.length === 0 ? (
                <div className="text-center space-y-2 p-6">
                  <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">Nenhum produto selecionado para pré-visualização.</p>
                </div>
              ) : (
                <div
                  style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'center center' }}
                  className="transition-transform duration-150 space-y-3"
                >
                  {/* Render single label preview for current item in queue */}
                  {(() => {
                    const activeQueueItem = printQueue[previewPageIndex] || printQueue[0];
                    const prod = activeQueueItem.product;
                    const isPromo = prod.isPromoActive && prod.promotionalPrice && prod.promotionalPrice < prod.salePrice;
                    const currentStore = stores.find(s => s.id === currentStoreId) || stores[0];

                    const eanVal = prod.ean || '7891000000000';
                    const { bits, validEan } = generateEan13BitString(eanVal);

                    // Dynamic label styling based on template dimensions
                    const isSmall = currentTemplate ? currentTemplate.heightMm <= 35 : false;
                    const isPromoTemplate = currentTemplate?.modelCode === 'C_PROMOTIONAL';

                    return (
                      <div
                        className={`bg-white text-black p-3.5 shadow-xl rounded-md border flex flex-col justify-between font-sans select-none relative ${
                          currentTemplate?.elements.showBorder ? 'border-slate-400' : 'border-transparent'
                        }`}
                        style={{
                          width: currentTemplate ? `${Math.min(320, currentTemplate.widthMm * 4.5)}px` : '280px',
                          minHeight: currentTemplate ? `${Math.min(220, currentTemplate.heightMm * 4.5)}px` : '170px',
                        }}
                      >
                        {/* Store Header */}
                        {currentTemplate?.elements.showStoreName && (
                          <div className="flex items-center justify-between pb-1 border-b border-black/20 text-[9px] font-extrabold uppercase text-slate-800">
                            <span>{currentStore?.name || 'ASSX TECH SUPERMERCADOS'}</span>
                            <span className="text-[8px] font-mono text-slate-500">GS1 ABNT</span>
                          </div>
                        )}

                        {/* Product Title */}
                        {currentTemplate?.elements.showProductName && (
                          <div className="pt-1">
                            <strong className="text-black font-extrabold text-[12px] leading-tight block line-clamp-2">
                              {prod.name}
                            </strong>
                            {currentTemplate?.elements.showSku && (
                              <span className="text-[9px] text-slate-600 font-mono block mt-0.5">
                                SKU: {prod.sku} · {prod.unit} {prod.brand ? `· ${prod.brand}` : ''}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price Block */}
                        {currentTemplate?.elements.showPrice && (
                          <div className="py-1">
                            {isPromo ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] text-slate-500 line-through font-mono block">
                                    De: R$ {prod.salePrice.toFixed(2)}
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-[9px] font-bold text-red-600">Por:</span>
                                    <span className="text-xl font-black text-red-600 font-mono tracking-tight">
                                      R$ {prod.promotionalPrice?.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                {currentTemplate?.elements.showDiscountBadge && (
                                  <span className="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded font-mono">
                                    -{Math.round(((prod.salePrice - (prod.promotionalPrice || prod.salePrice)) / prod.salePrice) * 100)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-baseline justify-between">
                                <span className="text-xl font-black text-black font-mono tracking-tight">
                                  R$ {prod.salePrice.toFixed(2)}
                                </span>
                                {currentTemplate?.elements.showPricePerKg && (
                                  <span className="text-[9px] font-semibold text-slate-600 font-mono">
                                    {formatUnitPrice(prod.salePrice, prod.unit, prod.weight, prod.volume) || ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Realistic SVG Barcode (EAN-13) */}
                        {currentTemplate?.elements.showBarcode && (
                          <div className="pt-1 flex flex-col items-center">
                            <svg width="220" height={isSmall ? "36" : "48"} className="overflow-visible">
                              {(() => {
                                const totalUnits = bits.length;
                                const barWidth = 220 / totalUnits;
                                let currentX = 0;
                                return bits.split('').map((bit, bIdx) => {
                                  const rect = bit === '1' ? (
                                    <rect
                                      key={bIdx}
                                      x={currentX}
                                      y={0}
                                      width={barWidth}
                                      height={isSmall ? 36 : 48}
                                      fill="#000000"
                                    />
                                  ) : null;
                                  currentX += barWidth;
                                  return rect;
                                });
                              })()}
                            </svg>
                            {currentTemplate?.elements.showBarcodeText && (
                              <span className="font-mono text-[9px] font-bold tracking-widest text-black mt-0.5">
                                {validEan}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Pagination between queue labels in preview */}
            {printQueue.length > 1 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-[#24445F]">
                <button
                  onClick={() => setPreviewPageIndex(prev => Math.max(0, prev - 1))}
                  disabled={previewPageIndex === 0}
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] rounded-lg disabled:opacity-30 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="text-[11px] font-mono text-slate-500">
                  Item {previewPageIndex + 1} de {printQueue.length}
                </span>
                <button
                  onClick={() => setPreviewPageIndex(prev => Math.min(printQueue.length - 1, prev + 1))}
                  disabled={previewPageIndex >= printQueue.length - 1}
                  className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] rounded-lg disabled:opacity-30 flex items-center gap-1"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: SUCCESS CONFIRMATION OF PRINT JOB */}
      {printJobSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-lg rounded-2xl shadow-2xl p-6 text-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${printJobSuccessModal.status === 'confirmed' ? 'bg-emerald-500/15 text-[#28B88C]' : 'bg-red-500/15 text-red-500'}`}>
                  {printJobSuccessModal.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {printJobSuccessModal.status === 'confirmed' ? 'Lote de Impressão Confirmado!' : 'Alerta: Falha Parcial na Impressão'}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">{printJobSuccessModal.jobCode}</span>
                </div>
              </div>
              <button onClick={() => setPrintJobSuccessModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50 dark:bg-[#1A2E44]/40 p-4 rounded-xl border border-slate-200 dark:border-[#24445F]">
              <div className="flex justify-between">
                <span className="text-slate-500">Total de Etiquetas:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{printJobSuccessModal.totalLabels}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Confirmadas pela Impressora:</span>
                <strong className="text-emerald-600 font-mono">{printJobSuccessModal.confirmedLabels}</strong>
              </div>
              {printJobSuccessModal.failedLabels > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-500 font-semibold">Pendentes / Falhas:</span>
                  <strong className="text-red-600 font-mono">{printJobSuccessModal.failedLabels}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Equipamento:</span>
                <span className="text-slate-800 dark:text-slate-200">{printJobSuccessModal.printerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Modelo Aplicado:</span>
                <span className="text-slate-800 dark:text-slate-200">{printJobSuccessModal.templateName}</span>
              </div>
              {printJobSuccessModal.failureReason && (
                <p className="text-[11px] text-red-500 pt-2 border-t border-slate-200 dark:border-[#24445F]">
                  {printJobSuccessModal.failureReason}
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              {printJobSuccessModal.failedLabels > 0 && (
                <button
                  onClick={() => {
                    handleRetryFailedItems(printJobSuccessModal.id);
                    setPrintJobSuccessModal(null);
                  }}
                  className="px-4 py-2 font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl"
                >
                  Repetir Somente Pendentes
                </button>
              )}
              <button
                onClick={() => setPrintJobSuccessModal(null)}
                className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ZPL RAW CODE VIEWER */}
      {zplModalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24445F]">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Instruções Térmicas ZPL II (Zebra Programming Language)
                </h3>
              </div>
              <button onClick={() => setZplModalContent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Copie este código para envio direto via porta TCP 9100 ou spooler térmico Zebra / Argox:
            </p>

            <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl max-h-64 overflow-y-auto overflow-x-auto select-all">
              {zplModalContent}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(zplModalContent);
                  setToastMessage({ type: 'success', text: 'Código ZPL copiado para a área de transferência!' });
                }}
                className="px-4 py-2 font-semibold bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" /> Copiar Código
              </button>
              <button
                onClick={() => setZplModalContent(null)}
                className="px-5 py-2 font-semibold text-white bg-[#28B88C] rounded-xl hover:bg-[#229c76]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PRINT JOB DETAILS */}
      {viewingJobDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-2xl rounded-2xl shadow-2xl p-6 text-xs space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24445F]">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Detalhes do Lote {viewingJobDetails.jobCode}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Emitido por {viewingJobDetails.userName} em {new Date(viewingJobDetails.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <button onClick={() => setViewingJobDetails(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-[#24445F] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#1A2E44] text-slate-500">
                  <tr>
                    <th className="py-2 px-3">Produto</th>
                    <th className="py-2 px-3">SKU</th>
                    <th className="py-2 px-3 text-right">Preço</th>
                    <th className="py-2 px-3 text-center">Cópias</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                  {viewingJobDetails.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{it.productName}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">{it.sku}</td>
                      <td className="py-2 px-3 text-right font-mono">R$ {it.salePrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.copies}</td>
                      <td className="py-2 px-3 text-center">
                        {it.printed ? (
                          <span className="text-[#28B88C] font-semibold text-[10px]">✓ Impresso</span>
                        ) : (
                          <span className="text-red-500 font-semibold text-[10px]">Falha / Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#24445F]">
              {viewingJobDetails.failedLabels > 0 && (
                <button
                  onClick={() => handleRetryFailedItems(viewingJobDetails.id)}
                  className="px-4 py-2 font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl"
                >
                  Repetir Pendentes
                </button>
              )}
              <button
                onClick={() => setViewingJobDetails(null)}
                className="px-5 py-2 font-semibold text-white bg-[#28B88C] rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTER CONFIGURATION MODAL */}
      <PrinterModal
        isOpen={isPrinterModalOpen}
        printer={editingPrinter}
        onClose={() => {
          setIsPrinterModalOpen(false);
          setEditingPrinter(null);
        }}
        onSaved={savedPrinter => {
          setPrinters(prev => {
            const exists = prev.some(p => p.id === savedPrinter.id);
            if (exists) {
              return prev.map(p => (p.id === savedPrinter.id ? savedPrinter : p));
            }
            return [...prev, savedPrinter];
          });
          if (savedPrinter.isDefault || !selectedPrinterId) {
            setSelectedPrinterId(savedPrinter.id);
          }
          setToastMessage({
            type: 'success',
            text: `Impressora "${savedPrinter.name}" configurada com sucesso!`,
          });
          loadAllLabelData();
        }}
        onDeleted={deletedId => {
          setPrinters(prev => prev.filter(p => p.id !== deletedId));
          if (selectedPrinterId === deletedId) {
            const next = printers.find(p => p.id !== deletedId);
            if (next) setSelectedPrinterId(next.id);
          }
          setToastMessage({
            type: 'info',
            text: 'Impressora removida com sucesso.',
          });
          loadAllLabelData();
        }}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === 'error'
              ? 'bg-red-600 text-white border-red-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-[#28B88C] text-white border-emerald-600'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <Info className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
