import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  Sun,
  Moon,
  Building2,
  Bell,
  ScanLine,
  CheckCircle,
  AlertTriangle,
  Menu,
  PanelLeft,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  activeModuleTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeModuleTitle }) => {
  const {
    isDark,
    toggleTheme,
    stores,
    currentStoreId,
    setCurrentStoreId,
    currentStore,
    currentUser,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    openScanner,
    isSidebarCollapsed,
    toggleSidebar,
    logout,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else {
      toggleSidebar();
    }
  };

  return (
    <header className="h-14 sm:h-16 w-full max-w-full px-2 sm:px-4 md:px-6 border-b border-slate-200 dark:border-[#24445F] bg-white/95 dark:bg-[#101D2B]/95 backdrop-blur-md flex items-center justify-between gap-1.5 sm:gap-3 md:gap-4 sticky top-0 z-30 transition-colors">
      {/* Zone 1: Brand & Toggle Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 min-w-0">
        <button
          onClick={handleToggle}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#24445F]/50 transition-colors cursor-pointer shrink-0"
          aria-label={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          title={isSidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 text-[#28B88C]" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <img
            src="/assets/official_logo.png"
            alt="ASSX Tech Supermercados"
            className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 object-contain rounded-lg drop-shadow-sm shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xs sm:text-sm md:text-base tracking-tight text-[#101D2B] dark:text-white whitespace-nowrap leading-tight">
              ASSX<span className="text-[#28B88C]">.TECH</span>
            </span>
            <span className="hidden md:inline text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 leading-none">
              Supermercados
            </span>
          </div>
        </div>

        {/* Active module title - only on large desktop screens to prevent mobile header crowding */}
        <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-[#24445F] mx-2 shrink-0" />
        <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px] xl:max-w-[220px]">
          {activeModuleTitle}
        </span>
      </div>

      {/* Zone 2: Navigation Breadcrumb, Unit Identification & Store Switcher */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        {/* Desktop-only toggle shortcut next to unit switcher */}
        <button
          onClick={toggleSidebar}
          title={isSidebarCollapsed ? "Expandir Barra Lateral" : "Recolher Barra Lateral (Tela Cheia)"}
          aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1A2E44] hover:bg-slate-200 dark:hover:bg-[#24445F] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#24445F] transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          {isSidebarCollapsed ? (
            <>
              <PanelLeft className="w-4 h-4 text-[#28B88C]" />
              <span>Expandir Menu</span>
            </>
          ) : (
            <>
              <Menu className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Recolher</span>
            </>
          )}
        </button>

        {/* Store selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-[#1A2E44] px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-200/80 dark:border-[#24445F] min-w-0 max-w-[105px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-[220px]">
          <Building2 className="w-3.5 h-3.5 text-[#28B88C] shrink-0" />
          <select
            value={currentStoreId}
            onChange={e => setCurrentStoreId(e.target.value)}
            className="text-[11px] sm:text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full truncate"
            aria-label="Selecionar Unidade ou Loja"
          >
            {stores.map(store => (
              <option key={store.id} value={store.id} className="bg-white dark:bg-[#101D2B] text-slate-900 dark:text-white">
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Barcode scanner action button - icon only on mobile, icon+label on sm+ */}
        <button
          onClick={() => openScanner()}
          title="Abrir Leitor de Código de Barras (Câmera / USB)"
          aria-label="Abrir Leitor de Código de Barras"
          className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1A2E44] hover:bg-slate-200 dark:hover:bg-[#24445F] text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-[#24445F] transition-colors whitespace-nowrap cursor-pointer shrink-0"
        >
          <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#28B88C] shrink-0" />
          <span className="hidden sm:inline">Scanner</span>
        </button>
      </div>

      {/* Zone 3: Controls (Notifications, Theme, User Role & Logout) */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Notifications toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors relative cursor-pointer"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
                <span className="font-bold text-sm text-slate-900 dark:text-white">Alertas Operacionais</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{unreadNotificationsCount} não lidos</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#24445F]/50 mt-2">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-slate-500 dark:text-slate-400">Nenhum alerta pendente.</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`py-2.5 px-1 flex gap-2.5 cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2E44]/50 transition-colors ${
                        !n.read ? 'font-semibold' : 'opacity-70'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'critical' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-[#28B88C]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-white leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          aria-label="Alternar tema"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* User profile card & Logout */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-1.5 p-1 sm:px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors text-left cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-[#24445F]"
            aria-label="Menu do Operador Ativo"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-[#24445F] to-[#101D2B] text-white flex items-center justify-center font-bold text-xs uppercase border border-[#28B88C]/40 shadow-xs shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden lg:block text-xs">
              <span className="font-bold text-slate-900 dark:text-white block leading-tight truncate max-w-[140px]">
                {currentUser.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-[#28B88C] uppercase font-bold tracking-wider">
                {currentUser.role}
              </span>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-72 bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl shadow-2xl p-4 z-50 text-xs">
              {/* Active Operator Header Info */}
              <div className="flex items-start gap-3 pb-3 border-b border-slate-200 dark:border-[#24445F]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#24445F] to-[#101D2B] border border-[#28B88C]/40 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-slate-900 dark:text-white block truncate leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                    {currentUser.email}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#28B88C]/15 text-[#28B88C] border border-[#28B88C]/30">
                      <ShieldCheck className="w-3 h-3" />
                      {currentUser.role.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Logado
                    </span>
                  </div>
                </div>
              </div>

              {/* Operator details */}
              <div className="py-2.5 border-b border-slate-200/80 dark:border-[#24445F]/70 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Cargo / Função:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {currentUser.jobTitle || (currentUser.role === 'superadmin' ? 'Administrador Geral' : 'Operador')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Setor:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {currentUser.department || 'Operações'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Unidade:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                    {currentStore?.name || 'Matriz Centro'}
                  </span>
                </div>
              </div>

              {/* Single Action: Sair do Sistema */}
              <div className="pt-2.5">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Encerrar Sessão Operacional?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Você está prestes a sair da conta do operador <strong>{currentUser.name}</strong>. Todas as operações salvas permanecem protegidas no Supabase. Para retornar, você deverá selecionar seu operador na tela de acesso.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setIsLogoutModalOpen(false);
                  await logout();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirmar e Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
