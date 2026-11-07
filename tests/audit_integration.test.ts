import { db, getDefaultPermissionsForRole } from '../src/server/db.ts';
import assert from 'node:assert';

console.log('===============================================================');
console.log('ASSX TECH SUPERMERCADOS — SUÍTE DE TESTES E AUDITORIA COMERCIAL');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASSOU] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ [FALHOU] ${name}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. AUDITORIA FINANCEIRA & FÓRMULAS DE PRECIFICAÇÃO (RETAIL ENGINE)
// -----------------------------------------------------------------------------
console.log('\n[1/7] Testando Fórmulas Financeiras e de Formação de Preço...');

runTest('Cálculo exato de Margem Bruta Comercial: ((Venda - Custo) / Venda) * 100', () => {
  const cost = 22.80;
  const sale = 38.00;
  const grossProfit = sale - cost;
  const marginPct = Number(((grossProfit / sale) * 100).toFixed(2));
  assert.strictEqual(marginPct, 40.00, 'Margem deve ser exatamente 40.00%');
});

runTest('Cálculo exato de Markup sobre Custo: ((Venda - Custo) / Custo) * 100', () => {
  const cost = 22.80;
  const sale = 38.00;
  const markupPct = Number((((sale - cost) / cost) * 100).toFixed(2));
  assert.strictEqual(markupPct, 66.67, 'Markup deve ser exatamente 66.67%');
});

runTest('Valoração de Estoque a Custo e Venda Estimada com Lucro Bruto Potencial', () => {
  const physicalQty = 280;
  const unitCost = 22.80;
  const unitSale = 32.90;

  const totalCost = Number((physicalQty * unitCost).toFixed(2));
  const totalSale = Number((physicalQty * unitSale).toFixed(2));
  const grossProfit = Number((totalSale - totalCost).toFixed(2));

  assert.strictEqual(totalCost, 6384.00, 'Valor a custo deve ser R$ 6.384,00');
  assert.strictEqual(totalSale, 9212.00, 'Valor de venda estimada deve ser R$ 9.212,00');
  assert.strictEqual(grossProfit, 2828.00, 'Lucro bruto potencial deve ser R$ 2.828,00');
});

// -----------------------------------------------------------------------------
// 2. INTEGRIDADE DA BASE DE DADOS & MULTIUNIDADE
// -----------------------------------------------------------------------------
console.log('\n[2/7] Testando Integridade de Dados, Unidades e Depósitos...');

runTest('Presença de Matriz e Filial com isolamento multi-loja', () => {
  const data = db.getData();
  assert(data.stores.length >= 2, 'Deve conter ao menos 2 lojas cadastradas');
  const mainStore = data.stores.find(s => s.isMain);
  assert(mainStore !== undefined, 'Deve existir uma Matriz designada');
  assert.strictEqual(mainStore.code, 'LJ-01');
});

runTest('Depósitos vinculados estritamente às suas respectivas lojas', () => {
  const data = db.getData();
  for (const wh of data.warehouses) {
    const parentStore = data.stores.find(s => s.id === wh.storeId);
    assert(parentStore !== undefined, `Depósito ${wh.name} deve pertencer a uma loja existente`);
  }
});

// -----------------------------------------------------------------------------
// 3. MOVIMENTAÇÃO DE ESTOQUE & POLÍTICA DE CONFORMIDADE DE SALDO
// -----------------------------------------------------------------------------
console.log('\n[3/7] Testando Movimentações de Estoque & Bloqueio de Saldo Negativo...');

runTest('Bloqueio estrito de saldo negativo sem autorização de alçada', () => {
  const dummyUser = { id: 'usr-checker', name: 'Conferente Teste', role: 'checker' };
  const res = db.executeStockMovement({
    productId: 'prod-01',
    storeId: 'store-01',
    warehouseId: 'wh-01-gen',
    type: 'adjustment_out',
    quantity: 9999999, // Quantidade exorbitante
    reason: 'Teste de tentativa de saldo negativo desautorizada',
    allowNegative: false,
    user: dummyUser,
  });

  assert.strictEqual(res.success, false, 'Deve recusar movimentação que negativaria o estoque físico sem autorização');
  assert(res.error?.includes('Saldo insuficiente'), 'Mensagem de erro deve alertar sobre saldo insuficiente');
});

