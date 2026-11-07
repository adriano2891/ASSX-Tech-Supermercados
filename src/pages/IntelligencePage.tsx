import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../services/api.ts';
import {
  Send,
  Sparkles,
  AlertTriangle,
  DollarSign,
  TrendingDown,
  Clock,
  BrainCircuit,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  fallback?: boolean;
}

export const IntelligencePage: React.FC = () => {
  const { currentStoreId, currentStore } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Olá! Sou o **ASSX Intelligence**, seu consultor analítico de inteligência operacional de supermercados.\n\nTenho acesso direto aos dados em tempo real da unidade **${currentStore?.name || 'Matriz'}**, incluindo saldos físicos, compras pendentes, controle FEFO de lotes e cálculo de perdas. Como posso ajudar na tomada de decisão hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const predefinedPrompts = [
    {
      title: 'Risco de Ruptura',
      text: 'Quais produtos estão em nível crítico de estoque ou com risco iminente de ruptura?',
      icon: AlertTriangle,
      color: 'text-red-500',
      badge: 'Crítico',
    },
    {
      title: 'Capital Imobilizado',
      text: 'Qual o valor total do estoque em custo, potencial de venda e produtos com maior capital imobilizado?',
      icon: DollarSign,
      color: 'text-[#28B88C]',
      badge: 'Financeiro',
    },
    {
      title: 'Validades (FEFO)',
      text: 'Quais lotes estão mais próximos do vencimento e quais ações promocionais você recomenda?',
      icon: Clock,
      color: 'text-amber-500',
      badge: 'Perecíveis',
    },
    {
      title: 'Quebras & Perdas',
      text: 'Faça um raio-x das perdas registradas e como diminuir o prejuízo financeiro na operação.',
      icon: TrendingDown,
      color: 'text-purple-500',
      badge: 'Avarias',
    },
  ];

  const handleSendPrompt = async (textToSend?: string) => {
    const query = (textToSend || promptInput).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setPromptInput('');
    setLoading(true);

    try {
      const response = await api.queryIntelligence(query, currentStoreId);
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        fallback: response.fallback,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        sender: 'assistant',
        text: `Não foi possível processar a consulta no momento: ${err.message || 'Erro de comunicação com o servidor de IA.'}`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format response text with bold and list styling
  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      // Empty line spacer
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Check if bullet point
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const content = isBullet ? line.trim().substring(2) : line;

      // Parse bold segments **text**
      const parts = content.split(/(\*\*.*?\*\*)/g);

      const parsedContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#28B88C] mt-2 shrink-0" />
            <div className="flex-1">{parsedContent}</div>
          </div>
        );
      }

      return (
        <div key={idx} className="my-1 leading-relaxed">
          {parsedContent}
        </div>
      );
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#101D2B] p-4 rounded-2xl border border-slate-200 dark:border-[#24445F] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#28B88C] to-[#24445F] flex items-center justify-center text-white shadow-md shrink-0">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                ASSX Intelligence
              </h1>
              <span className="text-[10px] bg-[#28B88C]/15 text-[#28B88C] border border-[#28B88C]/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                Gemini 3.8 Flash
              </span>
              <span className="text-[10px] bg-slate-100 dark:bg-[#1A2E44] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                Loja: {currentStore?.name || 'Matriz'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Análise cognitiva fundamentada estritamente no inventário real e regras operacionais de supermercados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPrompts(prev => !prev)}
            className="p-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2E44] flex items-center gap-1 transition-colors"
            title={showPrompts ? 'Recolher atalhos' : 'Exibir atalhos'}
          >
            <span className="hidden sm:inline text-xs">{showPrompts ? 'Recolher Atalhos' : 'Ver Atalhos'}</span>
            {showPrompts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              setMessages([messages[0]]);
            }}
            title="Limpar conversa"
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1A2E44] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompts (Compact & Toggleable) */}
      {showPrompts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 transition-all">
          {predefinedPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendPrompt(p.text)}
                className="p-3 text-left bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-xl hover:border-[#28B88C] dark:hover:border-[#28B88C] transition-all group shadow-xs hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-[#28B88C] transition-colors">
                      {p.title}
                    </span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-[#1A2E44] text-slate-500 font-mono">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {p.text}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Messages Box - Height Increased & Responsive */}
      <div className="flex-1 min-h-[520px] md:min-h-[600px] lg:min-h-[660px] bg-white dark:bg-[#101D2B] rounded-2xl border border-slate-200 dark:border-[#24445F] p-4 md:p-6 overflow-y-auto space-y-4 shadow-xs flex flex-col">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[92%] md:max-w-[85%] rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm leading-relaxed shadow-xs ${
                m.sender === 'user'
                  ? 'bg-[#28B88C] text-white rounded-br-none font-medium'
                  : 'bg-slate-50 dark:bg-[#162738] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#24445F] rounded-bl-none'
              }`}
            >
              {m.sender === 'assistant' ? (
                <div>{renderFormattedText(m.text)}</div>
              ) : (
                <div className="whitespace-pre-line">{m.text}</div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 px-1">
              <span className="text-[10px] text-slate-400 font-mono">{m.timestamp}</span>
              {m.fallback && (
                <span className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  cálculo direto
                </span>
              )}
              {m.sender === 'assistant' && (
                <button
                  onClick={() => handleCopyText(m.id, m.text)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] flex items-center gap-1 transition-colors"
                  title="Copiar resposta"
                >
                  {copiedId === m.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#28B88C]" />
                      <span className="text-[#28B88C]">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-xs md:text-sm text-slate-600 dark:text-slate-300 p-4 bg-slate-50 dark:bg-[#162738] rounded-2xl w-fit border border-slate-200 dark:border-[#24445F] shadow-xs">
            <Sparkles className="w-4 h-4 text-[#28B88C] animate-spin shrink-0" />
            <span>ASSX Intelligence analisando banco de dados, lotes e calculando métricas em tempo real...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSendPrompt();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={promptInput}
          onChange={e => setPromptInput(e.target.value)}
          placeholder="Pergunte sobre estoque, reposição, custos ou perdas do supermercado..."
          className="flex-1 px-4 py-3 text-xs md:text-sm bg-white dark:bg-[#101D2B] border border-slate-200 dark:border-[#24445F] rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#28B88C] shadow-xs"
        />
        <button
          type="submit"
          disabled={loading || !promptInput.trim()}
          className="px-5 py-3 rounded-2xl bg-[#28B88C] text-white hover:bg-[#229c76] disabled:opacity-50 transition-colors flex items-center justify-center shadow-xs shrink-0 font-medium text-xs md:text-sm gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};

