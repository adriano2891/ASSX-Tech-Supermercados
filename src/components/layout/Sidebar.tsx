import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClockAlert,
  ShoppingCart,
  TrendingDown,
  ClipboardCheck,
  Truck,
  Users,
  LineChart,
  Bot,
  FileText,
  Settings,
  X,
  BookOpen,
  Tag,
  PanelLeftClose,
  ChevronLeft,
  UserCog,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'movements'
  | 'lots'
  | 'losses'
  | 'inventory'
  | 'labels'
  | 'purchases'
  | 'transfers'
  | 'suppliers'
  | 'analytics'
  | 'intelligence'
  | 'reports'
  | 'settings'
  | 'operators';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const {
    currentUser,
    openManual,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    canAccessModule,
  } = useApp();

  const isMobileOpen = propIsOpen !== undefined ? propIsOpen : isMobileSidebarOpen;
  const handleClose = propOnClose || (() => setIsMobileSidebarOpen(false));

  const [restrictedNotice, setRestrictedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (restrictedNotice) {
      const timer = setTimeout(() => setRestrictedNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [restrictedNotice]);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  // All module groups are ALWAYS kept visible in the navigation tree
  const allMenuGroups = [
    {
      label: 'Visão Geral',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard Executivo', icon: LayoutDashboard },
        { id: 'intelligence' as NavTab, label: 'ASSX Intelligence', icon: Bot, highlight: true },
      ],
    },
    {
      label: 'Operações de Estoque',
      items: [
        { id: 'products' as NavTab, label: 'Catálogo de Produtos', icon: Package },
        { id: 'movements' as NavTab, label: 'Movimentações', icon: ArrowLeftRight },
        { id: 'lots' as NavTab, label: 'Lotes & FEFO Validades', icon: ClockAlert },
        { id: 'losses' as NavTab, label: 'Perdas & Avarias', icon: TrendingDown },
        { id: 'inventory' as NavTab, label: 'Inventário Físico', icon: ClipboardCheck },
        { id: 'labels' as NavTab, label: 'Impressão de Etiquetas', icon: Tag },
      ],
    },
    {
      label: 'Suprimentos & Logística',
      items: [
        { id: 'purchases' as NavTab, label: 'Compras & Recebimento', icon: ShoppingCart },
        { id: 'suppliers' as NavTab, label: 'Fornecedores', icon: Users },
        { id: 'transfers' as NavTab, label: 'Transferências Filiais', icon: Truck },
      ],
    },
    {
      label: 'Inteligência & Gestão',
      items: [
        { id: 'analytics' as NavTab, label: 'Curva ABC & Reposição', icon: LineChart },
        { id: 'reports' as NavTab, label: 'Relatórios & Auditoria', icon: FileText },
        { id: 'settings' as NavTab, label: 'Configurações & Backup', icon: Settings },
        { id: 'operators' as NavTab, label: 'Operadores & Acessos', icon: UserCog },
      ],
    },
  ];

  const menuGroups = allMenuGroups;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          onClick={handleClose}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          aria-label="Fechar menu lateral"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 bg-white dark:bg-[#101D2B] flex flex-col transition-all duration-300 ease-in-out ${
          /* Desktop behavior */
          isSidebarCollapsed
            ? 'lg:w-0 lg:min-w-0 lg:border-r-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none'
            : 'lg:w-64 lg:min-w-[16rem] lg:border-r border-slate-200 dark:border-[#24445F] lg:opacity-100 lg:pointer-events-auto'
        } ${
          /* Mobile behavior */
          isMobileOpen
            ? 'translate-x-0 w-64 border-r border-slate-200 dark:border-[#24445F] opacity-100 pointer-events-auto'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Fixed inner width prevents text/icon reflow jitter during width collapse */}
        <div className="w-64 min-w-[16rem] flex flex-col h-full shrink-0">
          {/* Sidebar Brand Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/official_logo.png"
                alt="ASSX Tech"
                className="h-9 w-auto max-h-9 object-contain rounded-lg drop-shadow-sm"
              />
              <div>
                <span className="font-extrabold text-sm tracking-tight text-[#101D2B] dark:text-white block leading-tight">
                  ASSX<span className="text-[#28B88C]">.TECH</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                  Supermercados
                </span>
              </div>
            </div>

            {/* Desktop collapse button */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
              title="Recolher barra lateral"
              aria-label="Recolher barra lateral"
            >
              <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-[#28B88C]" />
            </button>

            {/* Mobile close button */}
            <button
              onClick={handleClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A2E44] cursor-pointer"
              aria-label="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation list */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                  {group.label}
                </span>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isAllowed = isSuperAdmin || canAccessModule(item.id);
                  const isActive = currentTab === item.id && isAllowed;

                  if (isAllowed) {
                    // A. Módulo autorizado: cores normais, hover e seleção ativos
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          handleClose();
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                          isActive
                            ? 'bg-[#28B88C] text-white shadow-sm font-bold'
                            : item.highlight
                            ? 'text-teal-700 dark:text-[#28B88C] bg-teal-50 dark:bg-[#28B88C]/10 hover:bg-teal-100 dark:hover:bg-[#28B88C]/20'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            isActive ? 'text-white' : item.highlight ? 'text-[#28B88C]' : 'text-slate-400 dark:text-slate-400'
                          }`}
                        />
                        <span className="truncate flex-1 text-left">{item.label}</span>
                      </button>
                    );
                  }

                  // B. Módulo sem autorização: visível, cinza discreto, opacidade moderada e CADEADO à direita
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setRestrictedNotice(
                          `🔒 Acesso restrito a "${item.label}". Solicite ao Super Admin a liberação deste módulo.`
                        );
                      }}
                      title={`🔒 Acesso restrito a "${item.label}". Solicite ao Super Admin a liberação deste módulo.`}
                      aria-label={`${item.label} (Acesso Bloqueado)`}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-85 hover:bg-slate-100/60 dark:hover:bg-[#1A2E44]/40 cursor-not-allowed select-none transition-all group"
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 transition-colors" />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      <Lock
                        className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-auto"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Discreet feedback notification when clicking restricted modules */}
          {restrictedNotice && (
            <div className="mx-3 mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] leading-tight flex items-start gap-2 shadow-xs animate-in fade-in slide-in-from-bottom-2">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span className="flex-1">{restrictedNotice}</span>
              <button
                onClick={() => setRestrictedNotice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Footer info & Actions */}
          <div className="p-3 border-t border-slate-200 dark:border-[#24445F] space-y-2">
            {/* Collapse shortcut in footer for desktop */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex w-full items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2E44] hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              title="Recolher Menu Lateral"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Ocultar Menu Lateral</span>
            </button>

            <button
              onClick={() => {
                openManual();
                handleClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-[#28B88C]/15 hover:bg-[#28B88C]/25 text-[#28B88C] border border-[#28B88C]/30 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manual do Usuário (PDF)</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              <span>ASSX Core Engine</span>
              <span>v1.0-PRO</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