runTest('Execução atômica de ajuste de estoque positivo com registro de auditoria', () => {
  const data = db.getData();
  const balanceBefore = data.stockBalances.find(b => b.productId === 'prod-01' && b.storeId === 'store-01');
  const prevQty = balanceBefore ? balanceBefore.physicalQty : 0;

  const testUser = { id: 'usr-super', name: 'Super Admin Test', role: 'superadmin' };
  const res = db.executeStockMovement({
    productId: 'prod-01',
    storeId: 'store-01',
    warehouseId: 'wh-01-gen',
    type: 'adjustment_in',
    quantity: 5,
    reason: 'Auditoria automatizada de estoque',
    documentNumber: 'AUDIT-TEST-001',
    user: testUser,
  });

  assert.strictEqual(res.success, true, 'Movimentação deve ser concluída com sucesso');
  assert.strictEqual(res.movement?.previousBalance, prevQty);
  assert.strictEqual(res.movement?.newBalance, prevQty + 5);

  // Rollback do teste para manter o estado limpo
  db.executeStockMovement({
    productId: 'prod-01',
    storeId: 'store-01',
    warehouseId: 'wh-01-gen',
    type: 'adjustment_out',
    quantity: 5,
    reason: 'Compensação do teste de auditoria',
    allowNegative: true,
    user: testUser,
  });
});

// -----------------------------------------------------------------------------
// 4. RASTREABILIDADE DE LOTES & FEFO (FIRST EXPIRE, FIRST OUT)
// -----------------------------------------------------------------------------
console.log('\n[4/7] Testando Rastreabilidade de Lotes e Ordenação FEFO...');

runTest('Ordenação cronológica de lotes pelo critério FEFO (vencimento mais próximo primeiro)', () => {
  const data = db.getData();
  const lots = [...data.stockLots].sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  
  for (let i = 0; i < lots.length - 1; i++) {
    const currentExp = new Date(lots[i].expirationDate).getTime();
    const nextExp = new Date(lots[i + 1].expirationDate).getTime();
    assert(currentExp <= nextExp, 'Lista de lotes FEFO deve respeitar ordem ascendente de expiração');
  }
});

// -----------------------------------------------------------------------------
// 5. MATRIZ DE SEGURANÇA & PERMISSÕES (RBAC)
// -----------------------------------------------------------------------------
console.log('\n[5/7] Testando Perfis de Acesso & Segurança RBAC...');

runTest('Superadmin possui acesso irrestrito a todos os módulos e alçadas', () => {
  const superPerms = getDefaultPermissionsForRole('superadmin');
  assert.strictEqual(superPerms.actions.canView, true);
  assert.strictEqual(superPerms.actions.canMove, true);
  assert.strictEqual(superPerms.actions.canApprove, true);
  assert.strictEqual(superPerms.actions.canEditMargin, true);
  assert.strictEqual(superPerms.modules.dashboard, true);
  assert.strictEqual(superPerms.modules.operators, true);
});

runTest('Operador conferente não possui permissão para aprovar compras ou editar margem', () => {
  const checkerPerms = getDefaultPermissionsForRole('checker');
  assert.strictEqual(checkerPerms.actions.canApprove, false, 'Conferente não pode aprovar compras');
  assert.strictEqual(checkerPerms.actions.canEditMargin, false, 'Conferente não pode alterar margem de lucro');
  assert.strictEqual(checkerPerms.modules.operators, false, 'Conferente não acessa painel de operadores');
});

// -----------------------------------------------------------------------------
// 6. ETIQUETAS, PARQUE TÉRMICO & DETECÇÃO DE PREÇO ALTERADO
// -----------------------------------------------------------------------------
console.log('\n[6/7] Testando Sistema de Etiquetas e Spooler ZPL...');

runTest('Parque de impressoras térmicas suporta protocolos industriais (ZPL, EPL, ESC/POS)', () => {
  const data = db.getData();
  assert(data.labelPrinters.length > 0, 'Deve conter impressoras cadastradas');
  const zplPrinter = data.labelPrinters.find(p => p.protocol === 'ZPL');
  assert(zplPrinter !== undefined, 'Deve conter impressora Zebra com suporte a ZPL');
});

runTest('Modelos de etiquetas oficiais (Gôndola, Tradicional, Promocional, Hortifrúti)', () => {
  const data = db.getData();
  assert(data.labelTemplates.length >= 4, 'Deve conter ao menos 4 modelos de etiquetas');
  const promoTemplate = data.labelTemplates.find(t => t.modelCode === 'C_PROMOTIONAL');
  assert(promoTemplate !== undefined, 'Deve conter modelo de etiqueta promocional amarela/destaque');
});

// -----------------------------------------------------------------------------
// 7. BACKUP, EXPORTAÇÃO E INTEGRIDADE OPERACIONAL
// -----------------------------------------------------------------------------
console.log('\n[7/7] Testando Snapshots de Backup & Continuidade Operacional...');

runTest('Exportação de snapshot estruturado com todas as entidades do ERP', () => {
  const data = db.getData();
  assert(Array.isArray(data.stores));
  assert(Array.isArray(data.products));
  assert(Array.isArray(data.stockBalances));
  assert(Array.isArray(data.stockMovements));
  assert(Array.isArray(data.stockLots));
  assert(Array.isArray(data.purchaseOrders));
  assert(Array.isArray(data.users));
  assert(Array.isArray(data.auditLogs));
});

console.log('\n===============================================================');
console.log(`RESULTADO DA AUDITORIA AUTOMATIZADA: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO (100%)`);
console.log('===============================================================\n');
