import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { UserProfile, AuditLog } from '../types/index.ts';
import { OperatorModal } from '../components/operators/OperatorModal.tsx';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  KeyRound,
  History,
  ShieldAlert,
  ArrowUpDown,
  Building2,
  Sparkles,
} from 'lucide-react';

export const OperatorsPage: React.FC = () => {
  const { users, currentUser, refreshAll } = useApp();

  const [activeTab, setActiveTab] = useState<'operators' | 'audit'>('operators');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<UserProfile | null>(null);

  const [operatorToDelete, setOperatorToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await api.getAuditLogs(100);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleToggleStatus = async (op: UserProfile) => {
    if (op.role === 'superadmin' || op.id === 'usr-super') {
      showToast('O perfil Super Administrador está protegido e não pode ser desativado.');
      return;
    }

    const newStatus = op.status === 'inactive' ? 'active' : 'inactive';
    try {
      await api.updateUserStatus(op.id, newStatus);
      await refreshAll();
      showToast(`Status do operador ${op.name} alterado para ${newStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteOperator = async () => {
    if (!operatorToDelete) return;
    if (operatorToDelete.role === 'superadmin' || operatorToDelete.id === 'usr-super') {
      showToast('O perfil Super Administrador está protegido e não pode ser excluído.');
      setOperatorToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteUser(operatorToDelete.id);
      await refreshAll();
      showToast(`Operador ${operatorToDelete.name} removido com sucesso.`);
    } catch (err: any) {
      showToast(err.message || 'Erro ao remover operador.');
    } finally {
      setIsDeleting(false);
      setOperatorToDelete(null);
    }
  };

  // Filtered operators
  const filteredOperators = users.filter(op => {
    const matchesSearch =
      op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.department || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || op.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (op.status || 'active') === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return { label: 'SUPER ADMIN', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'stockist':
        return { label: 'SUPERVISOR ESTOQUE', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      case 'buyer':
        return { label: 'COMPRADOR', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'checker':
        return { label: 'CONFERENTE DOCA', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
      case 'auditor':
        return { label: 'AUDITOR', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
      case 'manager':
        return { label: 'GERENTE GERAL', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
      default:
        return { label: role?.toUpperCase() || 'OPERADOR', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  const countAuthorizedModules = (op: UserProfile): number => {
    if (op.role === 'superadmin') return 15;
    if (op.permissions?.modules) {
      return Object.values(op.permissions.modules).filter(Boolean).length;
    }
    return 6;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#101D2B] text-white border border-[#28B88C]/40 shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-[#28B88C] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#24445F]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Administração Central de Operadores & Permissões
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie operadores, cargos, alçadas granulares por módulo, bloqueios e trilha de auditoria no Supabase.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedOperator(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#28B88C] hover:bg-[#229e77] active:scale-95 transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Operador</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total de Operadores
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {users.length}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">Registrados no Supabase</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Operadores Ativos
          </span>
          <span className="text-2xl font-black text-[#28B88C] mt-1 block">
            {users.filter(u => u.status !== 'inactive').length}
          </span>
          <span className="text-[10px] text-emerald-500 mt-1 block">Acesso operacional liberado</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Super Admin Protegido
          </span>
          <span className="text-2xl font-black text-purple-500 mt-1 block">
            {users.filter(u => u.role === 'superadmin').length}
          </span>
          <span className="text-[10px] text-purple-400 mt-1 block">Alçada irrestrita</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Sessão Atual
          </span>
          <span className="text-base font-black text-slate-900 dark:text-white mt-1 block truncate">
            {currentUser.name.split(' ')[0]}
          </span>
          <span className="text-[10px] text-emerald-500 mt-1 block">Conectado com Super Admin</span>
        </div>
      </div>

      {/* Tabs Switcher: Operadores vs Auditoria */}
      <div className="flex border-b border-slate-200 dark:border-[#24445F] gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('operators')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'operators'
              ? 'border-[#28B88C] text-[#28B88C]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Operadores & Permissões ({filteredOperators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-[#28B88C] text-[#28B88C]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Acessos & Auditoria</span>
        </button>
      </div>

      {/* TAB 1: OPERATORS LIST */}
      {activeTab === 'operators' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por operador, e-mail, cargo ou setor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#28B88C] focus:outline-none"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Perfil:</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Perfis</option>
                <option value="superadmin">SUPERADMIN</option>
                <option value="stockist">STOCKIST</option>
                <option value="buyer">BUYER</option>
                <option value="checker">CHECKER</option>
                <option value="auditor">AUDITOR</option>
                <option value="manager">MANAGER</option>
                <option value="cashier">CASHIER</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs font-semibold bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#24445F] bg-slate-50/80 dark:bg-[#1A2E44]/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Cargo & Setor</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4 text-center">Módulos</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/50">
                  {filteredOperators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhum operador encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOperators.map(op => {
                      const isSuper = op.role === 'superadmin' || op.id === 'usr-super';
                      const badge = getRoleBadge(op.role);
                      const isActive = (op.status || 'active') === 'active';

                      return (
                        <tr
                          key={op.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-[#1A2E44]/30 transition-colors"
                        >
                          {/* Operador Column */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#24445F] to-[#101D2B] border border-[#28B88C]/30 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {op.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white block truncate leading-tight">
                                  {op.name}
                                </span>
                                <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                                  {op.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Cargo & Setor */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {op.jobTitle || 'Operador'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {op.department || op.scopeLocation || 'Operações'}
                            </span>
                          </td>

                          {/* Perfil */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wider uppercase ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </td>

                          {/* Módulos Liberados */}
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1A2E44] px-2 py-1 rounded-lg">
                              <KeyRound className="w-3 h-3 text-[#28B88C]" />
                              {countAuthorizedModules(op)}/15
                            </span>
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3 px-4 text-center">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Ativo (Fixado)
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(op)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                                }`}
                                title="Clique para alternar o status do operador"
                              >
                                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                <span>{isActive ? 'Ativo' : 'Inativo'}</span>
                              </button>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedOperator(op);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
                                title="Editar operador e configurar permissões"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {!isSuper && (
                                <button
                                  onClick={() => setOperatorToDelete(op)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Remover operador"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT & SESSIONS LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl shadow-xs overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Trilha de Auditoria & Registro de Acessos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log imutável de logins, encerramentos de sessão, alterações de alçadas e ativações.
              </p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="text-xs font-semibold text-[#28B88C] hover:underline cursor-pointer"
            >
              Atualizar Logs
            </button>
          </div>

          {isLoadingAudit ? (
            <p className="py-8 text-center text-xs text-slate-400">Carregando trilha de auditoria...</p>
          ) : auditLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#24445F] text-slate-400 text-[10px] font-bold uppercase">
                    <th className="py-2.5 px-3">Data & Hora</th>
                    <th className="py-2.5 px-3">Operador</th>
                    <th className="py-2.5 px-3">Ação</th>
                    <th className="py-2.5 px-3">Módulo</th>
                    <th className="py-2.5 px-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#24445F]/40">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1A2E44]/20">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {log.userName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                            log.action === 'LOGIN'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : log.action === 'LOGOUT'
                              ? 'bg-slate-500/15 text-slate-600 dark:text-slate-300'
                              : log.action === 'PERMISSIONS_UPDATE' || log.action === 'USER_CREATE'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {log.module}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Operator Modal (Create & Edit) */}
      <OperatorModal
        isOpen={isModalOpen}
        operator={selectedOperator}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => showToast('Operador salvo com sucesso!')}
      />

      {/* Delete Confirmation Modal */}
      {operatorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Remover Operador do Sistema?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Tem certeza que deseja remover o operador <strong>{operatorToDelete.name}</strong> ({operatorToDelete.email})? Os registros históricos e movimentações realizadas anteriormente serão preservados na trilha de auditoria.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setOperatorToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteOperator}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Removendo...' : 'Confirmar Remoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
