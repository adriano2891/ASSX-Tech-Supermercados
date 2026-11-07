import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Store, Warehouse, UserProfile, RolePermission, SystemNotification, Product } from '../types/index.ts';

interface AppContextType {
  isDark: boolean;
  toggleTheme: () => void;
  stores: Store[];
  warehouses: Warehouse[];
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  currentStore?: Store;
  users: UserProfile[];
  currentUser: UserProfile;
  roles: RolePermission[];
  notifications: SystemNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  // Session & Authentication
  isAuthenticated: boolean;
  login: (userId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  canAccessModule: (moduleId: string) => boolean;
  canPerformAction: (actionKey: string) => boolean;
  // Scanner state
  isScannerOpen: boolean;
  openScanner: (onScanCallback?: (barcode: string) => void) => void;
  closeScanner: () => void;
  scannerCallback?: (barcode: string) => void;
  // Label modal
  labelProduct: Product | null;
  openLabelModal: (product: Product) => void;
  closeLabelModal: () => void;
  // Manual modal
  isManualOpen: boolean;
  openManual: () => void;
  closeManual: () => void;
  // Sidebar Collapse & Expand state
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('assx_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('assx_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('assx_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  // Stores & Warehouses
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string>('');

  // Users & Session
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isLoggedOut = localStorage.getItem('assx_logged_out');
      if (isLoggedOut === 'true') return false;
      const session = localStorage.getItem('assx_active_session');
      if (session) return true;
      // Default direct access for Super Admin on first launch
      return true;
    } catch {
      return true;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const sessionRaw = localStorage.getItem('assx_active_session');
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed.user) return parsed.user;
      }
    } catch {
      // ignore
    }
    return {
      id: 'usr-super',
      name: 'Roberto Alves (Super Admin)',
      email: 'roberto.alves@assxsuper.com.br',
      role: 'superadmin',
      jobTitle: 'Administrador Geral',
      department: 'Diretoria & Administração Geral',
      status: 'active',
      storeIds: ['store-01', 'store-02'],
    };
  });

  // Roles & Permissions
  const [roles, setRoles] = useState<RolePermission[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<((barcode: string) => void) | undefined>(undefined);

  // Label modal
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);

  // Manual modal
  const [isManualOpen, setIsManualOpen] = useState(false);
  const openManual = () => setIsManualOpen(true);
  const closeManual = () => setIsManualOpen(false);

  // Sidebar Collapse & Expand State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem(`assx_sidebar_collapsed_${currentUser?.id || 'usr-super'}`);
      if (savedUser !== null) return savedUser === 'true';
      const savedGlobal = localStorage.getItem('assx_sidebar_collapsed');
      if (savedGlobal !== null) return savedGlobal === 'true';
    } catch {
      // fallback
    }
    return false;
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // When currentUser changes, reload their personalized sidebar preference and set API header
  useEffect(() => {
    if (currentUser?.id) {
      api.setActiveUser(currentUser.id);
      try {
        const userPref = localStorage.getItem(`assx_sidebar_collapsed_${currentUser.id}`);
        if (userPref !== null) {
          setIsSidebarCollapsed(userPref === 'true');
        }
      } catch {
        // ignore storage errors
      }
    }
  }, [currentUser?.id]);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('assx_sidebar_collapsed', String(next));
        if (currentUser?.id) {
          localStorage.setItem(`assx_sidebar_collapsed_${currentUser.id}`, String(next));
        }
      } catch {
        // ignore
      }
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 320);
      return next;
    });
  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileSidebarOpen(prev => !prev);
    } else {
      toggleSidebarCollapse();
    }
  };

  const refreshAll = async () => {
    try {
      const [storesData, usersData, notifs, rolesData] = await Promise.all([
        api.getStores(),
        api.getUsers(),
        api.getNotifications(),
        api.getRoles(),
      ]);

      setStores(storesData.stores);
      setWarehouses(storesData.warehouses);
      if (!currentStoreId && storesData.stores.length > 0) {
        setCurrentStoreId(storesData.stores[0].id);
      }

      setUsers(usersData);
      setNotifications(notifs);
      setRoles(rolesData);

      // Re-validate active session user from latest db data
      if (currentUser?.id) {
        const matched = usersData.find(u => u.id === currentUser.id);
        if (matched) {
          if (matched.status === 'inactive') {
            // Operator was deactivated by Super Admin! Force logout.
            await logout();
          } else {
            setCurrentUser(matched);
            try {
              const currentSess = localStorage.getItem('assx_active_session');
              if (currentSess) {
                const parsed = JSON.parse(currentSess);
                parsed.user = matched;
                localStorage.setItem('assx_active_session', JSON.stringify(parsed));
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to load initial application state:', err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Login handler
  const login = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.login(userId);
      api.setActiveUser(res.user.id);
      setCurrentUser(res.user);
      setIsAuthenticated(true);

      // Persist session
      localStorage.setItem('assx_active_session', JSON.stringify({
        userId: res.user.id,
        user: res.user,
        token: res.token,
        loggedAt: new Date().toISOString(),
      }));
      localStorage.removeItem('assx_logged_out');

      // Refresh data
      await refreshAll();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha ao autenticar operador.' };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('assx_active_session');
      localStorage.setItem('assx_logged_out', 'true');
      setIsAuthenticated(false);
    }
  };

  // Granular module permission check
  const canAccessModule = (moduleId: string): boolean => {
    if (!currentUser) return false;
    // Superadmin has absolute unrestricted access to everything
    if (currentUser.role === 'superadmin') return true;

    // Check custom permissions on user profile
    if (currentUser.permissions?.modules && (currentUser.permissions.modules as any)[moduleId] !== undefined) {
      return Boolean((currentUser.permissions.modules as any)[moduleId]);
    }

    // Role-based presets fallback
    const roleCode = currentUser.role?.toLowerCase() || '';
    switch (roleCode) {
      case 'stockist':
        return ['products', 'movements', 'lots', 'losses', 'inventory', 'labels', 'transfers'].includes(moduleId);
      case 'buyer':
        return ['products', 'purchases', 'suppliers', 'analytics', 'reports'].includes(moduleId);
      case 'checker':
        return ['products', 'lots', 'purchases', 'labels'].includes(moduleId);
      case 'auditor':
        return ['dashboard', 'products', 'movements', 'lots', 'losses', 'inventory', 'reports'].includes(moduleId);
      case 'cashier':
        return ['products', 'labels'].includes(moduleId);
      case 'manager':
        return ['dashboard', 'products', 'movements', 'lots', 'losses', 'inventory', 'labels', 'purchases', 'transfers', 'suppliers', 'analytics', 'reports'].includes(moduleId);
      default:
        return ['products'].includes(moduleId);
    }
  };

  // Granular action permission check
  const canPerformAction = (actionKey: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'superadmin') return true;

    if (currentUser.permissions?.actions && (currentUser.permissions.actions as any)[actionKey] !== undefined) {
      return Boolean((currentUser.permissions.actions as any)[actionKey]);
    }

    const roleCode = currentUser.role?.toLowerCase() || '';
    switch (roleCode) {
      case 'stockist':
        return ['canView', 'canCreate', 'canEdit', 'canPrint', 'canMove', 'canAdjustInventory'].includes(actionKey);
      case 'buyer':
        return ['canView', 'canCreate', 'canEdit', 'canExport', 'canApprovePurchases'].includes(actionKey);
      case 'checker':
        return ['canView', 'canPrint', 'canMove'].includes(actionKey);
      case 'auditor':
        return ['canView', 'canExport', 'canAudit'].includes(actionKey);
      case 'manager':
        return ['canView', 'canCreate', 'canEdit', 'canApprove', 'canCancel', 'canExport', 'canPrint', 'canMove', 'canAdjustInventory', 'canApprovePurchases', 'canAudit', 'canEditMargin'].includes(actionKey);
      default:
        return ['canView'].includes(actionKey);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const openScanner = (callback?: (barcode: string) => void) => {
    setScannerCallback(() => callback);
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setScannerCallback(undefined);
  };

  const openLabelModal = (product: Product) => setLabelProduct(product);
  const closeLabelModal = () => setLabelProduct(null);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const currentStore = stores.find(s => s.id === currentStoreId) || stores[0];

  return (
    <AppContext.Provider
      value={{
        isDark,
        toggleTheme,
        stores,
        warehouses,
        currentStoreId,
        setCurrentStoreId,
        currentStore,
        users,
        currentUser,
        roles,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        refreshAll,
        isAuthenticated,
        login,
        logout,
        canAccessModule,
        canPerformAction,
        isScannerOpen,
        openScanner,
        closeScanner,
        scannerCallback,
        labelProduct,
        openLabelModal,
        closeLabelModal,
        isManualOpen,
        openManual,
        closeManual,
        isSidebarCollapsed,
        toggleSidebarCollapse,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleSidebar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
