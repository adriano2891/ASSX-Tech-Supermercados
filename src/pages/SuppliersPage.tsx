import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Supplier } from '../types/index.ts';
import {
  Users,
  Plus,
  Search,
  Star,
  Clock,
  Phone,
  Mail,
  MapPin,
  Edit2,
  X,
  Building2,
  FileText,
} from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const sups = await api.getSuppliers();
      setSuppliers(sups);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter(s =>
    !searchTerm ||
    s.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.corporateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.cnpj.includes(searchTerm) ||
    s.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Gestão de Fornecedores & Parceiros Comerciais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Cadastro de distribuidores, prazos médios de entrega (lead time), CNPJ e condições comerciais
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome fantasia, razão social, CNPJ ou contato..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C]"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(sup => (
          <div
            key={sup.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#28B88C] dark:hover:border-[#28B88C] transition-colors"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {sup.tradeName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    CNPJ: {sup.cnpj}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold font-mono">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{sup.rating.toFixed(1)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#28B88C] shrink-0" />
                  <span>Lead Time Médio: <strong>{sup.leadTimeDays} dias</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Condição: <strong>{sup.paymentTerms}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.phone} {sup.whatsapp && `· WhatsApp`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{sup.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sup.city}/{sup.state}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-[#24445F] flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Contato: {sup.contactName}</span>
              <button
                onClick={() => {
                  setEditingSupplier(sup);
                  setIsModalOpen(true);
                }}
                className="text-xs font-semibold text-[#28B88C] hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT SUPPLIER MODAL */}
      {isModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
};

// Sub-component: SupplierModal
const SupplierModal: React.FC<{
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ supplier, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    corporateName: supplier?.corporateName || '',
    tradeName: supplier?.tradeName || '',
    cnpj: supplier?.cnpj || '',
    stateRegistration: supplier?.stateRegistration || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    state: supplier?.state || 'SP',
    zipCode: supplier?.zipCode || '',
    contactName: supplier?.contactName || '',
    phone: supplier?.phone || '',
    whatsapp: supplier?.whatsapp || '',
    email: supplier?.email || '',
    paymentTerms: supplier?.paymentTerms || '30 DDL',
    leadTimeDays: supplier?.leadTimeDays || 4,
    rating: supplier?.rating || 5.0,
    notes: supplier?.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (supplier) {
        await api.updateSupplier(supplier.id, formData);
      } else {
        await api.createSupplier(formData);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {supplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome Fantasia *</label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={e => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Razão Social *</label>
              <input
                type="text"
                required
                value={formData.corporateName}
                onChange={e => setFormData({ ...formData, corporateName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">CNPJ *</label>
              <input
                type="text"
                required
                value={formData.cnpj}
                onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.stateRegistration}
                onChange={e => setFormData({ ...formData, stateRegistration: e.target.value })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contato Principal</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefone / Fixo</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail Comercial</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Prazo Médio de Entrega (Dias Lead Time) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.leadTimeDays}
                onChange={e => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 1 })}
                className="w-full font-mono px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Condições de Pagamento</label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="Ex: 28/35/42 DDL"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2E44] border border-slate-200 dark:border-[#24445F] rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#24445F] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 font-semibold text-white bg-[#28B88C] hover:bg-[#229c76] rounded-xl">
              {submitting ? 'Salvando...' : supplier ? 'Atualizar Fornecedor' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
