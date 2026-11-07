import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import { Store, Warehouse } from '../types/index.ts';
import {
  Building2,
  Database,
  Download,
  Upload,
  CheckCircle2,
  Plus,
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { stores, warehouses, refreshAll } = useApp();
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Toast notifications for user feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleExportBackup = () => {
    window.open(api.getBackupExportUrl(), '_blank');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: A restauração substituirá todos os dados do sistema pelo arquivo de backup selecionado. Deseja prosseguir?')) {
      return;
    }

    setIsRestoring(true);
    setBackupStatus(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.restoreBackup(json);
      setBackupStatus('Backup restaurado com sucesso! Recarregando sistema...');
      setTimeout(() => {
        refreshAll();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setBackupStatus(`Erro na restauração: ${err.message || 'Arquivo inválido'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Configurações da Plataforma & Segurança
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gerenciamento multiunidade (filiais e depósitos), parâmetros de infraestrutura, backup e integridade de dados
        </p>
      </div>

      {/* Redirect Hint to Centralized Operators Management */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#28B88C]/15 text-[#28B88C] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Gestão Centralizada de Operadores & Permissões
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              O controle de operadores, cargos, senhas e matriz de alçadas operacionais está centralizado no módulo oficial do sistema.
            </p>
          </div>
        </div>

        <a
          href="#operators"
          onClick={(e) => {
            e.preventDefault();
            // Dispatch navigation to operators tab if handled by hash or history
            window.location.hash = '#operators';
            window.dispatchEvent(new HashChangeEvent('hashchange'));
          }}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-[#28B88C] hover:text-white dark:hover:bg-[#28B88C] transition-all flex items-center gap-1.5 shrink-0 border border-slate-200 dark:border-[#24445F] cursor-pointer"
        >
          <span>Ir para Gestão de Operadores</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: STORES & WAREHOUSES */}
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#24445F]">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-[#28B88C]" />
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Unidades & Filiais Cadastradas</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Arquitetura multi-loja escalável</p>
              </div>
            </div>
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Filial
            </button>
          </div>

          <div className="space-y-3">
            {stores.map(st => {
              const storeWhs = warehouses.filter(w => w.storeId === st.id);
              return (
                <div key={st.id} className="p-4 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 dark:text-white text-sm">{st.name}</strong>
                        {st.isMain && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/10 text-blue-500 font-bold uppercase">
                            Matriz
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        CNPJ: {st.cnpj} · Fuso: {st.timezone}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                      {st.code}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {st.address} - {st.city}/{st.state}
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-[#24445F]/50 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Depósitos:</span>
                    {storeWhs.map(w => (
                      <span key={w.id} className="px-2 py-0.5 rounded text-[10px] bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] font-mono">
                        {w.name} ({w.code})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: BACKUP & CONTINUITY */}
        <div className="bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-[#24445F]">
            <Database className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Backup & Continuidade dos Dados</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Exportação atômica e restauração completa de emergência</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-2">
              <strong className="text-slate-900 dark:text-white block">Download de Backup Integral</strong>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                Gera um snapshot JSON estruturado de todas as tabelas (produtos, saldos, lotes, movimentações, compras, perdas e auditoria).
              </p>
              <button
                onClick={handleExportBackup}
                className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Exportar Backup JSON (.json)
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-[#1A2E44]/40 rounded-xl border border-slate-200 dark:border-[#24445F] space-y-2">
              <strong className="text-slate-900 dark:text-white block">Restauração de Backup</strong>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                Restaura o banco de dados a partir de um arquivo salvo previamente, gravando registro na trilha de auditoria.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2E44] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#24445F] cursor-pointer transition-colors border border-slate-300 dark:border-[#24445F]">
                <Upload className="w-4 h-4" />
                <span>{isRestoring ? 'Processando Restauração...' : 'Carregar Arquivo de Backup'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>

              {backupStatus && (
                <div className={`p-2.5 rounded-lg text-[11px] mt-2 font-medium ${
                  backupStatus.includes('Erro')
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-[#28B88C]/10 text-[#28B88C]'
                }`}>
                  {backupStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE STORE MODAL */}
      {isStoreModalOpen && (
        <CreateStoreModal
          onClose={() => setIsStoreModalOpen(false)}
          onSuccess={() => {
            setIsStoreModalOpen(false);
            refreshAll();
          }}
        />
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
          toast.type === 'error'
            ? 'bg-red-600 text-white border-red-700 shadow-red-900/30'
            : toast.type === 'info'
            ? 'bg-blue-600 text-white border-blue-700 shadow-blue-900/30'
            : 'bg-[#28B88C] text-white border-emerald-600 shadow-emerald-900/30'
        }`}>
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 p-0.5 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// Sub-component: CreateStoreModal
const CreateStoreModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    cnpj: '',
    address: '',
    city: 'São Paulo',
    state: 'SP',
    timezone: 'America/Sao_Paulo',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createStore(formData);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar filial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-md rounded-2xl shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24445F]">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Cadastrar Nova Filial / Unidade</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome da Loja *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: ASSX Supermercados - Filial Morumbi"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sigla / Código *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: LJ-03"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">CNPJ da Filial *</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="12.345.678/0003-52"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Estado</label>
              <input
                type="text"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44] rounded-xl cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl cursor-pointer">
              {submitting ? 'Cadastrando...' : 'Cadastrar Unidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
