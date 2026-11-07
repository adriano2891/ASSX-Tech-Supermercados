import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { users, login, refreshAll } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>('usr-super');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeOperators = users.length > 0 ? users.filter(u => u.status !== 'inactive') : [];
  const selectedOperator = activeOperators.find(u => u.id === selectedUserId) || activeOperators[0];

  const handleLogin = async (userIdToLogin?: string) => {
    const targetId = userIdToLogin || selectedUserId;
    if (!targetId) return;

    setIsLoading(true);
    setErrorMessage(null);

    const result = await login(targetId);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Não foi possível acessar com este operador.');
    }
  };

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

  return (
    <div className="min-h-screen bg-[#0A121B] text-[#F2F5F8] flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#28B88C]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#24445F]/20 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#24445F]/40 bg-[#101D2B]/60 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <img
            src="/assets/official_logo.png"
            alt="ASSX Tech Supermercados"
            className="h-10 w-auto object-contain drop-shadow-md rounded-lg"
          />
          <div>
            <span className="font-black text-lg tracking-tight text-white block leading-tight">
              ASSX<span className="text-[#28B88C]">.TECH</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
              Supermercados
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-[#1A2E44]/50 border border-[#24445F] px-3 py-1.5 rounded-xl">
          <Building2 className="w-3.5 h-3.5 text-[#28B88C]" />
          <span>Ambiente Integrado Supabase</span>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div className="w-full max-w-lg bg-[#101D2B] border border-[#24445F] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#24445F]/60 to-[#101D2B] border border-[#28B88C]/30 shadow-md mb-3">
              <img
                src="/assets/official_logo.png"
                alt="Logo ASSX Tech"
                className="h-14 w-auto object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ASSX Tech Supermercados
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Acesso ao sistema de gestão operacional
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Controls */}
          <div className="space-y-4">
            {/* Operator Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Identificação do Operador
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full bg-[#1A2E44] border border-[#24445F] focus:border-[#28B88C] rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none transition-colors cursor-pointer"
                >
                  {activeOperators.map(op => (
                    <option key={op.id} value={op.id} className="bg-[#101D2B] text-white py-2">
                      {op.name} — {op.jobTitle || op.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Operator Detailed Card */}
            {selectedOperator && (
              <div className="p-4 rounded-2xl bg-[#1A2E44]/60 border border-[#24445F] flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#24445F] to-[#101D2B] border border-[#28B88C]/40 flex items-center justify-center font-extrabold text-base text-white shadow-sm shrink-0">
                  {selectedOperator.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">
                      {selectedOperator.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {selectedOperator.email}
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                        getRoleBadge(selectedOperator.role).color
                      }`}
                    >
                      {getRoleBadge(selectedOperator.role).label}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {selectedOperator.department || selectedOperator.scopeLocation || 'Operações'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Access Notification & Future Password Placeholder */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-700/60 text-xs space-y-1">
              <div className="flex items-center gap-2 text-slate-300 font-semibold">
                <Lock className="w-3.5 h-3.5 text-[#28B88C]" />
                <span>Configuração Provisória — Acesso Direto</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Autenticação direta sem solicitação de senha ativa pelo Super Admin para agilidade operacional. A infraestrutura para validação de credenciais individuais já está pré-configurada.
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => handleLogin()}
              disabled={isLoading || !selectedOperator}
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#28B88C] hover:bg-[#229e77] active:scale-[0.99] transition-all shadow-lg shadow-[#28B88C]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>Conectando ao sistema...</span>
              ) : (
                <>
                  <span>ACESSAR SISTEMA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Direct Superadmin 1-Click Fast Access */}
            <div className="pt-2 text-center">
              <button
                onClick={() => handleLogin('usr-super')}
                className="text-xs font-semibold text-slate-400 hover:text-[#28B88C] transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#28B88C]" />
                <span>Entrada Rápida Direta: Super Administrador</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-[#24445F]/30 bg-[#101D2B]/40 relative z-10">
        <span>ASSX Core Engine v1.0-PRO • Controle Central de Operadores & Permissões • Supabase RLS</span>
      </footer>
    </div>
  );
};
