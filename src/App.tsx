import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { BarcodeScannerModal } from './components/scanner/BarcodeScannerModal.tsx';
import { BarcodeLabelModal } from './components/labels/BarcodeLabelModal.tsx';
import { UserManualModal } from './components/manual/UserManualModal.tsx';

// Pages
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { StockMovementsPage } from './pages/StockMovementsPage.tsx';
import { LotsValidadesPage } from './pages/LotsValidadesPage.tsx';
import { PurchasesPage } from './pages/PurchasesPage.tsx';
import { LossesPage } from './pages/LossesPage.tsx';
import { InventoryPage } from './pages/InventoryPage.tsx';
import { TransfersPage } from './pages/TransfersPage.tsx';
import { SuppliersPage } from './pages/SuppliersPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { IntelligencePage } from './pages/IntelligencePage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { LabelsPage } from './pages/LabelsPage.tsx';
import { OperatorsPage } from './pages/OperatorsPage.tsx';

// Mobile Navigation Bar Icons
import {
  LayoutDashboard,
  Package,
  ClockAlert,
  Bot,
  ScanLine,
  ShieldAlert,
} from 'lucide-react';

const moduleTitles: Record<NavTab, string> = {
  dashboard: 'Dashboard Executivo',
  products: 'Catálogo de Produtos',
  movements: 'Movimentações de Estoque',
  lots: 'Lotes & Validades (FEFO)',
  purchases: 'Compras & Recebimento',
  losses: 'Perdas & Avarias',
  inventory: 'Inventário Físico',
  labels: 'Impressão de Etiquetas',
  transfers: 'Transferências Entre Lojas',
  suppliers: 'Gestão de Fornecedores',
  analytics: 'Curva ABC & Reposição',
  intelligence: 'ASSX Intelligence (IA)',
  reports: 'Relatórios & Auditoria',
  settings: 'Configurações & Backup',
  operators: 'Operadores & Permissões',
};

function MainLayout() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  const {
    currentUser,
    canAccessModule,
    isScannerOpen,
    closeScanner,
    scannerCallback,
    labelProduct,
    closeLabelModal,
    openScanner,
    isManualOpen,
    closeManual,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleSidebar,
  } = useApp();

  // If current operator loses access to the active module or logs in with restricted profile, redirect to first allowed module
  useEffect(() => {
    if (!canAccessModule(currentTab)) {
      const allModules: NavTab[] = [
        'dashboard',
        'products',
        'movements',
        'lots',
        'losses',
        'inventory',
        'labels',
        'purchases',
        'transfers',
        'suppliers',
        'analytics',
        'intelligence',
        'reports',
        'settings',
        'operators',
      ];
      const firstAllowed = allModules.find(m => canAccessModule(m)) || 'products';
      setCurrentTab(firstAllowed);
    }
  }, [currentUser?.id, currentTab]);

  const renderActiveModule = () => {
    // Security check: Guard against unauthorized module access
    if (!canAccessModule(currentTab)) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 text-center bg-white dark:bg-[#101D2B] border border-red-500/20 rounded-3xl shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Acesso Restrito pelo Super Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            O operador <strong>{currentUser.name}</strong> ({currentUser.jobTitle || currentUser.role}) não possui alçada para acessar o módulo <strong>{moduleTitles[currentTab]}</strong>. Contate o Administrador Central para solicitar liberação.
          </p>
          <button
            onClick={() => setCurrentTab('products')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#28B88C] hover:bg-[#229e77] transition-all cursor-pointer shadow-sm"
          >
            Ir para Módulo Autorizado
          </button>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentTab} />;
      case 'products':
        return <ProductsPage />;
      case 'movements':
        return <StockMovementsPage />;
      case 'lots':
        return <LotsValidadesPage />;
      case 'purchases':
        return <PurchasesPage onNavigate={setCurrentTab} />;
      case 'losses':
        return <LossesPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'labels':
        return <LabelsPage />;
      case 'transfers':
        return <TransfersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'intelligence':
        return <IntelligencePage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'operators':
        return <OperatorsPage />;
      default:
        return <ProductsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F5F8] dark:bg-[#0A121B] text-[#101D2B] dark:text-[#F2F5F8] flex flex-col font-sans transition-colors">
      <Header
        onToggleSidebar={toggleSidebar}
        activeModuleTitle={moduleTitles[currentTab] || 'ASSX Tech'}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-6 transition-all duration-300 w-full min-w-0">
          {renderActiveModule()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - only authorized icons shown */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white dark:bg-[#101D2B] border-t border-slate-200 dark:border-[#24445F] z-30 flex items-center justify-around px-2 shadow-lg no-print">
        {canAccessModule('dashboard') && (
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition-colors ${
              currentTab === 'dashboard' ? 'text-[#28B88C]' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Painel</span>
          </button>
        )}

        {canAccessModule('products') && (
          <button
            onClick={() => setCurrentTab('products')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition-colors ${
              currentTab === 'products' ? 'text-[#28B88C]' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            <span>Produtos</span>
          </button>
        )}

        {/* Center Scanner floating button */}
        <button
          onClick={() => openScanner()}
          className="flex flex-col items-center justify-center -mt-5 bg-[#28B88C] text-white w-11 h-11 rounded-full shadow-lg border-2 border-white dark:border-[#101D2B] hover:scale-105 transition-transform cursor-pointer"
        >
          <ScanLine className="w-5 h-5" />
        </button>

        {canAccessModule('lots') && (
          <button
            onClick={() => setCurrentTab('lots')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition-colors ${
              currentTab === 'lots' ? 'text-[#28B88C]' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ClockAlert className="w-4 h-4 mb-0.5" />
            <span>FEFO</span>
          </button>
        )}

        {canAccessModule('intelligence') && (
          <button
            onClick={() => setCurrentTab('intelligence')}
            className={`flex flex-col items-center justify-center p-1 text-[10px] font-semibold transition-colors ${
              currentTab === 'intelligence' ? 'text-[#28B88C]' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bot className="w-4 h-4 mb-0.5" />
            <span>IA</span>
          </button>
        )}
      </nav>

      {/* Global Modals */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={closeScanner}
        onSelectProduct={prod => {
          if (scannerCallback) {
            scannerCallback(prod.ean);
          } else {
            setCurrentTab('products');
          }
        }}
      />

      <BarcodeLabelModal
        product={labelProduct}
        onClose={closeLabelModal}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={closeManual}
      />
    </div>
  );
}

function RootRouter() {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainLayout />;
}

export default function App() {
  return (
    <AppProvider>
      <RootRouter />
    </AppProvider>
  );
}
