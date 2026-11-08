import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { api } from '../../services/api.ts';
import { UserProfile, OperatorPermissions, ModulePermissions, ActionPermissions } from '../../types/index.ts';
import {
  X,
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  Lock,
} from 'lucide-react';

interface OperatorModalProps {
  isOpen: boolean;
  operator: UserProfile | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  operator,
  onClose,
  onSaved,
}) => {
  const { stores, refreshAll } = useApp();
  const [activeTab, setActiveTab] = useState<'info' | 'modules' | 'actions'>('info');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('stockist');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modular permissions
  const [modules, setModules] = useState<ModulePermissions>({
    dashboard: false,
    products: true,
    movements: true,
    lots: true,
    losses: true,
    inventory: true,
    labels: true,
    purchases: false,
    transfers: true,
    suppliers: false,
    analytics: false,
    intelligence: false,
    reports: false,
    settings: false,
    operators: false,
  });

  // Action permissions
  const [actions, setActions] = useState<ActionPermissions>({
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canApprove: false,
    canCancel: false,
    canExport: false,
    canPrint: true,
    canEditMargin: false,
    canMove: true,
    canAdjustInventory: true,
    canApprovePurchases: false,
    canAudit: false,
  });

  const isEditingSuperAdmin = operator?.role === 'superadmin' || operator?.id === 'usr-super';

  useEffect(() => {
    if (operator) {
      setName(operator.name || '');
      setEmail(operator.email || '');
      setRole(operator.role || 'stockist');
      setJobTitle(operator.jobTitle || '');
      setDepartment(operator.department || '');
      setStatus(operator.status || 'active');
      setSelectedStores(operator.storeIds || (stores.length > 0 ? [stores[0].id] : []));

      if (operator.permissions) {
        setModules(operator.permissions.modules);
        setActions(operator.permissions.actions);
      }
    } else {
      // Create defaults
      setName('');
      setEmail('');
      setRole('stockist');
      setJobTitle('Supervisor de Estoque');
      setDepartment('Depósito & Câmaras Frias');
      setStatus('active');
      setSelectedStores(stores.map(s => s.id));
      applyRolePresets('stockist');
    }
    setError(null);
    setActiveTab('info');
  }, [operator, isOpen]);

  const applyRolePresets = (roleCode: string) => {
    const isSuper = roleCode === 'superadmin';
    setModules({
      dashboard: isSuper || ['manager', 'auditor'].includes(roleCode),
      products: true,
      movements: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      lots: isSuper || ['stockist', 'checker', 'manager', 'auditor'].includes(roleCode),
      losses: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      inventory: isSuper || ['stockist', 'manager', 'auditor'].includes(roleCode),
      labels: isSuper || ['stockist', 'checker', 'cashier', 'manager'].includes(roleCode),
      purchases: isSuper || ['buyer', 'checker', 'manager'].includes(roleCode),
      transfers: isSuper || ['stockist', 'manager'].includes(roleCode),
      suppliers: isSuper || ['buyer', 'manager'].includes(roleCode),
      analytics: isSuper || ['buyer', 'manager'].includes(roleCode),
      intelligence: isSuper || ['manager'].includes(roleCode),
      reports: isSuper || ['buyer', 'auditor', 'manager'].includes(roleCode),
      settings: isSuper,
      operators: isSuper,
    });

    setActions({
      canView: true,
      canCreate: isSuper || ['stockist', 'buyer', 'manager'].includes(roleCode),
      canEdit: isSuper || ['stockist', 'buyer', 'manager'].includes(roleCode),
      canDelete: isSuper || ['manager'].includes(roleCode),
      canApprove: isSuper || ['manager'].includes(roleCode),
      canCancel: isSuper || ['manager'].includes(roleCode),
      canExport: isSuper || ['buyer', 'auditor', 'manager'].includes(roleCode),
      canPrint: isSuper || ['stockist', 'checker', 'cashier', 'manager'].includes(roleCode),
      canEditMargin: isSuper || ['manager'].includes(roleCode),
      canMove: isSuper || ['stockist', 'checker', 'manager'].includes(roleCode),
      canAdjustInventory: isSuper || ['stockist', 'auditor', 'manager'].includes(roleCode),
      canApprovePurchases: isSuper || ['manager'].includes(roleCode),
      canAudit: isSuper || ['auditor', 'manager'].includes(roleCode),
    });
  };

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    applyRolePresets(newRole);

    const defaultJobTitles: Record<string, { title: string; dept: string }> = {
      superadmin: { title: 'Administrador Geral', dept: 'Diretoria & Administração' },
      stockist: { title: 'Supervisor de Estoque', dept: 'Depósito & Câmaras Frias' },
      buyer: { title: 'Comprador Sênior', dept: 'Central de Compras & Suprimentos' },
      checker: { title: 'Conferente de Mercadorias', dept: 'Doca de Recebimento' },
      auditor: { title: 'Auditor de Processos', dept: 'Auditoria & Compliance' },
      manager: { title: 'Gerente Geral', dept: 'Gestão Operacional' },
      cashier: { title: 'Operador de Caixa', dept: 'Frente de Caixa' },
    };

    if (defaultJobTitles[newRole] && (!jobTitle || jobTitle === 'Operador')) {
      setJobTitle(defaultJobTitles[newRole].title);
      setDepartment(defaultJobTitles[newRole].dept);
    }
  };

  const handleToggleModule = (key: keyof ModulePermissions) => {
    if (isEditingSuperAdmin) return;
    setModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAction = (key: keyof ActionPermissions) => {
    if (isEditingSuperAdmin) return;
    setActions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const permissions: OperatorPermissions = {
      modules: isEditingSuperAdmin ? applyAllPermissions(modules, true) : modules,
      actions: isEditingSuperAdmin ? applyAllPermissions(actions, true) : actions,
    };

    try {
      if (operator) {
        // Edit
        await api.updateUser(operator.id, {
          name: name.trim(),
          email: email.trim(),
          role,
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          status,
          storeIds: selectedStores,
          permissions,
        });
      } else {
        // Create
        await api.createUser({
          name: name.trim(),
          email: email.trim(),
          role,
          jobTitle: jobTitle.trim(),
          department: department.trim(),
          status,
          storeIds: selectedStores,
          permissions,
        });
      }

      await refreshAll();
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar operador.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyAllPermissions = (obj: any, val: boolean) => {
    const res: any = {};
    for (const k of Object.keys(obj)) {
      res[k] = val;
    }
    return res;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between bg-slate-50 dark:bg-[#1A2E44]/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#28B88C]/15 border border-[#28B88C]/30 text-[#28B88C] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {operator ? 'Editar Operador & Alçadas' : 'Cadastrar Novo Operador'}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Configuração centralizada de acesso gerida pelo Super Admin
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-[#24445F] flex gap-2 bg-white dark:bg-[#101D2B] shrink-0 text-xs font-bold overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`shrink-0 pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'info'
                ? 'border-[#28B88C] text-[#28B88C]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dados do Operador</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`shrink-0 pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'modules'
                ? 'border-[#28B88C] text-[#28B88C]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Módulos Autorizados</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`shrink-0 pb-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'actions'
                ? 'border-[#28B88C] text-[#28B88C]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Alçadas & Permissões</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEditingSuperAdmin && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs flex items-center gap-2.5">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Este é o Super Administrador Central. Possui acesso irrestrito protegido por regras de segurança do sistema.
              </span>
            </div>
          )}

          {/* TAB 1: DADOS DO OPERADOR */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    E-mail Institucional *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="carlos.silva@assxsuper.com.br"
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Perfil Base *
                  </label>
                  <select
                    disabled={isEditingSuperAdmin}
                    value={role}
                    onChange={e => handleRoleChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="superadmin">SUPERADMIN — Administrador Geral</option>
                    <option value="manager">MANAGER — Gerente Geral</option>
                    <option value="stockist">STOCKIST — Supervisor de Estoque</option>
                    <option value="buyer">BUYER — Comprador</option>
                    <option value="checker">CHECKER — Conferente de Mercadorias</option>
                    <option value="auditor">AUDITOR — Auditor de Processos</option>
                    <option value="cashier">CASHIER — Operador de Caixa</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cargo / Função Exibida
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Ex: Supervisor de Estoque"
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Setor / Lotação Operacional
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    placeholder="Ex: Depósito & Câmaras Frias"
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Status do Operador
                  </label>
                  <select
                    disabled={isEditingSuperAdmin}
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-[#1A2E44] border border-slate-300 dark:border-[#24445F] rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white font-medium focus:border-[#28B88C] focus:outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="active">Ativo (Acesso Liberado)</option>
                    <option value="inactive">Inativo (Acesso Bloqueado)</option>
                  </select>
                </div>
              </div>

              {/* Stores scope */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Unidades / Lojas Autorizadas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {stores.map(s => {
                    const isChecked = selectedStores.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-[#28B88C]/10 border-[#28B88C]/40 text-[#28B88C]'
                            : 'bg-slate-50 dark:bg-[#1A2E44]/50 border-slate-200 dark:border-[#24445F] text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedStores(selectedStores.filter(id => id !== s.id));
                            } else {
                              setSelectedStores([...selectedStores, s.id]);
                            }
                          }}
                          className="rounded text-[#28B88C] focus:ring-[#28B88C]"
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MÓDULOS AUTORIZADOS */}
          {activeTab === 'modules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#24445F]">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Visibilidade de Módulos no Menu Lateral
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Módulos desmarcados serão ocultados do menu e bloqueados na camada de rotas
                  </span>
                </div>
                {!isEditingSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModules(applyAllPermissions(modules, true))}
                      className="text-[10px] font-bold text-[#28B88C] hover:underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => setModules(applyAllPermissions(modules, false))}
                      className="text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'dashboard', label: 'Dashboard Executivo' },
                  { id: 'products', label: 'Produtos e Catálogo' },
                  { id: 'movements', label: 'Movimentações e Saldo' },
                  { id: 'lots', label: 'Lotes e Validades (FEFO)' },
                  { id: 'losses', label: 'Perdas e Avarias' },
                  { id: 'inventory', label: 'Inventário Físico' },
                  { id: 'labels', label: 'Impressão de Etiquetas' },
                  { id: 'purchases', label: 'Compras & Recebimento' },
                  { id: 'suppliers', label: 'Fornecedores' },
                  { id: 'transfers', label: 'Transferências Filiais' },
                  { id: 'analytics', label: 'Curva ABC & Reposição' },
                  { id: 'intelligence', label: 'ASSX Intelligence (IA)' },
                  { id: 'reports', label: 'Relatórios & Auditoria' },
                  { id: 'settings', label: 'Configurações do Sistema' },
                  { id: 'operators', label: 'Administração de Operadores' },
                ].map(item => {
                  const isChecked = Boolean(modules[item.id as keyof ModulePermissions]);
                  return (
                    <label
                      key={item.id}
                      onClick={() => handleToggleModule(item.id as keyof ModulePermissions)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#28B88C]/10 border-[#28B88C]/40 text-[#28B88C]'
                          : 'bg-slate-50 dark:bg-[#1A2E44]/40 border-slate-200 dark:border-[#24445F] text-slate-500'
                      }`}
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isEditingSuperAdmin}
                        readOnly
                        className="rounded text-[#28B88C] focus:ring-[#28B88C] cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ALÇADAS & AÇÕES */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#24445F]">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Permissões por Ação e Alçadas
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Controle de quais botões e operações o operador tem permissão para disparar
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'canView', label: 'Visualizar Registros e Listagens' },
                  { id: 'canCreate', label: 'Criar Novos Cadastros / Movimentações' },
                  { id: 'canEdit', label: 'Editar Registros Existentes' },
                  { id: 'canDelete', label: 'Excluir Registros do Banco' },
                  { id: 'canApprove', label: 'Aprovar Pedidos e Inventários' },
                  { id: 'canCancel', label: 'Cancelar Operações' },
                  { id: 'canExport', label: 'Exportar Relatórios (CSV/PDF)' },
                  { id: 'canPrint', label: 'Imprimir Etiquetas Térmicas e Documentos' },
                  { id: 'canEditMargin', label: 'Alterar Preços e Margens de Lucro' },
                  { id: 'canMove', label: 'Executar Movimentações de Estoque' },
                  { id: 'canAdjustInventory', label: 'Ajustar Inventário e Saldos' },
                  { id: 'canApprovePurchases', label: 'Alçada para Aprovar Pedidos de Compra' },
                  { id: 'canAudit', label: 'Consultar Trilha de Auditoria Total' },
                ].map(item => {
                  const isChecked = Boolean(actions[item.id as keyof ActionPermissions]);
                  return (
                    <label
                      key={item.id}
                      onClick={() => handleToggleAction(item.id as keyof ActionPermissions)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[#28B88C]/10 border-[#28B88C]/40 text-[#28B88C]'
                          : 'bg-slate-50 dark:bg-[#1A2E44]/40 border-slate-200 dark:border-[#24445F] text-slate-500'
                      }`}
                    >
                      <span className="leading-tight">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isEditingSuperAdmin}
                        readOnly
                        className="rounded text-[#28B88C] focus:ring-[#28B88C] cursor-pointer shrink-0 ml-2"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#24445F] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#28B88C] hover:bg-[#229e77] active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : operator ? 'Salvar Alterações' : 'Cadastrar Operador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
