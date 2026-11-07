import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function askAssxIntelligence(userPrompt: string, storeId?: string): Promise<{ text: string; fallback?: boolean }> {
  const data = db.getData();
  const abc = db.getAbcAnalysis(storeId);
  const suggestions = db.getReplenishmentSuggestions(storeId);

  // Compile real live facts and stats for strict grounding
  const filteredProducts = data.products;
  const filteredBalances = data.stockBalances.filter(b => !storeId || b.storeId === storeId);
  const totalPhysicalUnits = filteredBalances.reduce((sum, b) => sum + b.physicalQty, 0);

  const totalCostValuation = filteredBalances.reduce((sum, b) => {
    const prod = data.products.find(p => p.id === b.productId);
    return sum + (b.physicalQty * (prod?.costPrice || b.avgCost));
  }, 0);

  const totalSalePotential = filteredBalances.reduce((sum, b) => {
    const prod = data.products.find(p => p.id === b.productId);
    return sum + (b.physicalQty * (prod?.salePrice || 0));
  }, 0);

  const criticalItems = suggestions.filter(s => s.urgency === 'critical');

  const lotsExpiringSoon = data.stockLots.filter(l => {
    if (!l.expirationDate || l.currentQuantity <= 0) return false;
    const exp = new Date(l.expirationDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  const totalLossesValue = data.stockLosses.reduce((sum, l) => sum + l.totalValue, 0);

  const contextData = {
    resumoGeral: {
      totalProdutosCadastrados: filteredProducts.length,
      unidadesFisicasTotais: totalPhysicalUnits,
      valorTotalCusto: Number(totalCostValuation.toFixed(2)),
      valorPotencialVenda: Number(totalSalePotential.toFixed(2)),
      margemMediaEstimada: totalCostValuation > 0 ? Number((((totalSalePotential - totalCostValuation) / totalSalePotential) * 100).toFixed(1)) : 0,
      totalPerdasRegistradasReais: Number(totalLossesValue.toFixed(2)),
    },
    produtosCriticosRuptura: criticalItems.map(c => ({
      produto: c.productName,
      estoqueAtual: c.currentStock,
      estoqueSeguranca: c.safetyStock,
      sugestaoCompra: c.suggestedQty,
      fornecedor: c.supplierName,
      custoEstimado: c.estimatedCost,
      motivo: c.reason,
    })),
    lotesValidadeCritica: lotsExpiringSoon.map(l => {
      const prod = data.products.find(p => p.id === l.productId);
      return {
        produto: prod?.name || l.productId,
        lote: l.lotNumber,
        validade: l.expirationDate,
        quantidadeAtual: l.currentQuantity,
        status: l.status,
      };
    }),
    curvaABC: {
      classeA_qtd: abc.summary.aCount,
      classeB_qtd: abc.summary.bCount,
      classeC_qtd: abc.summary.cCount,
      itensClasseA: abc.items.filter(i => i.classification === 'A').map(i => ({
        nome: i.productName,
        categoria: i.categoryName,
        estoque: i.stockQty,
        valorVendaAcumulado: i.totalSalesValue,
      })),
    },
    fornecedoresAtivos: data.suppliers.map(s => ({
      nome: s.tradeName,
      prazoMedioDias: s.leadTimeDays,
      avaliacao: s.rating,
      condicaoPagamento: s.paymentTerms,
    })),
    pedidosPendentes: data.purchaseOrders.filter(p => ['draft', 'pending_approval', 'approved', 'sent'].includes(p.status)).map(p => ({
      numero: p.orderNumber,
      status: p.status,
      valorTotal: p.totalValue,
      previsaoEntrega: p.expectedDeliveryDate,
    })),
  };

  const systemInstruction = `Você é o ASSX Intelligence, a inteligência operacional do sistema empresarial ASSX Tech Supermercados.
Sua missão é auxiliar diretores, gerentes de loja, compradores e coordenadores de estoque com análises estratégicas, operacionais e financeiras de altíssimo nível.
DIRETRIZES:
1. Responda estritamente baseado nos DADOS REAIS da base de dados fornecida.
2. Seja objetivo, técnico, preciso e consultivo, utilizando moeda em Real brasileiro (R$), quantidades e datas formatadas.
3. Se o usuário perguntar sobre risco de ruptura, aponte os itens críticos e a urgência.
4. Se perguntar sobre perdas e desperdícios, analise as causas e impacto financeiro.
5. Se perguntar sobre compras e fornecedores, considere os prazos de entrega (lead times) e condições de pagamento.
6. Não invente números fora da base de dados. Se faltar informação para um cálculo específico, declare a limitação com clareza.
7. Use formatação limpa em Markdown com tópicos e números em destaque.`;

  if (ai) {
    try {
      const prompt = `Contexto Operacional Atual do Supermercado:\n${JSON.stringify(contextData, null, 2)}\n\nPergunta do Gestor: "${userPrompt}"\n\nElabore uma resposta estratégica e fundamentada com dados do inventário:`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
        },
      });

      if (response.text) {
        return { text: response.text.trim() };
      }
    } catch (err) {
      console.error('Error invoking Gemini 3.8 Flash, providing deterministic rule-based analysis:', err);
    }
  }

  // Fallback if no API key or network error
  let synthesizedAnswer = `### Análise ASSX Intelligence (Modo Local Baseado em Invariantes)

**Resumo da Situação Operacional:**
- **Valor do Estoque em Custo:** R$ ${totalCostValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Potencial de Venda:** R$ ${totalSalePotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Margem Projetada: ~${contextData.resumoGeral.margemMediaEstimada}%)
- **Unidades Físicas em Estoque:** ${totalPhysicalUnits.toLocaleString('pt-BR')} unidades

**Alertas de Atenção Imediata:**
`;

  if (criticalItems.length > 0) {
    synthesizedAnswer += `\n**1. Risco de Ruptura (${criticalItems.length} produto(s) crítico(s)):**\n`;
    criticalItems.forEach(item => {
      synthesizedAnswer += `- **${item.productName}**: Estoque atual de ${item.currentStock} un contra estoque de segurança de ${item.safetyStock}. Sugestão de pedido: **${item.suggestedQty} un** junto a ${item.supplierName} (Lead Time: ${item.leadTimeDays} dias).\n`;
    });
  } else {
    synthesizedAnswer += `\n**1. Ruptura de Estoque:** Nenhum item está em nível crítico de emergência no momento.\n`;
  }

  if (lotsExpiringSoon.length > 0) {
    synthesizedAnswer += `\n**2. Lotes e Validades (FEFO):**\n`;
    lotsExpiringSoon.forEach(lot => {
      const prod = data.products.find(p => p.id === lot.productId);
      synthesizedAnswer += `- **${prod?.name || lot.productId}** (Lote: ${lot.lotNumber}): Vence em ${lot.expirationDate} com **${lot.currentQuantity} un** em estoque. Recomenda-se posicionamento em ponta de gôndola ou campanha promocional imediata.\n`;
    });
  }

  synthesizedAnswer += `\n**3. Recomendações Táticas:**
- Revisar pedidos pendentes para equalizar o capital de giro.
- Priorizar contagem rotativa nos itens de Curva A (${abc.summary.aCount} itens que concentram a maior parte do faturamento).
- Manter controle rígido nas câmaras frias para evitar novas perdas operacionais.`;

  return { text: synthesizedAnswer, fallback: true };
}
