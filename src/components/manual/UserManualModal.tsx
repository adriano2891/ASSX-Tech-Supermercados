import React, { useState } from 'react';
import { generateUserManualPdf } from '../../utils/generateUserManualPdf.ts';
import {
  FileText,
  Download,
  X,
  BookOpen,
  LayoutDashboard,
  Bot,
  Package,
  ArrowLeftRight,
  ClockAlert,
  ShoppingCart,
  TrendingDown,
  ClipboardCheck,
  Truck,
  Users,
  LineChart,
  Settings,
  ScanLine,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('intro');

  if (!isOpen) return null;

  const handleDownload = () => {
    setDownloading(true);
    try {
      generateUserManualPdf();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Erro ao gerar PDF do manual.');
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const sections = [
    { id: 'intro', label: '1. Apresentação & Arquitetura', icon: BookOpen },
    { id: 'dashboard', label: 'Aba: Dashboard Executivo', icon: LayoutDashboard },
    { id: 'intelligence', label: 'Aba: ASSX Intelligence (IA)', icon: Bot },
    { id: 'products', label: 'Aba: Catálogo de Produtos', icon: Package },
    { id: 'movements', label: 'Aba: Movimentações & Estoque', icon: ArrowLeftRight },
    { id: 'lots', label: 'Aba: Lotes & FEFO Validades', icon: ClockAlert },
    { id: 'purchases', label: 'Aba: Compras & Recebimento', icon: ShoppingCart },
    { id: 'losses', label: 'Aba: Perdas & Desperdícios', icon: TrendingDown },
    { id: 'inventory', label: 'Aba: Inventário & Contagem', icon: ClipboardCheck },
    { id: 'transfers', label: 'Aba: Transferências Multi-Loja', icon: Truck },
    { id: 'suppliers', label: 'Aba: Fornecedores & Parceiros', icon: Users },
    { id: 'analytics', label: 'Aba: Curva ABC & Reposição', icon: LineChart },
    { id: 'reports', label: 'Aba: Relatórios & Auditoria', icon: FileText },
    { id: 'settings', label: 'Aba: Configurações & Backup', icon: Settings },
    { id: 'tools', label: 'Scanner & Etiquetas de Preço', icon: ScanLine },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-xs no-print">
      <div className="bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Topbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#24445F] flex items-center justify-between bg-slate-50 dark:bg-[#1A2E44]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#28B88C]/15 text-[#28B88C]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg text-slate-900 dark:text-white leading-tight">
                Manual do Usuário & Guia Operacional
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Significado de cada módulo, regras de negócio e procedimentos operacionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Gerando PDF...' : 'Baixar Manual em PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-[#24445F]/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Split: Sidebar Navigator + Article Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Index Sidebar */}
          <div className="hidden md:block w-64 border-r border-slate-200 dark:border-[#24445F] p-3 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-[#0A121B]/40 text-xs">
            <span className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Índice do Manual
            </span>
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-medium transition-colors ${
                    isActive
                      ? 'bg-[#28B88C] text-white font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2E44]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.label}</span>
                </button>
              );
            })}
          </div>

          {/* Document Content View */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {/* Download CTA Banner */}
            <div className="p-4 rounded-xl bg-[#28B88C]/10 border border-[#28B88C]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <strong className="text-[#28B88C] font-bold text-sm block">Manual Pronto para Download</strong>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                  Baixe o documento completo em PDF formatado no padrão A4 com cabeçalho corporativo, numeração de páginas e instruções operacionais.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#28B88C] text-white hover:bg-[#229c76] transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Baixar Arquivo PDF (.pdf)
              </button>
            </div>

            {/* Section 1: Intro */}
            <div className="space-y-3 pb-6 border-b border-slate-200 dark:border-[#24445F]">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/50 border border-slate-200 dark:border-[#24445F]">
                <img
                  src="/assets/official_logo.png"
                  alt="ASSX Tech Supermercados"
                  className="h-14 w-auto object-contain rounded-xl drop-shadow-sm"
                />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    ASSX Tech Supermercados
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tecnologia que facilita suas compras — Gestão Integrada de Estoque, Lotes e Operações.
                  </p>
                </div>
              </div>

              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pt-1">
                <BookOpen className="w-4 h-4 text-[#28B88C]" /> 1. Apresentação da Plataforma ASSX Tech
              </h4>
              <p>
                A plataforma <strong>ASSX Tech Supermercados</strong> é uma solução empresarial projetada especificamente para o controle rigoroso de estoque, custos, compras e validades de supermercados e atacarejos.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                  <strong className="text-slate-900 dark:text-white block">Prevenção Contra Saldo Negativo</strong>
                  <p className="text-[11px] text-slate-500 mt-1">O sistema impede saídas além do estoque físico real, eliminando divergências fictícias.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                  <strong className="text-slate-900 dark:text-white block">Rastreamento FEFO de Lotes</strong>
                  <p className="text-[11px] text-slate-500 mt-1">Mercadorias com validade mais curta são priorizadas na saída para evitar perdas financeiras.</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-[#1A2E44]/50 rounded-xl border border-slate-200 dark:border-[#24445F]">
                  <strong className="text-slate-900 dark:text-white block">Inteligência Artificial (IA)</strong>
                  <p className="text-[11px] text-slate-500 mt-1">Integração nativa com Gemini 3.8 Flash para auditoria cognitiva e cálculo de reposição.</p>
                </div>
              </div>
            </div>

            {/* Section 2: Detailed Tabs */}
            <div className="space-y-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                2. O Que Significa Cada Aba & Procedimento de Uso
              </h3>

              {/* Aba 1 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 1: Dashboard Executivo</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> É a visão panorâmica da saúde do supermercado. Consolida o total de produtos cadastrados, as unidades físicas em estoque, o valor financeiro do estoque a preço de custo ponderado e o potencial de venda.
                </p>
                <p>
                  <strong>Como usar:</strong> Verifique diariamente os cards de alerta de produtos críticos e lotes próximos do vencimento. Use os botões de atalho no canto superior para registrar movimentações ou abrir o scanner óptico.
                </p>
              </div>

              {/* Aba 2 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 2: ASSX Intelligence (IA)</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Módulo de inteligência operacional que analisa em tempo real os dados reais do estoque com o modelo Gemini 3.8 Flash.
                </p>
                <p>
                  <strong>Como usar:</strong> Clique nos botões de perguntas sugeridas (como "Risco de Ruptura" ou "Capital Imobilizado") ou digite dúvidas como <em>"Quais fornecedores tiveram maiores prazos de entrega?"</em>.
                </p>
              </div>

              {/* Aba 3 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 3: Catálogo de Produtos</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> O cadastro mestre de todos os itens vendidos. Contém código interno, SKU, código de barras oficial EAN-13/GTIN, preço de custo, preço de venda, margem de lucro e parâmetros de estoque mínimo/máximo.
                </p>
                <p>
                  <strong>Como usar:</strong> Para adicionar um produto, clique em "Novo Produto". Para gerar e imprimir etiquetas de gôndola ou adesivos térmicos para prateleiras, clique no ícone de código de barras na linha do produto.
                </p>
              </div>

              {/* Aba 4 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 4: Movimentações de Estoque</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> O livro-caixa físico do supermercado. Toda entrada por compra, ajuste de contagem, saída para balcão ou descarte é registrado com saldo anterior e posterior.
                </p>
                <p>
                  <strong>Como usar:</strong> Clique em "Registrar Movimentação", selecione o produto, o depósito (Geral, Câmara Fria, Balcão), a quantidade e o motivo com documento fiscal.
                </p>
              </div>

              {/* Aba 5 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <ClockAlert className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 5: Lotes & FEFO Validades</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Controle individual por lote de fabricação. Aplica a regra sanitária FEFO (First Expire, First Out), alertando prazos de 30 dias e 7 dias antes do vencimento.
                </p>
                <p>
                  <strong>Como usar:</strong> Identifique os lotes em faixa vermelha (urgente) e aplique precificação promocional de queima de estoque ou efetue a baixa de descarte autorizada pelo botão correspondente.
                </p>
              </div>

              {/* Aba 6 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 6: Compras & Recebimento Físico</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Fluxo completo de suprimentos. Emissão de pedidos para distribuidores e conferência na doca no momento do descarregamento.
                </p>
                <p>
                  <strong>Como usar:</strong> Emita a ordem em "Novo Pedido de Compra". Ao descarregar a mercadoria, clique em "Conferência / Receber", confira itens físicos versus nota fiscal, cadastre o lote recebido e confirme para atualizar o estoque.
                </p>
              </div>

              {/* Aba 7 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 7: Perdas, Avarias & Desperdícios</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Central de apuração de prejuízos operacionais (quebras de vidros, embalagens estufadas, descarte por validade e desvios).
                </p>
                <p>
                  <strong>Como usar:</strong> Clique em "Registrar Nova Perda", indique o produto danificado, a quantidade e o motivo. O valor do prejuízo é calculado automaticamente a preço de custo.
                </p>
              </div>

              {/* Aba 8 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 8: Inventário Físico & Contagem</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Auditoria física das prateleiras. Permite congelar os saldos do sistema para comparar com a contagem manual ou por leitor óptico.
                </p>
                <p>
                  <strong>Como usar:</strong> Abra uma sessão, insira as quantidades contadas na loja física. O sistema calcula as divergências e, ao clicar em "Aprovar & Reconciliar", ajusta o estoque e gera log de auditoria.
                </p>
              </div>

              {/* Aba 9 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 9: Transferências Entre Filiais</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Movimentação de mercadorias entre lojas da rede com controle de carga em trânsito.
                </p>
                <p>
                  <strong>Como usar:</strong> Crie a transferência selecionando a loja de origem e destino. Enquanto o caminhão viaja, o saldo fica como "Em Trânsito". No destino, o operador clica em "Confirmar Recebimento".
                </p>
              </div>

              {/* Aba 10 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 10: Fornecedores & Parceiros</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Diretório de distribuidores e fabricantes, contendo CNPJ, telefone, e-mail comercial, condições de pagamento e prazo médio de entrega (Lead Time).
                </p>
                <p>
                  <strong>Como usar:</strong> Mantenha os dados e contatos atualizados para facilitar a cotação e negociação de prazos e descontos.
                </p>
              </div>

              {/* Aba 11 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 11: Curva ABC & Reposição Inteligente</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Análise de Pareto das vendas (Produtos Classe A geram ~80% do retorno) combinada com motor de cálculo de Ponto de Pedido: <em>PP = (Consumo Diário &times; Lead Time) + Estoque de Segurança</em>.
                </p>
                <p>
                  <strong>Como usar:</strong> Verifique os produtos em alerta e clique em "Gerar Pedido" para abastecer o supermercado antes de ocorrer a ruptura na gôndola.
                </p>
              </div>

              {/* Aba 12 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 12: Relatórios Gerenciais & Auditoria</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Relatórios oficiais com valoração de estoque para balanço patrimonial, relatório de produtos críticos e trilha inviolável de auditoria.
                </p>
                <p>
                  <strong>Como usar:</strong> Utilize os botões "Exportar CSV" ou "Imprimir Relatório" para gerar demonstrativos para a diretoria ou contabilidade.
                </p>
              </div>

              {/* Aba 13 */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A2E44]/30 border border-slate-200 dark:border-[#24445F] space-y-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#28B88C]" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Aba 13: Configurações & Backup</h4>
                </div>
                <p>
                  <strong>O que significa:</strong> Configuração de filiais, depósitos (Câmaras Frias, Depósito Geral, Balcões), matriz de alçadas de operadores e continuidade dos dados.
                </p>
                <p>
                  <strong>Como usar:</strong> Exporte regularmente o backup em formato JSON em "Exportar Backup JSON" e guarde em mídia externa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-[#24445F] flex items-center justify-between bg-slate-50 dark:bg-[#1A2E44]/50">
          <span className="text-[11px] text-slate-500 font-mono">
            ASSX Tech Supermercados · Documentação Operacional ABNT/GS1
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#24445F] rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-1.5 text-xs font-semibold bg-[#28B88C] text-white hover:bg-[#229c76] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Gerando...' : 'Baixar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
