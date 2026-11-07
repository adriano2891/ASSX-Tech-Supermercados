import { jsPDF } from 'jspdf';

export function generateUserManualPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const navy = [16, 29, 43]; // #101D2B
  const blue = [36, 68, 95]; // #24445F
  const teal = [40, 184, 140]; // #28B88C
  const darkGray = [50, 50, 50];
  const lightGray = [242, 245, 248];

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      addFooter();
      doc.addPage();
      y = margin + 5;
      addHeader();
    }
  };

  const addHeader = () => {
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 8, pageWidth, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('ASSX TECH SUPERMERCADOS — MANUAL OPERACIONAL DO USUÁRIO', margin, 5.5);
  };

  const addFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('ASSX Tech Supermercados · Plataforma de Gestão Inteligente', margin, pageHeight - 7);
    doc.text(`Página ${pageNum}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  };

  // --- CAPA / HEADER PRINCIPAL ---
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.rect(0, 42, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSX TECH SUPERMERCADOS', margin, 20);

  doc.setFontSize(12);
  doc.setTextColor(teal[0], teal[1], teal[2]);
  doc.text('MANUAL DO USUÁRIO & GUIA OPERACIONAL DEFINITIVO', margin, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 220);
  doc.text('Instruções detalhadas de uso, regras de negócio e significado de cada módulo do sistema', margin, 35);

  y = 52;

  // Seção de Introdução
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('1. Visão Geral da Plataforma', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const introText = 
    'A plataforma ASSX Tech Supermercados é um sistema empresarial completo e independente para administração, controle de estoque e inteligência operacional de supermercados. ' +
    'Desenvolvido para atender desde uma loja única até redes multiunidade com depósitos segmentados, o sistema possui regras de integridade transacional, prevenção contra estoque negativo, rastreabilidade FEFO por lotes, inteligência artificial integrada (Gemini 3.8 Flash), etiquetagem e reconciliação automática de inventário.';
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  // SEÇÃO: O QUE SIGNIFICA CADA ABA E COMO USAR
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('2. O Que Significa Cada Aba & Como Usar', margin, y);
  y += 8;

  const tabsInfo = [
    {
      title: 'Aba 1: Dashboard Executivo',
      subtitle: 'Painel de Indicadores e Saúde Operacional em Tempo Real',
      desc: 'É a tela inicial do sistema. Apresenta os principais KPIs financeiros e operacionais atualizados automaticamente com base nas movimentações do banco de dados.',
      features: [
        'Valor do Estoque (Custo): Soma do saldo físico multiplicado pelo custo unitário ponderado de cada mercadoria.',
        'Potencial de Venda: Valor projetado das mercadorias com base no preço de venda praticado na loja.',
        'Margem Bruta Estimada (%): Percentual de retorno esperado sobre o volume total estocado.',
        'Gráficos Dinâmicos: Distribuição do capital imobilizado por departamento e balanço de entradas vs. saídas.',
        'Atalhos Rápidos: Acesso direto para lançar movimentações, emitir pedidos e abrir o scanner óptico.',
      ],
      howToUse: 'Utilize diariamente no início e no final do expediente para acompanhar o valor imobilizado, identificar rupturas e tomar decisões rápidas.',
    },
    {
      title: 'Aba 2: ASSX Intelligence (Inteligência Artificial)',
      subtitle: 'Consultor Cognitivo Operacional fundamentado em Dados Reais',
      desc: 'Módulo de inteligência artificial de alta performance alimentado pelo modelo Gemini 3.8 Flash. Consulta os dados reais da base (estoque, compras, perdas e lotes) para orientar a gerência.',
      features: [
        'Diagnóstico de Ruptura: Identifica instantaneamente produtos com risco de faltar na gôndola.',
        'Análise de Capital Parado: Aponta quais categorias concentram o maior capital imobilizado.',
        'Resumo de Vencimentos: Recomenda produtos em risco de vencimento para queima de estoque ou promoção.',
        'Chat Interativo: Permite que o operador faça perguntas em linguagem natural em português.',
      ],
      howToUse: 'Clique nos botões de prompts rápidos ou digite sua pergunta (ex: "Qual fornecedor tem maior atraso?") para obter respostas analíticas imediatas.',
    },
    {
      title: 'Aba 3: Catálogo de Produtos & Precificação',
      subtitle: 'Administração Mestre de Mercadorias, EAN-13, SKU e Margens',
      desc: 'Centraliza todas as informações dos produtos vendidos no supermercado. Permite controle completo de custos, formação de preços de venda, embalagens e níveis de estoque.',
      features: [
        'Identificadores Comerciais: Código interno, SKU, código de barras EAN-13 / GTIN e marcas.',
        'Formação de Preço: Cálculo em tempo real da Margem de Lucro (%) e Markup com base no preço de custo.',
        'Níveis de Segurança: Parâmetros de estoque mínimo, máximo, segurança e ponto de reposição.',
        'Importação & Exportação: Exportação em planilha CSV e importação em lote em formato JSON.',
        'Impressão de Etiquetas: Gera etiquetas de gôndola (100x35mm) e térmicas (50x30mm) com código de barras vetorial.',
      ],
      howToUse: 'Para cadastrar, clique em "Novo Produto", preencha nome, EAN, custo e preço de venda. Para imprimir etiquetas de preço, clique no ícone de código de barras.',
    },
    {
      title: 'Aba 4: Movimentações de Estoque',
      subtitle: 'Núcleo Transacional com Trilha Completa de Auditoria',
      desc: 'Registra toda e qualquer alteração de saldo físico. Toda operação grava o saldo anterior, a quantidade movimentada e o saldo posterior, sem exclusões silenciosas.',
      features: [
        'Entradas (+): Compras (NF), devoluções de clientes, ajustes positivos e transferências recebidas.',
        'Saídas (-): Vendas balcão, consumo interno, quebras/avarias, vencimentos e devoluções a fornecedores.',
        'Prevenção de Estoque Negativo: Bloqueia saídas superiores ao saldo físico disponível.',
        'Autorização Excepcional: Exige confirmação de gestor para autorizações excepcionais, gravando o responsável no log.',
      ],
      howToUse: 'Clique em "Registrar Movimentação", selecione o produto, o tipo de operação, o depósito, a quantidade e o motivo com número de documento.',
    },
    {
      title: 'Aba 5: Lotes & FEFO Validades',
      subtitle: 'Rastreabilidade Sanitária e Regra First Expire, First Out',
      desc: 'Rastreia mercadorias individualmente por lote, data de fabricação e validade, garantindo que os produtos que vencem primeiro saiam primeiro.',
      features: [
        'Alertas de Validade: Urgente (até 7 dias), Atenção (até 30 dias), Regular e Vencido.',
        'Bloqueio Sanitário: Impede a saída normal de mercadorias vencidas, direcionando para descarte ou devolução.',
        'Ações Imediatas: Permite acionar oferta relâmpago ou efetuar baixa de perda autorizada diretamente.',
      ],
      howToUse: 'Consulte a lista ordenada pelos lotes mais próximos do vencimento. Para lotes críticos, imprima etiquetas promocionais ou dê baixa de descarte.',
    },
    {
      title: 'Aba 6: Compras & Recebimento Físico',
      subtitle: 'Ciclo de Suprimentos, Ordens de Compra e Conferência de Doca',
      desc: 'Gerencia o fluxo de aquisição junto a fornecedores, desde a identificação da necessidade até a conferência item a item no descarregamento do caminhão.',
      features: [
        'Pedidos de Compra: Emissão de ordens com quantidade, preço acordado, prazo de entrega e condições de pagamento.',
        'Conferência de Doca: Validação das quantidades solicitadas versus fisicamente recebidas e rejeitadas.',
        'Alocação de Lote & NF: Criação do lote no ato do recebimento com validade e nota fiscal.',
        'Atualização Transacional: O estoque somente é acrescido após confirmação da conferência na doca.',
      ],
      howToUse: 'Emita pedidos em "Novo Pedido de Compra". Ao receber a carga, clique em "Conferência / Receber", confira os itens físicos, informe o lote e confirme.',
    },
    {
      title: 'Aba 7: Perdas, Avarias & Desperdícios',
      subtitle: 'Gestão de Quebras, Vencimentos e Apuração de Prejuízo',
      desc: 'Registra e analisa qualquer redução de estoque decorrente de produtos danificados, quebras de embalagens, furtos ou descarte sanitário.',
      features: [
        'Classificação de Motivos: Produto vencido, avaria, quebra, furto, erro operacional e descarte.',
        'Impacto Financeiro: Cálculo automático do valor total da perda multiplicado pelo custo unitário.',
        'Gráficos de Perdas: Distribuição visual do prejuízo acumulado por motivo e recomendações de prevenção.',
      ],
      howToUse: 'Clique em "Registrar Nova Perda", indique o produto, o motivo, a quantidade danificada e a circunstância. O saldo é baixado automaticamente.',
    },
    {
      title: 'Aba 8: Inventário Físico & Contagem',
      subtitle: 'Congelamento de Saldos, Contagem e Conciliação Automática',
      desc: 'Ferramenta de auditoria periódica e rotativa para garantir a acurácia do estoque entre o sistema e as prateleiras físicas.',
      features: [
        'Tipos de Inventário: Geral (toda a loja), por Categoria ou Rotativo de alta relevância.',
        'Congelamento Lógico: Congela o saldo teórico no momento da abertura para não distorcer contagens.',
        'Apuração de Divergências: Aponta diferenças em unidades físicas e impacto monetário (R$).',
        'Reconciliação Automática: Ao aprovar, o sistema gera os ajustes de entrada/saída automaticamente.',
      ],
      howToUse: 'Clique em "Abrir Nova Sessão". Durante a contagem, digite as quantidades físicas. Ao final, confira as divergências e clique em "Aprovar & Reconciliar".',
    },
    {
      title: 'Aba 9: Transferências Entre Filiais',
      subtitle: 'Logística de Abastecimento entre Lojas e Depósitos',
      desc: 'Controla a transferência de mercadorias entre a Matriz e filiais ou entre depósitos centrais e câmaras frias.',
      features: [
        'Mercadoria em Trânsito: Enquanto está no caminhão, o saldo não fica disponível na origem nem no destino.',
        'Confirmação no Destino: O estoque da loja de destino só é atualizado após a conferência e confirmação de chegada.',
      ],
      howToUse: 'Selecione a loja de origem e destino, o produto e a quantidade. Despache a carga. No destino, clique em "Confirmar Recebimento".',
    },
    {
      title: 'Aba 10: Gestão de Fornecedores',
      subtitle: 'Diretório Comercial, Prazos Médios (Lead Time) e Avaliações',
      desc: 'Cadastro dos fornecedores e distribuidores parceiros, contendo CNPJ, prazos médios de entrega, dados de contato e condições de pagamento.',
      features: [
        'Lead Time Médio: Prazo em dias que o fornecedor leva para entregar, utilizado no cálculo do ponto de reposição.',
        'Histórico e Rating: Avaliação de 1 a 5 estrelas quanto à pontualidade e qualidade dos produtos.',
      ],
      howToUse: 'Consulte prazos e telefones comerciais dos distribuidores e adicione novos parceiros pelo botão "Novo Fornecedor".',
    },
    {
      title: 'Aba 11: Curva ABC & Reposição Inteligente',
      subtitle: 'Análise de Pareto (Classes A, B e C) e Motor de Reposição',
      desc: 'Analisa o catálogo conforme a importância no faturamento e calcula automaticamente a necessidade de compras para prevenir rupturas na gôndola.',
      features: [
        'Curva ABC: Classe A (representa ~80% do faturamento), Classe B (~15%) e Classe C (~5%).',
        'Motor de Reposição: Identifica itens em estoque crítico e calcula o ponto de reposição exato.',
        'Geração em 1 Clique: Transforma a sugestão do motor diretamente em um pedido de compra aprovável.',
      ],
      howToUse: 'Acompanhe a lista de itens com risco de ruptura e clique no botão "Gerar Pedido" para abastecer o estoque antes que acabe.',
    },
    {
      title: 'Aba 12: Relatórios Gerenciais & Auditoria',
      subtitle: 'Demonstrativos Contábeis, Posição Financeira e Trilha Inviolável',
      desc: 'Central de relatórios oficiais para contabilidade, diretoria e auditoria externa.',
      features: [
        'Demonstrativo Financeiro: Valoração do estoque produto a produto por custo e potencial de venda.',
        'Trilha de Auditoria: Visualização detalhada de quem fez cada ação, em qual data, módulo e detalhes.',
        'Exportação & Impressão: Baixe planilhas CSV ou use o botão de impressão para relatórios em papel/PDF.',
      ],
      howToUse: 'Escolha a aba desejada (Financeiro, Auditoria ou Itens Críticos) e clique em "Exportar CSV" ou "Imprimir Relatório".',
    },
    {
      title: 'Aba 13: Configurações & Backup de Dados',
      subtitle: 'Administração de Filiais, Perfis de Usuário e Segurança de Dados',
      desc: 'Permite gerenciar a estrutura da empresa, filiais, fuso horário, matriz de permissões de operadores e continuidade dos dados.',
      features: [
        'Multiunidade: Cadastro de novas lojas e depósitos (Geral, Câmara Fria, Área de Vendas).',
        'Perfis & Permissões: Matriz de alçadas (Superadministrador, Gerente, Comprador, Estoquista, Conferente, Auditor).',
        'Exportação de Backup JSON: Gera cópia de segurança completa de todas as tabelas em formato atômico.',
        'Restauração de Emergência: Restaura a integridade do banco a partir de arquivo de backup previamente salvo.',
      ],
      howToUse: 'Exporte periodicamente o backup JSON e guarde em local seguro para garantir a continuidade operacional.',
    },
  ];

  tabsInfo.forEach((tab, index) => {
    checkPageBreak(50);

    // Box header for module
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(tab.title, margin + 4, y + 5);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.text(tab.subtitle, margin + 2, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const descLines = doc.splitTextToSize(tab.desc, contentWidth - 4);
    doc.text(descLines, margin + 2, y);
    y += descLines.length * 4.2 + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('Principais Recursos:', margin + 2, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    tab.features.forEach(feat => {
      checkPageBreak(8);
      const featLines = doc.splitTextToSize(`• ${feat}`, contentWidth - 8);
      doc.text(featLines, margin + 4, y);
      y += featLines.length * 3.8;
    });

    y += 1.5;
    checkPageBreak(12);
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(margin + 2, y, contentWidth - 4, 9, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.text('Como Usar:', margin + 4, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const howLines = doc.splitTextToSize(tab.howToUse, contentWidth - 30);
    doc.text(howLines, margin + 23, y + 4);

    y += 14;
  });

  // SEÇÃO: LEITOR DE CÓDIGO DE BARRAS & ETIQUETAS
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('3. Scanner Óptico & Impressão de Etiquetas', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const scannerText = 
    '• Leitor de Código de Barras: Disponível em qualquer tela pelo botão "Scanner" no topo ou pelo botão flutuante no celular. ' +
    'Utiliza a câmera traseira do celular ou webcam do computador (com BarcodeDetector integrado) ou leitor óptico USB/Bluetooth. ' +
    'Ao ler o código EAN-13, o produto é imediatamente consultado no banco de dados com saldo e preço.\n\n' +
    '• Impressão de Etiquetas de Gôndola & Térmicas: No Catálogo de Produtos ou no Controle de Lotes, clique no ícone de código de barras. ' +
    'Escolha entre o formato "Gôndola Supermercado (100x35mm)", "Térmica Adesiva (50x30mm)" ou "Caixa/Palete (100x70mm)". ' +
    'O sistema desenha o código de barras em SVG vetorial de alta definição com preço, SKU, código interno e lote, pronto para imprimir.';
  const scannerLines = doc.splitTextToSize(scannerText, contentWidth);
  doc.text(scannerLines, margin, y);
  y += scannerLines.length * 4.5 + 8;

  // SEÇÃO: REGRAS E BOAS PRÁTICAS OPERACIONAIS
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('4. Regras de Ouro da Operação', margin, y);
  y += 7;

  const rules = [
    '1. Nunca entregue mercadoria sem registro de saída: Todo consumo de padaria, balcão de açougue ou quebra deve ser registrado na hora.',
    '2. Conferência cega na doca: Sempre confira se as quantidades descarregadas batem com a nota fiscal e se a data de validade é aceitável antes de confirmar o recebimento.',
    '3. Rotação FEFO obrigatória: Mercadorias que chegam novas vão sempre para trás; os lotes mais antigos devem ser vendidos primeiro.',
    '4. Auditoria contínua: Nenhum registro pode ser apagado silenciosamente. Erros são corrigidos por lançamentos de estorno rastreáveis.',
    '5. Backup diário: Ao término do expediente ou após inventários gerais, exporte uma cópia de segurança em Configurações > Backup JSON.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  rules.forEach(rule => {
    checkPageBreak(8);
    const ruleLines = doc.splitTextToSize(rule, contentWidth);
    doc.text(ruleLines, margin, y);
    y += ruleLines.length * 4.2;
  });

  // Finaliza rodapé de todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (i > 1) {
      addHeader();
    }
    addFooter();
  }

  // Baixa o arquivo PDF
  doc.save(`manual-usuario-assx-supermercados-${new Date().toISOString().split('T')[0]}.pdf`);
}
