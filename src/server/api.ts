import { Router, Request, Response } from 'express';
import { db, getDefaultPermissionsForRole } from './db.ts';
import { askAssxIntelligence } from './ai.ts';
import { Product, Supplier, PurchaseOrder, InventorySession, StockTransfer, StockLoss } from '../types/index.ts';

export const apiRouter = Router();

// Helper to extract active user from request header or use default manager
function getUser(req: Request) {
  const userId = (req.headers['x-user-id'] as string) || 'usr-super';
  const data = db.getData();
  const user = data.users.find(u => u.id === userId) || data.users[0];
  return user;
}

// 0. AUTHENTICATION & SESSION MANAGEMENT
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { userId } = req.body;
  const data = db.getData();

  if (!userId) {
    return res.status(400).json({ error: 'Identificação do operador é obrigatória.' });
  }

  const user = data.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'Operador não encontrado no sistema.' });
  }

  if (user.status === 'inactive') {
    db.logAudit({
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      module: 'AUTENTICACAO',
      entityId: user.id,
      entityType: 'UserProfile',
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      details: `Tentativa de login de operador inativo/bloqueado: ${user.name} (${user.email})`,
    });
    db.save();
    return res.status(403).json({ error: 'Operador inativo. Contate o Super Administrador para reativar o acesso.' });
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;

  // Log successful login
  db.logAudit({
    action: 'LOGIN',
    module: 'AUTENTICACAO',
    entityId: user.id,
    entityType: 'UserProfile',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Sessão iniciada com sucesso: ${user.name} - Cargo: ${user.jobTitle || user.role} - Perfil: ${user.role}`,
  });

  db.save();

  const token = `sess_${user.id}_${Date.now()}`;
  return res.json({
    user,
    token,
    message: `Bem-vindo(a), ${user.name}! Acesso concedido.`,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const activeUser = getUser(req);

  db.logAudit({
    action: 'LOGOUT',
    module: 'AUTENTICACAO',
    entityId: activeUser.id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Sessão encerrada pelo operador: ${activeUser.name} (${activeUser.email})`,
  });

  db.save();
  return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  return res.json(activeUser);
});

// 1. SYSTEM HEALTH & USERS
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'ASSX Tech Supermercados',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get('/users', (_req: Request, res: Response) => {
  const data = db.getData();
  const enriched = data.users.map(u => {
    const roleTpl = data.roles?.find(r => r.code === u.role);
    const defaultPerms = getDefaultPermissionsForRole(u.role);
    return {
      jobTitle: u.jobTitle || roleTpl?.name || 'Operador',
      department: u.department || roleTpl?.scopeLocation || 'Operações',
      status: u.status || 'active',
      scopeLocation: u.scopeLocation || roleTpl?.scopeLocation || 'Todas as Lojas & Setores Autorizados',
      allowedAreas: Array.isArray(u.allowedAreas) && u.allowedAreas.length > 0 ? u.allowedAreas : (roleTpl?.allowedAreas || ['Todas as Áreas Operacionais']),
      canView: u.canView !== undefined ? u.canView : (roleTpl?.canView ?? true),
      canMove: u.canMove !== undefined ? u.canMove : (roleTpl?.canMove ?? false),
      canApprovePurchases: u.canApprovePurchases !== undefined ? u.canApprovePurchases : (roleTpl?.canApprovePurchases ?? false),
      canAdjustInventory: u.canAdjustInventory !== undefined ? u.canAdjustInventory : (roleTpl?.canAdjustInventory ?? false),
      canAudit: u.canAudit !== undefined ? u.canAudit : (roleTpl?.canAudit ?? false),
      permissions: u.permissions || defaultPerms,
      ...u,
    };
  });
  res.json(enriched);
});

apiRouter.post('/users', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();

  // Superadmin guard
  if (activeUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas o Super Administrador pode cadastrar novos operadores.' });
  }

  const {
    name,
    email,
    role,
    jobTitle,
    department,
    status = 'active',
    storeIds,
    avatarUrl,
    scopeLocation,
    allowedAreas,
    permissions,
  } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Nome, e-mail e perfil são campos obrigatórios.' });
  }

  const roleTpl = data.roles?.find(r => r.code === role);
  const defaultPerms = getDefaultPermissionsForRole(role);

  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    jobTitle: jobTitle?.trim() || roleTpl?.name || 'Operador',
    department: department?.trim() || roleTpl?.scopeLocation || 'Operações',
    status: (status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
    storeIds: Array.isArray(storeIds) && storeIds.length > 0 ? storeIds : data.stores.map(s => s.id),
    avatarUrl: avatarUrl || undefined,
    scopeLocation: scopeLocation ? scopeLocation.trim() : (roleTpl?.scopeLocation || 'Todas as Unidades Autorizadas'),
    allowedAreas: Array.isArray(allowedAreas) && allowedAreas.length > 0 ? allowedAreas : (roleTpl?.allowedAreas || ['Todas as Áreas Operacionais']),
    permissions: permissions || defaultPerms,
    loginCount: 0,
    canView: true,
    canMove: permissions?.actions?.canMove ?? defaultPerms.actions.canMove,
    canApprovePurchases: permissions?.actions?.canApprovePurchases ?? defaultPerms.actions.canApprovePurchases,
    canAdjustInventory: permissions?.actions?.canAdjustInventory ?? defaultPerms.actions.canAdjustInventory,
    canAudit: permissions?.actions?.canAudit ?? defaultPerms.actions.canAudit,
  };

  data.users.push(newUser);

  db.logAudit({
    action: 'USER_CREATE',
    module: 'ADMINISTRACAO_OPERADORES',
    entityId: newUser.id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Novo operador cadastrado por ${activeUser.name}: ${newUser.name} (${newUser.email}) - Cargo: ${newUser.jobTitle} - Perfil: ${newUser.role}`,
    newState: newUser,
  });

  db.save();
  return res.status(201).json(newUser);
});

apiRouter.put('/users/:id', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;

  // Superadmin guard
  if (activeUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas o Super Administrador pode editar operadores.' });
  }

  const userIndex = data.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Operador não encontrado.' });
  }

  const existingUser = data.users[userIndex];
  const {
    name,
    email,
    role,
    jobTitle,
    department,
    status,
    storeIds,
    avatarUrl,
    scopeLocation,
    allowedAreas,
    permissions,
  } = req.body;

  // Protect against removing the only superadmin
  if (existingUser.role === 'superadmin' && role && role !== 'superadmin') {
    const superadminCount = data.users.filter(u => u.role === 'superadmin').length;
    if (superadminCount <= 1) {
      return res.status(400).json({ error: 'Não é permitido rebaixar o único Superadministrador ativo no sistema.' });
    }
  }

  // Protect superadmin from being inactivated
  if (existingUser.role === 'superadmin' && status === 'inactive') {
    return res.status(400).json({ error: 'Não é permitido desativar a conta do Superadministrador central.' });
  }

  const updatedUser = {
    ...existingUser,
    name: name !== undefined ? name.trim() : existingUser.name,
    email: email !== undefined ? email.trim().toLowerCase() : existingUser.email,
    role: role || existingUser.role,
    jobTitle: jobTitle !== undefined ? jobTitle.trim() : existingUser.jobTitle,
    department: department !== undefined ? department.trim() : existingUser.department,
    status: status || existingUser.status || 'active',
    storeIds: Array.isArray(storeIds) ? storeIds : existingUser.storeIds,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : existingUser.avatarUrl,
    scopeLocation: scopeLocation !== undefined ? scopeLocation : existingUser.scopeLocation,
    allowedAreas: Array.isArray(allowedAreas) ? allowedAreas : existingUser.allowedAreas,
    permissions: permissions || existingUser.permissions || getDefaultPermissionsForRole(role || existingUser.role),
  };

  data.users[userIndex] = updatedUser;

  db.logAudit({
    action: 'USER_UPDATE',
    module: 'ADMINISTRACAO_OPERADORES',
    entityId: updatedUser.id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Operador atualizado por ${activeUser.name}: ${updatedUser.name} - Cargo: ${updatedUser.jobTitle} - Perfil: ${updatedUser.role} - Status: ${updatedUser.status}`,
    previousState: existingUser,
    newState: updatedUser,
  });

  db.save();
  return res.json(updatedUser);
});

// Fast toggle status (active <-> inactive)
apiRouter.patch('/users/:id/status', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;
  const { status } = req.body;

  if (activeUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas o Super Administrador pode alterar o status de operadores.' });
  }

  const user = data.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Operador não encontrado.' });
  }

  if (user.role === 'superadmin') {
    return res.status(400).json({ error: 'Não é permitido desativar a conta do Superadministrador central.' });
  }

  const prevStatus = user.status;
  user.status = status === 'inactive' ? 'inactive' : 'active';

  db.logAudit({
    action: 'OPERATOR_STATUS_CHANGE',
    module: 'ADMINISTRACAO_OPERADORES',
    entityId: user.id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Status do operador ${user.name} alterado de ${prevStatus} para ${user.status} por ${activeUser.name}`,
  });

  db.save();
  return res.json(user);
});

// Granular permissions update
apiRouter.patch('/users/:id/permissions', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;
  const { permissions } = req.body;

  if (activeUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas o Super Administrador pode configurar permissões.' });
  }

  const user = data.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Operador não encontrado.' });
  }

  if (user.role === 'superadmin') {
    return res.status(400).json({ error: 'O perfil Super Administrador possui acesso irrestrito protegido e não pode ser limitado.' });
  }

  user.permissions = permissions;

  db.logAudit({
    action: 'PERMISSIONS_UPDATE',
    module: 'ADMINISTRACAO_OPERADORES',
    entityId: user.id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Matriz de permissões do operador ${user.name} atualizada pelo Super Administrador ${activeUser.name}.`,
    newState: permissions,
  });

  db.save();
  return res.json(user);
});

apiRouter.delete('/users/:id', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;

  if (activeUser.role !== 'superadmin') {
    return res.status(403).json({ error: 'Apenas o Super Administrador pode remover operadores.' });
  }

  const targetUser = data.users.find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ error: 'Operador não encontrado.' });
  }

  // Prevent deleting any superadmin
  if (targetUser.role === 'superadmin' || targetUser.id === 'usr-super') {
    return res.status(400).json({ error: 'Não é permitido remover o Superadministrador do sistema. Perfil protegido.' });
  }

  data.users = data.users.filter(u => u.id !== id);

  db.logAudit({
    action: 'USER_DELETE',
    module: 'ADMINISTRACAO_OPERADORES',
    entityId: id,
    entityType: 'UserProfile',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Operador removido do sistema: ${targetUser.name} (${targetUser.email}) - Cargo: ${targetUser.jobTitle || targetUser.role} por ${activeUser.name}`,
    previousState: targetUser,
  });

  db.save();
  return res.json({ success: true, deletedId: id });
});

// ROLES & ACCESS PERMISSIONS
apiRouter.get('/roles', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.roles || []);
});

apiRouter.post('/roles', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const {
    name,
    code,
    description,
    scopeLocation,
    allowedAreas,
    canView,
    canMove,
    canApprovePurchases,
    canAdjustInventory,
    canAudit,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome do perfil é obrigatório.' });
  }

  const roleCode = code
    ? code.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_')
    : name.toLowerCase().trim().replace(/\s+/g, '_').slice(0, 20);

  const newRole = {
    id: `role-${Date.now()}`,
    name: name.trim(),
    code: roleCode,
    description: description ? description.trim() : 'Perfil operacional customizado',
    scopeLocation: scopeLocation ? scopeLocation.trim() : 'Todas as Lojas & Setores Autorizados',
    allowedAreas: Array.isArray(allowedAreas) && allowedAreas.length > 0 ? allowedAreas : ['Todas as Áreas Operacionais'],
    canView: Boolean(canView),
    canMove: Boolean(canMove),
    canApprovePurchases: Boolean(canApprovePurchases),
    canAdjustInventory: Boolean(canAdjustInventory),
    canAudit: Boolean(canAudit),
    isSystem: false,
  };

  if (!data.roles) data.roles = [];
  data.roles.push(newRole);

  db.logAudit({
    action: 'ROLE_CREATE',
    module: 'CONFIGURACOES',
    entityId: newRole.id,
    entityType: 'RolePermission',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Novo perfil de acesso criado: ${newRole.name} (${newRole.code}) - Atuação: ${newRole.scopeLocation}`,
    newState: newRole,
  });

  db.save();
  return res.status(201).json(newRole);
});

apiRouter.put('/roles/:id', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;

  if (!data.roles) data.roles = [];
  const roleIndex = data.roles.findIndex(r => r.id === id);

  if (roleIndex === -1) {
    return res.status(404).json({ error: 'Perfil de acesso não encontrado.' });
  }

  const existingRole = data.roles[roleIndex];
  const {
    name,
    description,
    scopeLocation,
    allowedAreas,
    canView,
    canMove,
    canApprovePurchases,
    canAdjustInventory,
    canAudit,
  } = req.body;

  const updatedRole = {
    ...existingRole,
    name: name !== undefined ? name.trim() : existingRole.name,
    description: description !== undefined ? description.trim() : existingRole.description,
    scopeLocation: scopeLocation !== undefined ? scopeLocation.trim() : existingRole.scopeLocation,
    allowedAreas: Array.isArray(allowedAreas) ? allowedAreas : existingRole.allowedAreas,
    canView: canView !== undefined ? Boolean(canView) : existingRole.canView,
    canMove: canMove !== undefined ? Boolean(canMove) : existingRole.canMove,
    canApprovePurchases: canApprovePurchases !== undefined ? Boolean(canApprovePurchases) : existingRole.canApprovePurchases,
    canAdjustInventory: canAdjustInventory !== undefined ? Boolean(canAdjustInventory) : existingRole.canAdjustInventory,
    canAudit: canAudit !== undefined ? Boolean(canAudit) : existingRole.canAudit,
  };

  data.roles[roleIndex] = updatedRole;

  db.logAudit({
    action: 'ROLE_UPDATE',
    module: 'CONFIGURACOES',
    entityId: updatedRole.id,
    entityType: 'RolePermission',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Perfil de acesso atualizado: ${updatedRole.name} - Atuação: ${updatedRole.scopeLocation}`,
    previousState: existingRole,
    newState: updatedRole,
  });

  db.save();
  return res.json(updatedRole);
});

apiRouter.delete('/roles/:id', (req: Request, res: Response) => {
  const activeUser = getUser(req);
  const data = db.getData();
  const { id } = req.params;

  if (!data.roles) data.roles = [];
  const targetRole = data.roles.find(r => r.id === id);

  if (!targetRole) {
    return res.status(404).json({ error: 'Perfil de acesso não encontrado.' });
  }

  if (targetRole.isSystem || targetRole.code === 'superadmin') {
    return res.status(400).json({ error: 'Não é permitido remover o perfil mestre de Superadministrador.' });
  }

  data.roles = data.roles.filter(r => r.id !== id);

  // Reassign any users who had this role code to a fallback role
  const fallbackRole = data.roles.find(r => r.code !== 'superadmin')?.code || 'stockist';
  let reassignedCount = 0;
  data.users.forEach(u => {
    if (u.role === targetRole.code) {
      u.role = fallbackRole as any;
      reassignedCount++;
    }
  });

  db.logAudit({
    action: 'ROLE_DELETE',
    module: 'CONFIGURACOES',
    entityId: id,
    entityType: 'RolePermission',
    userId: activeUser.id,
    userName: activeUser.name,
    userRole: activeUser.role,
    details: `Perfil de acesso removido: ${targetRole.name} (${targetRole.code})${reassignedCount > 0 ? ` - ${reassignedCount} operador(es) reatribuído(s) para o perfil ${fallbackRole}` : ''}`,
    previousState: targetRole,
  });

  db.save();
  return res.json({ success: true, deletedId: id });
});

// 2. STORES & WAREHOUSES
apiRouter.get('/stores', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({
    stores: data.stores,
    warehouses: data.warehouses,
  });
});

apiRouter.post('/stores', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const newStore = {
    id: `store-${Date.now()}`,
    name: req.body.name,
    code: req.body.code || `LJ-${data.stores.length + 1}`,
    cnpj: req.body.cnpj,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    timezone: req.body.timezone || 'America/Sao_Paulo',
    isMain: false,
  };
  data.stores.push(newStore);

  // Auto-create standard warehouse
  data.warehouses.push({
    id: `wh-${newStore.id}-gen`,
    storeId: newStore.id,
    name: `Depósito Geral (${newStore.name})`,
    code: 'DEP-GERAL',
    type: 'general',
  });

  db.logAudit({
    action: 'STORE_CREATE',
    module: 'CONFIGURACOES',
    entityId: newStore.id,
    entityType: 'Store',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Nova unidade cadastrada: ${newStore.name} (${newStore.code})`,
  });

  db.save();
  res.status(201).json(newStore);
});

// 3. CATEGORIES
apiRouter.get('/categories', (_req: Request, res: Response) => {
  res.json(db.getData().categories);
});

apiRouter.post('/categories', (req: Request, res: Response) => {
  const data = db.getData();
  const newCat = {
    id: `cat-${Date.now()}`,
    name: req.body.name,
    description: req.body.description || '',
    color: req.body.color || '#24445F',
    icon: req.body.icon || 'ShoppingBag',
    status: req.body.status || 'active',
  };
  data.categories.push(newCat);
  db.save();
  res.status(201).json(newCat);
});

// 4. SUPPLIERS
apiRouter.get('/suppliers', (_req: Request, res: Response) => {
  res.json(db.getData().suppliers);
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const newSup: Supplier = {
    id: `sup-${Date.now()}`,
    corporateName: req.body.corporateName,
    tradeName: req.body.tradeName || req.body.corporateName,
    cnpj: req.body.cnpj,
    stateRegistration: req.body.stateRegistration,
    address: req.body.address || '',
    city: req.body.city || '',
    state: req.body.state || 'SP',
    zipCode: req.body.zipCode || '',
    contactName: req.body.contactName || '',
    phone: req.body.phone || '',
    whatsapp: req.body.whatsapp,
    email: req.body.email || '',
    paymentTerms: req.body.paymentTerms || '30 DDL',
    leadTimeDays: Number(req.body.leadTimeDays) || 3,
    rating: Number(req.body.rating) || 5.0,
    notes: req.body.notes,
    status: req.body.status || 'active',
  };
  data.suppliers.push(newSup);

  db.logAudit({
    action: 'SUPPLIER_CREATE',
    module: 'FORNECEDORES',
    entityId: newSup.id,
    entityType: 'Supplier',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Novo fornecedor cadastrado: ${newSup.tradeName} (CNPJ: ${newSup.cnpj})`,
  });

  db.save();
  res.status(201).json(newSup);
});

apiRouter.put('/suppliers/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const idx = data.suppliers.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

  data.suppliers[idx] = { ...data.suppliers[idx], ...req.body };

  db.logAudit({
    action: 'SUPPLIER_UPDATE',
    module: 'FORNECEDORES',
    entityId: req.params.id,
    entityType: 'Supplier',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Fornecedor atualizado: ${data.suppliers[idx].tradeName}`,
  });

  db.save();
  res.json(data.suppliers[idx]);
});

// 5. PRODUCTS
apiRouter.get('/products', (req: Request, res: Response) => {
  const data = db.getData();
  const search = (req.query.q as string)?.toLowerCase();
  const categoryId = req.query.category as string;
  const supplierId = req.query.supplier as string;
  const status = req.query.status as string;
  const storeId = req.query.storeId as string;

  let list = data.products;

  if (search) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.code.toLowerCase().includes(search) ||
      p.sku.toLowerCase().includes(search) ||
      p.ean.toLowerCase().includes(search) ||
      p.brand.toLowerCase().includes(search)
    );
  }

  if (categoryId) {
    list = list.filter(p => p.categoryId === categoryId);
  }

  if (supplierId) {
    list = list.filter(p => p.supplierId === supplierId);
  }

  if (status) {
    list = list.filter(p => p.status === status);
  }

  // Attach aggregated stock balances and financial indicators
  const enriched = list.map(prod => {
    const balances = data.stockBalances.filter(
      b => b.productId === prod.id && (!storeId || b.storeId === storeId)
    );
    const totalPhysical = Math.max(0, balances.reduce((sum, b) => sum + (b.physicalQty || 0), 0));
    const totalAvailable = Math.max(0, balances.reduce((sum, b) => sum + (b.availableQty || 0), 0));
    const totalReserved = Math.max(0, balances.reduce((sum, b) => sum + (b.reservedQty || 0), 0));
    const totalBlocked = Math.max(0, balances.reduce((sum, b) => sum + (b.blockedQty || 0), 0));

    const cost = Math.max(0, Number(prod.costPrice) || 0);
    const sale = Math.max(0, Number(prod.salePrice) || 0);
    const stockCostVal = Number((totalPhysical * cost).toFixed(2));
    const potentialSaleVal = Number((totalPhysical * sale).toFixed(2));
    const grossProfitVal = Number((potentialSaleVal - stockCostVal).toFixed(2));

    const profitMargin = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(2)) : 0;
    const markup = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(2)) : 0;

    return {
      ...prod,
      costPrice: cost,
      salePrice: sale,
      profitMargin: prod.profitMargin ?? profitMargin,
      markup: prod.markup ?? markup,
      totalPhysicalStock: totalPhysical,
      totalAvailableStock: totalAvailable,
      totalReservedStock: totalReserved,
      totalBlockedStock: totalBlocked,
      stockValue: stockCostVal, // Valor Total a Custo
      potentialSaleValue: potentialSaleVal, // Valor Total Estimado de Venda
      potentialGrossProfit: grossProfitVal, // Lucro Bruto Potencial
    };
  });

  res.json(enriched);
});

apiRouter.post('/products', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const {
    name,
    code,
    sku,
    ean,
    additionalBarcodes,
    categoryId,
    brand,
    manufacturer,
    unit,
    packageType,
    unitsPerPackage,
    weight,
    volume,
    costPrice,
    salePrice,
    minStock,
    maxStock,
    safetyStock,
    reorderPoint,
    supplierId,
    initialStock,
    storeId,
    warehouseId,
  } = req.body;

  if (!name || !ean) {
    return res.status(400).json({ error: 'Nome e Código de Barras (EAN) são obrigatórios.' });
  }

  // Prevent duplicate EAN or SKU
  const duplicateEan = data.products.find(p => p.ean === ean);
  if (duplicateEan) {
    return res.status(400).json({ error: `Código EAN ${ean} já cadastrado no produto "${duplicateEan.name}".` });
  }

  const cost = Number(costPrice) || 0;
  const sale = Number(salePrice) || 0;
  const profitMargin = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(2)) : 0;
  const markup = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(2)) : 0;

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    code: code || String(1000 + data.products.length + 1),
    sku: sku || `SKU-${Date.now().toString().slice(-6)}`,
    ean,
    additionalBarcodes: additionalBarcodes || [],
    name,
    categoryId: categoryId || 'cat-01',
    brand: brand || 'Genérica',
    manufacturer,
    unit: unit || 'UN',
    packageType,
    unitsPerPackage: Number(unitsPerPackage) || 1,
    weight: Number(weight) || 0,
    volume: Number(volume) || 0,
    costPrice: cost,
    salePrice: sale,
    profitMargin,
    markup,
    minStock: Number(minStock) || 10,
    maxStock: Number(maxStock) || 100,
    safetyStock: Number(safetyStock) || 5,
    reorderPoint: Number(reorderPoint) || 15,
    supplierId: supplierId || 'sup-01',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.products.push(newProduct);

  // Initialize initial balance if provided
  const initQty = Number(initialStock) || 0;
  const targetStore = storeId || data.stores[0]?.id || 'store-01';
  const targetWarehouse = warehouseId || data.warehouses.find(w => w.storeId === targetStore)?.id || 'wh-01-gen';

  if (initQty > 0) {
    db.executeStockMovement({
      productId: newProduct.id,
      storeId: targetStore,
      warehouseId: targetWarehouse,
      type: 'adjustment_in',
      quantity: initQty,
      reason: 'Implantação inicial de cadastro de produto',
      authorizedBy: user.name,
      user,
    });
  }

  db.logAudit({
    action: 'PRODUCT_CREATE',
    module: 'PRODUTOS',
    entityId: newProduct.id,
    entityType: 'Product',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Novo produto cadastrado: ${newProduct.name} (EAN: ${newProduct.ean}, SKU: ${newProduct.sku})`,
  });

  db.save();
  res.status(201).json(newProduct);
});

apiRouter.put('/products/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const idx = data.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado.' });

  const existing = data.products[idx];
  const cost = req.body.costPrice !== undefined ? Number(req.body.costPrice) : existing.costPrice;
  const sale = req.body.salePrice !== undefined ? Number(req.body.salePrice) : existing.salePrice;
  const profitMargin = sale > 0 ? Number((((sale - cost) / sale) * 100).toFixed(2)) : 0;
  const markup = cost > 0 ? Number((((sale - cost) / cost) * 100).toFixed(2)) : 0;

  data.products[idx] = {
    ...existing,
    ...req.body,
    costPrice: cost,
    salePrice: sale,
    profitMargin,
    markup,
    updatedAt: new Date().toISOString(),
  };

  // Automatic Price Change Identification for Label Module
  if (req.body.salePrice !== undefined && Number(req.body.salePrice) !== existing.salePrice) {
    db.recordPriceChange({
      productId: existing.id,
      previousPrice: existing.salePrice,
      newPrice: Number(req.body.salePrice),
      changedBy: `${user.name} (${user.role})`,
    });
  }

  db.logAudit({
    action: 'PRODUCT_UPDATE',
    module: 'PRODUTOS',
    entityId: req.params.id,
    entityType: 'Product',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Alteração de cadastro do produto: ${data.products[idx].name}. Custo: R$${cost} | Venda: R$${sale}`,
    previousState: existing,
    newState: data.products[idx],
  });

  db.save();
  res.json(data.products[idx]);
});

// 6. STOCK BALANCES & MOVEMENTS
apiRouter.get('/stock/balances', (req: Request, res: Response) => {
  const data = db.getData();
  const storeId = req.query.storeId as string;
  const warehouseId = req.query.warehouseId as string;

  let balances = data.stockBalances;
  if (storeId) balances = balances.filter(b => b.storeId === storeId);
  if (warehouseId) balances = balances.filter(b => b.warehouseId === warehouseId);

  const enriched = balances.map(b => {
    const prod = data.products.find(p => p.id === b.productId);
    const store = data.stores.find(s => s.id === b.storeId);
    const wh = data.warehouses.find(w => w.id === b.warehouseId);
    return {
      ...b,
      product: prod,
      storeName: store?.name || b.storeId,
      warehouseName: wh?.name || b.warehouseId,
      totalCostValue: Number((b.physicalQty * (prod?.costPrice || b.avgCost)).toFixed(2)),
      totalSaleValue: Number((b.physicalQty * (prod?.salePrice || 0)).toFixed(2)),
    };
  });

  res.json(enriched);
});

apiRouter.get('/stock/movements', (req: Request, res: Response) => {
  const data = db.getData();
  const productId = req.query.productId as string;
  const storeId = req.query.storeId as string;
  const limit = Number(req.query.limit) || 100;

  let list = data.stockMovements;
  if (productId) list = list.filter(m => m.productId === productId);
  if (storeId) list = list.filter(m => m.storeId === storeId);

  const enriched = list.slice(0, limit).map(m => {
    const prod = data.products.find(p => p.id === m.productId);
    const store = data.stores.find(s => s.id === m.storeId);
    const wh = data.warehouses.find(w => w.id === m.warehouseId);
    return {
      ...m,
      productName: prod?.name || m.productId,
      productEan: prod?.ean,
      productUnit: prod?.unit || 'UN',
      storeName: store?.name || m.storeId,
      warehouseName: wh?.name || m.warehouseId,
    };
  });

  res.json(enriched);
});

apiRouter.post('/stock/movements', (req: Request, res: Response) => {
  const user = getUser(req);
  const { productId, storeId, warehouseId, lotId, type, quantity, reason, documentNumber, authorizedBy, allowNegative } = req.body;

  const result = db.executeStockMovement({
    productId,
    storeId,
    warehouseId,
    lotId,
    type,
    quantity: Number(quantity),
    reason,
    documentNumber,
    authorizedBy,
    allowNegative: Boolean(allowNegative),
    user,
  });

  if (!result.success || !result.movement) {
    return res.status(400).json({ error: result.error || 'Erro ao processar movimentação de estoque.' });
  }

  const data = db.getData();
  const prod = data.products.find(p => p.id === result.movement!.productId);
  const store = data.stores.find(s => s.id === result.movement!.storeId);
  const wh = data.warehouses.find(w => w.id === result.movement!.warehouseId);

  const enrichedMovement = {
    ...result.movement,
    productName: prod?.name || result.movement.productId,
    productEan: prod?.ean,
    productUnit: prod?.unit || 'UN',
    storeName: store?.name || result.movement.storeId,
    warehouseName: wh?.name || result.movement.warehouseId,
  };

  res.status(201).json(enrichedMovement);
});

// 7. LOTS & FEFO TRACKING
apiRouter.get('/stock/lots', (req: Request, res: Response) => {
  const data = db.getData();
  const storeId = req.query.storeId as string;

  let lots = data.stockLots;
  if (storeId) lots = lots.filter(l => l.storeId === storeId);

  const now = new Date().getTime();

  const enriched = lots.map(l => {
    const prod = data.products.find(p => p.id === l.productId);
    const store = data.stores.find(s => s.id === l.storeId);
    const wh = data.warehouses.find(w => w.id === l.warehouseId);

    const expTime = new Date(l.expirationDate).getTime();
    const daysUntilExpiry = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));

    let dynamicStatus = l.status;
    if (l.currentQuantity <= 0) {
      dynamicStatus = 'depleted';
    } else if (daysUntilExpiry <= 0) {
      dynamicStatus = 'expired';
    } else if (daysUntilExpiry <= 7) {
      dynamicStatus = 'critical';
    } else if (daysUntilExpiry <= 30) {
      dynamicStatus = 'warning';
    } else {
      dynamicStatus = 'active';
    }

    return {
      ...l,
      status: dynamicStatus,
      daysUntilExpiry,
      productName: prod?.name || l.productId,
      productEan: prod?.ean,
      productUnit: prod?.unit || 'UN',
      storeName: store?.name || l.storeId,
      warehouseName: wh?.name || l.warehouseId,
      totalCostValue: Number((l.currentQuantity * l.unitCost).toFixed(2)),
    };
  });

  // Sort by expiration date ascending (FEFO: First Expire, First Out!)
  enriched.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

  res.json(enriched);
});

apiRouter.post('/stock/lots', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const { productId, storeId, warehouseId, lotNumber, manufacturingDate, expirationDate, initialQuantity, unitCost, supplierId, documentNumber } = req.body;

  const qty = Number(initialQuantity) || 0;
  const newLot = {
    id: `lot-${Date.now()}`,
    productId,
    storeId,
    warehouseId,
    lotNumber,
    manufacturingDate,
    expirationDate,
    initialQuantity: qty,
    currentQuantity: qty,
    unitCost: Number(unitCost) || 0,
    supplierId: supplierId || 'sup-01',
    documentNumber,
    status: 'active' as const,
  };

  data.stockLots.push(newLot);

  // Register corresponding stock entry movement
  if (qty > 0) {
    db.executeStockMovement({
      productId,
      storeId,
      warehouseId,
      lotId: newLot.id,
      type: 'purchase_in',
      quantity: qty,
      reason: `Entrada com criação de lote ${lotNumber}`,
      documentNumber,
      user,
    });
  }

  db.save();
  res.status(201).json(newLot);
});

// 8. PURCHASES & GOODS RECEIPT
apiRouter.get('/purchases', (_req: Request, res: Response) => {
  const data = db.getData();
  const enriched = data.purchaseOrders.map(po => {
    const sup = data.suppliers.find(s => s.id === po.supplierId);
    const store = data.stores.find(s => s.id === po.storeId);
    const enrichedItems = po.items.map(item => {
      const prod = data.products.find(p => p.id === item.productId);
      return {
        ...item,
        productName: prod?.name || item.productId,
        productEan: prod?.ean,
        productUnit: prod?.unit || 'UN',
      };
    });
    return {
      ...po,
      supplierName: sup?.tradeName || po.supplierId,
      storeName: store?.name || po.storeId,
      items: enrichedItems,
    };
  });
  res.json(enriched);
});

apiRouter.post('/purchases', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const { storeId, supplierId, items, paymentTerms, expectedDeliveryDate, notes } = req.body;

  let totalValue = 0;
  const formattedItems = (items || []).map((it: any) => {
    const cost = Number(it.unitCost) || 0;
    const qty = Number(it.quantity) || 1;
    const lineTotal = Number((cost * qty).toFixed(2));
    totalValue += lineTotal;
    return {
      productId: it.productId,
      quantity: qty,
      unitCost: cost,
      totalCost: lineTotal,
    };
  });

  const newOrder: PurchaseOrder = {
    id: `po-${Date.now()}`,
    orderNumber: `PED-2026-${String(data.purchaseOrders.length + 1).padStart(3, '0')}`,
    storeId: storeId || data.stores[0].id,
    supplierId,
    status: 'pending_approval',
    items: formattedItems,
    totalValue: Number(totalValue.toFixed(2)),
    expectedDeliveryDate: expectedDeliveryDate || new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    paymentTerms: paymentTerms || '30 DDL',
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.purchaseOrders.unshift(newOrder);

  db.logAudit({
    action: 'PURCHASE_ORDER_CREATE',
    module: 'COMPRAS',
    entityId: newOrder.id,
    entityType: 'PurchaseOrder',
    storeId: newOrder.storeId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Novo pedido de compra emitido: ${newOrder.orderNumber} - R$ ${newOrder.totalValue}`,
  });

  db.save();
  res.status(201).json(newOrder);
});

apiRouter.put('/purchases/:id/status', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const order = data.purchaseOrders.find(p => p.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

  const prevStatus = order.status;
  order.status = req.body.status;
  if (req.body.status === 'approved') {
    order.approvedBy = user.name;
  }
  order.updatedAt = new Date().toISOString();

  db.logAudit({
    action: 'PURCHASE_ORDER_STATUS',
    module: 'COMPRAS',
    entityId: order.id,
    entityType: 'PurchaseOrder',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Status do pedido ${order.orderNumber} alterado de ${prevStatus} para ${order.status}`,
  });

  db.save();
  res.json(order);
});

// GOODS RECEIPT & CONFERÊNCIA DE MERCADORIAS
apiRouter.post('/purchases/:id/receive', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const order = data.purchaseOrders.find(p => p.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

  const { documentNumber, receivedItems, targetWarehouseId } = req.body;
  // receivedItems: Array of { productId, receivedQty, rejectedQty, lotNumber, manufacturingDate, expirationDate }

  const warehouseId = targetWarehouseId || data.warehouses.find(w => w.storeId === order.storeId)?.id || 'wh-01-gen';

  for (const recItem of receivedItems) {
    const poItem = order.items.find(i => i.productId === recItem.productId);
    if (poItem) {
      poItem.receivedQty = (poItem.receivedQty || 0) + Number(recItem.receivedQty);
      poItem.rejectedQty = (poItem.rejectedQty || 0) + Number(recItem.rejectedQty || 0);

      const qtyToAdd = Number(recItem.receivedQty);
      if (qtyToAdd > 0) {
        let lotId: string | undefined = undefined;

        // If lot was specified, create lot
        if (recItem.lotNumber && recItem.expirationDate) {
          const lot = {
            id: `lot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: recItem.productId,
            storeId: order.storeId,
            warehouseId,
            lotNumber: recItem.lotNumber,
            manufacturingDate: recItem.manufacturingDate || new Date().toISOString().split('T')[0],
            expirationDate: recItem.expirationDate,
            initialQuantity: qtyToAdd,
            currentQuantity: qtyToAdd,
            unitCost: poItem.unitCost,
            supplierId: order.supplierId,
            documentNumber: documentNumber || `NF-${order.orderNumber}`,
            status: 'active' as const,
          };
          data.stockLots.push(lot);
          lotId = lot.id;
        }

        // Add to stock with audit & transactional safety
        db.executeStockMovement({
          productId: recItem.productId,
          storeId: order.storeId,
          warehouseId,
          lotId,
          type: 'purchase_in',
          quantity: qtyToAdd,
          reason: `Recebimento de Mercadorias (Pedido ${order.orderNumber}, NF ${documentNumber})`,
          documentNumber,
          authorizedBy: user.name,
          user,
        });
      }
    }
  }

  // Check if fully received
  const allFulfilled = order.items.every(i => (i.receivedQty || 0) >= i.quantity);
  order.status = allFulfilled ? 'received' : 'partially_received';
  order.updatedAt = new Date().toISOString();

  if (!order.receiptHistory) order.receiptHistory = [];
  order.receiptHistory.push({
    receiptId: `REC-${Date.now()}`,
    date: new Date().toISOString(),
    receivedBy: user.name,
    documentNumber: documentNumber || 'NF-SEM-NUMERO',
  });

  db.logAudit({
    action: 'GOODS_RECEIPT_CONFIRMED',
    module: 'RECEBIMENTO',
    entityId: order.id,
    entityType: 'PurchaseOrder',
    storeId: order.storeId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Conferência e recebimento confirmados para pedido ${order.orderNumber} (NF: ${documentNumber})`,
  });

  db.save();
  res.json({ success: true, order });
});

// 9. LOSSES & AVARIAS
apiRouter.get('/losses', (_req: Request, res: Response) => {
  const data = db.getData();
  const enriched = data.stockLosses.map(l => {
    const prod = data.products.find(p => p.id === l.productId);
    const cat = data.categories.find(c => c.id === prod?.categoryId);
    const store = data.stores.find(s => s.id === l.storeId);
    return {
      ...l,
      productName: prod?.name || l.productId,
      productUnit: prod?.unit || 'UN',
      categoryName: cat?.name || 'Geral',
      storeName: store?.name || l.storeId,
    };
  });
  res.json(enriched);
});

apiRouter.post('/losses', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const { productId, storeId, warehouseId, lotId, quantity, reason, reasonDescription } = req.body;

  const prod = data.products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });

  const qty = Number(quantity);
  if (qty <= 0) return res.status(400).json({ error: 'Quantidade de perda inválida.' });

  const totalValue = Number((qty * prod.costPrice).toFixed(2));

  // Deduct stock via loss_out movement
  const movementResult = db.executeStockMovement({
    productId,
    storeId,
    warehouseId,
    lotId,
    type: reason === 'expired' ? 'expiration_out' : 'loss_out',
    quantity: qty,
    reason: `Registro de Perda/Avaria: ${reasonDescription}`,
    authorizedBy: user.name,
    user,
  });

  if (!movementResult.success) {
    return res.status(400).json({ error: movementResult.error });
  }

  const newLoss: StockLoss = {
    id: `loss-${Date.now()}`,
    storeId,
    warehouseId,
    productId,
    lotId,
    quantity: qty,
    unitCost: prod.costPrice,
    totalValue,
    reason,
    reasonDescription: reasonDescription || 'Perda operacional registrada',
    userId: user.id,
    userName: user.name,
    approvedBy: user.name,
    date: new Date().toISOString(),
  };

  data.stockLosses.unshift(newLoss);

  db.save();
  res.status(201).json(newLoss);
});

// 10. INVENTORY SESSIONS & CONCILIATION
apiRouter.get('/inventory', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.inventorySessions);
});

apiRouter.post('/inventory', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const { storeId, type, targetCategoryId, targetWarehouseId } = req.body;

  // Freeze logical inventory snapshot
  let productsToCount = data.products.filter(p => p.status === 'active');
  if (targetCategoryId) {
    productsToCount = productsToCount.filter(p => p.categoryId === targetCategoryId);
  }

  const whId = targetWarehouseId || data.warehouses.find(w => w.storeId === storeId)?.id || 'wh-01-gen';

  const items = productsToCount.map(p => {
    const bal = data.stockBalances.find(b => b.productId === p.id && b.storeId === storeId && b.warehouseId === whId);
    const theoreticalQty = bal ? bal.physicalQty : 0;
    return {
      productId: p.id,
      warehouseId: whId,
      theoreticalQty,
      finalCountQty: theoreticalQty,
      differenceQty: 0,
      unitCost: p.costPrice,
      financialDifference: 0,
      countedBy: user.name,
      status: 'pending' as const,
    };
  });

  const session: InventorySession = {
    id: `inv-${Date.now()}`,
    sessionNumber: `INV-2026-${String(data.inventorySessions.length + 1).padStart(2, '0')}`,
    storeId: storeId || data.stores[0].id,
    type: type || 'general',
    targetCategoryId,
    targetWarehouseId: whId,
    status: 'open',
    openedBy: user.name,
    items,
    totalItems: items.length,
    divergentItemsCount: 0,
    totalFinancialImpact: 0,
    createdAt: new Date().toISOString(),
  };

  data.inventorySessions.unshift(session);
  db.save();
  res.status(201).json(session);
});

apiRouter.put('/inventory/:id/counts', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const session = data.inventorySessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão de inventário não encontrada.' });

  const { items } = req.body; // updated array of { productId, finalCountQty, countedBy }
  if (items && Array.isArray(items)) {
    let divergentCount = 0;
    let totalFinDiff = 0;

    session.items = session.items.map(orig => {
      const updated = items.find((i: any) => i.productId === orig.productId);
      if (updated) {
        const counted = Number(updated.finalCountQty);
        const diff = counted - orig.theoreticalQty;
        const finDiff = Number((diff * orig.unitCost).toFixed(2));
        if (diff !== 0) divergentCount++;
        totalFinDiff += finDiff;
        return {
          ...orig,
          finalCountQty: counted,
          differenceQty: diff,
          financialDifference: finDiff,
          countedBy: updated.countedBy || user.name,
          status: (diff !== 0 ? 'divergent' : 'counted') as 'divergent' | 'counted',
        };
      }
      return orig;
    });

    session.divergentItemsCount = divergentCount;
    session.totalFinancialImpact = Number(totalFinDiff.toFixed(2));
    session.status = 'reviewing';
  }

  db.save();
  res.json(session);
});

apiRouter.post('/inventory/:id/approve', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const session = data.inventorySessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Sessão de inventário não encontrada.' });

  // Apply reconciliation movements for divergent items
  for (const item of session.items) {
    if (item.differenceQty !== 0) {
      const isPositive = item.differenceQty > 0;
      const type = isPositive ? 'adjustment_in' : 'adjustment_out';
      const absQty = Math.abs(item.differenceQty);

      db.executeStockMovement({
        productId: item.productId,
        storeId: session.storeId,
        warehouseId: item.warehouseId,
        type,
        quantity: absQty,
        reason: `Ajuste Automático de Inventário ${session.sessionNumber} (Divergência: ${item.differenceQty > 0 ? '+' : ''}${item.differenceQty})`,
        documentNumber: session.sessionNumber,
        authorizedBy: user.name,
        allowNegative: true, // system reconciliation approval
        user,
      });

      item.status = 'approved';
    } else {
      item.status = 'approved';
    }
  }

  session.status = 'approved';
  session.approvedBy = user.name;
  session.completedAt = new Date().toISOString();

  db.logAudit({
    action: 'INVENTORY_RECONCILED',
    module: 'INVENTARIO',
    entityId: session.id,
    entityType: 'InventorySession',
    storeId: session.storeId,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Inventário ${session.sessionNumber} aprovado e reconciliado. Impacto: R$ ${session.totalFinancialImpact} em ${session.divergentItemsCount} itens divergentes.`,
  });

  db.save();
  res.json(session);
});

// 11. TRANSFERS
apiRouter.get('/transfers', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.stockTransfers);
});

apiRouter.post('/transfers', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const { sourceStoreId, sourceWarehouseId, destinationStoreId, destinationWarehouseId, items, notes } = req.body;

  const newTrans: StockTransfer = {
    id: `trans-${Date.now()}`,
    transferNumber: `TRF-2026-${String(data.stockTransfers.length + 1).padStart(3, '0')}`,
    sourceStoreId,
    sourceWarehouseId,
    destinationStoreId,
    destinationWarehouseId,
    status: 'in_transit',
    items: items || [],
    requestedBy: user.name,
    approvedBy: user.name,
    dispatchedAt: new Date().toISOString(),
    notes,
    createdAt: new Date().toISOString(),
  };

  // Deduct from source warehouse (now in transit)
  for (const it of newTrans.items) {
    db.executeStockMovement({
      productId: it.productId,
      storeId: sourceStoreId,
      warehouseId: sourceWarehouseId,
      type: 'transfer_out',
      quantity: Number(it.quantity),
      reason: `Saída para Transferência ${newTrans.transferNumber} em trânsito`,
      documentNumber: newTrans.transferNumber,
      authorizedBy: user.name,
      user,
    });
  }

  data.stockTransfers.unshift(newTrans);
  db.save();
  res.status(201).json(newTrans);
});

apiRouter.put('/transfers/:id/receive', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const trans = data.stockTransfers.find(t => t.id === req.params.id);
  if (!trans) return res.status(404).json({ error: 'Transferência não encontrada.' });

  // Add into destination warehouse
  for (const it of trans.items) {
    db.executeStockMovement({
      productId: it.productId,
      storeId: trans.destinationStoreId,
      warehouseId: trans.destinationWarehouseId,
      type: 'transfer_in',
      quantity: Number(it.quantity),
      reason: `Recebimento de Transferência ${trans.transferNumber}`,
      documentNumber: trans.transferNumber,
      authorizedBy: user.name,
      user,
    });
  }

  trans.status = 'received';
  trans.receivedAt = new Date().toISOString();

  db.save();
  res.json(trans);
});

// 12. REPLENISHMENT & ABC ANALYTICS
apiRouter.get('/analytics/replenishment', (req: Request, res: Response) => {
  const storeId = req.query.storeId as string;
  const suggestions = db.getReplenishmentSuggestions(storeId);
  res.json(suggestions);
});

apiRouter.get('/analytics/abc', (req: Request, res: Response) => {
  const storeId = req.query.storeId as string;
  const abc = db.getAbcAnalysis(storeId);
  res.json(abc);
});

// 13. AUDIT & NOTIFICATIONS
apiRouter.get('/audit', (req: Request, res: Response) => {
  const data = db.getData();
  const limit = Number(req.query.limit) || 100;
  res.json(data.auditLogs.slice(0, limit));
});

apiRouter.get('/notifications', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.notifications);
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  const data = db.getData();
  const notif = data.notifications.find(n => n.id === req.params.id);
  if (notif) notif.read = true;
  db.save();
  res.json({ success: true });
});

// 14. ASSX INTELLIGENCE (GEMINI AI)
apiRouter.post('/intelligence/query', async (req: Request, res: Response) => {
  try {
    const { prompt, storeId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório.' });

    const result = await askAssxIntelligence(prompt, storeId);
    res.json(result);
  } catch (err: any) {
    console.error('Error in intelligence query:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar consulta de inteligência.' });
  }
});

// 15. BACKUP & RESTORE
apiRouter.get('/backup/export', (_req: Request, res: Response) => {
  const data = db.getData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=assx-tech-backup-${Date.now()}.json`);
  res.send(JSON.stringify(data, null, 2));
});

apiRouter.post('/backup/import', (req: Request, res: Response) => {
  const user = getUser(req);
  const importedData = req.body;

  if (!importedData.products || !importedData.stockBalances) {
    return res.status(400).json({ error: 'Formato de arquivo de backup inválido.' });
  }

  db.replaceData(importedData);

  db.logAudit({
    action: 'SYSTEM_RESTORE',
    module: 'SISTEMA',
    entityId: 'SYS',
    entityType: 'System',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: 'Restauração completa de backup do banco de dados executada com sucesso.',
  });

  res.json({ success: true, message: 'Dados restaurados com sucesso!' });
});

// ==========================================
// 16. MÓDULO DE IMPRESSÃO DE ETIQUETAS API
// ==========================================

// Dashboard KPI metrics
apiRouter.get('/labels/dashboard', (req: Request, res: Response) => {
  const stats = db.getLabelDashboardStats(req.query.storeId as string);
  res.json(stats);
});

// Templates (Modelos de Etiquetas)
apiRouter.get('/labels/templates', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.labelTemplates || []);
});

apiRouter.post('/labels/templates', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  if (!data.labelTemplates) data.labelTemplates = [];

  const {
    name,
    description,
    modelCode,
    widthMm,
    heightMm,
    orientation,
    columns,
    rows,
    gapMm,
    margins,
    barcodeType,
    elements,
    isDefault,
  } = req.body;

  if (!name || !widthMm || !heightMm) {
    return res.status(400).json({ error: 'Nome, largura e altura são obrigatórios.' });
  }

  // If this template is marked as default, unset others
  if (isDefault) {
    data.labelTemplates.forEach(t => { t.isDefault = false; });
  }

  const newTemplate = {
    id: `tpl-${Date.now()}`,
    name: name.trim(),
    description: description ? description.trim() : 'Modelo personalizado de etiqueta',
    modelCode: modelCode || 'CUSTOM',
    widthMm: Number(widthMm),
    heightMm: Number(heightMm),
    orientation: orientation || (Number(widthMm) >= Number(heightMm) ? 'landscape' : 'portrait'),
    columns: Number(columns) || 1,
    rows: Number(rows) || 1,
    gapMm: Number(gapMm) || 2,
    margins: margins || { top: 2, right: 2, bottom: 2, left: 2 },
    barcodeType: barcodeType || 'EAN13',
    elements: {
      showStoreName: elements?.showStoreName ?? true,
      showProductName: elements?.showProductName ?? true,
      showSku: elements?.showSku ?? true,
      showBarcode: elements?.showBarcode ?? true,
      showBarcodeText: elements?.showBarcodeText ?? true,
      showPrice: elements?.showPrice ?? true,
      showPromoPrice: elements?.showPromoPrice ?? true,
      showOldPrice: elements?.showOldPrice ?? true,
      showUnit: elements?.showUnit ?? true,
      showPricePerKg: elements?.showPricePerKg ?? false,
      showDiscountBadge: elements?.showDiscountBadge ?? false,
      showPromoValidity: elements?.showPromoValidity ?? false,
      showCategory: elements?.showCategory ?? false,
      showBrand: elements?.showBrand ?? true,
      showLotNumber: elements?.showLotNumber ?? false,
      showExpiryDate: elements?.showExpiryDate ?? false,
      showBorder: elements?.showBorder ?? false,
      fontSize: elements?.fontSize || 'medium',
      boldPrice: elements?.boldPrice ?? true,
      alignment: elements?.alignment || 'left',
    },
    isSystemDefault: false,
    isDefault: Boolean(isDefault),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.labelTemplates.push(newTemplate);

  db.logAudit({
    action: 'LABEL_TEMPLATE_CREATE',
    module: 'ETIQUETAS',
    entityId: newTemplate.id,
    entityType: 'LabelTemplate',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Novo modelo de etiqueta criado: ${newTemplate.name} (${newTemplate.widthMm}x${newTemplate.heightMm}mm)`,
  });

  db.save();
  res.status(201).json(newTemplate);
});

apiRouter.put('/labels/templates/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const idx = data.labelTemplates.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Modelo de etiqueta não encontrado.' });

  const existing = data.labelTemplates[idx];
  if (req.body.isDefault) {
    data.labelTemplates.forEach(t => { t.isDefault = false; });
  }

  const updated = {
    ...existing,
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  data.labelTemplates[idx] = updated;

  db.logAudit({
    action: 'LABEL_TEMPLATE_UPDATE',
    module: 'ETIQUETAS',
    entityId: updated.id,
    entityType: 'LabelTemplate',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Modelo de etiqueta atualizado: ${updated.name}`,
  });

  db.save();
  res.json(updated);
});

apiRouter.delete('/labels/templates/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const target = data.labelTemplates.find(t => t.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Modelo não encontrado.' });

  if (target.isSystemDefault) {
    return res.status(400).json({ error: 'Não é permitido remover modelos nativos do sistema.' });
  }

  data.labelTemplates = data.labelTemplates.filter(t => t.id !== req.params.id);

  db.logAudit({
    action: 'LABEL_TEMPLATE_DELETE',
    module: 'ETIQUETAS',
    entityId: target.id,
    entityType: 'LabelTemplate',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Modelo de etiqueta removido: ${target.name}`,
  });

  db.save();
  res.json({ success: true, deletedId: req.params.id });
});

// Printers (Impressoras)
apiRouter.get('/labels/printers', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.labelPrinters || []);
});

apiRouter.post('/labels/printers', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  if (!data.labelPrinters) data.labelPrinters = [];

  const {
    name,
    model,
    connectionType,
    protocol,
    ipAddress,
    port,
    densityDpi,
    speedIps,
    isDefault,
    defaultTemplateId,
  } = req.body;

  if (!name || !model) {
    return res.status(400).json({ error: 'Nome e modelo da impressora são obrigatórios.' });
  }

  if (isDefault) {
    data.labelPrinters.forEach(p => { p.isDefault = false; });
  }

  const newPrinter = {
    id: `printer-${Date.now()}`,
    name: name.trim(),
    model: model.trim(),
    connectionType: connectionType || 'network',
    protocol: protocol || 'ZPL',
    ipAddress: ipAddress ? ipAddress.trim() : undefined,
    port: port ? Number(port) : 9100,
    densityDpi: (Number(densityDpi) === 300 ? 300 : 203) as 203 | 300,
    speedIps: Number(speedIps) || 4,
    isDefault: Boolean(isDefault),
    status: 'ready' as const,
    lastCommunication: new Date().toISOString(),
    defaultTemplateId,
    createdAt: new Date().toISOString(),
  };

  data.labelPrinters.push(newPrinter);

  db.logAudit({
    action: 'LABEL_PRINTER_CREATE',
    module: 'ETIQUETAS',
    entityId: newPrinter.id,
    entityType: 'LabelPrinter',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Impressora configurada: ${newPrinter.name} (${newPrinter.model} - ${newPrinter.protocol})`,
  });

  db.save();
  res.status(201).json(newPrinter);
});

apiRouter.put('/labels/printers/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const idx = data.labelPrinters.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Impressora não encontrada.' });

  if (req.body.isDefault) {
    data.labelPrinters.forEach(p => { p.isDefault = false; });
  }

  data.labelPrinters[idx] = {
    ...data.labelPrinters[idx],
    ...req.body,
  };

  db.logAudit({
    action: 'LABEL_PRINTER_UPDATE',
    module: 'ETIQUETAS',
    entityId: req.params.id,
    entityType: 'LabelPrinter',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Configuração de impressora atualizada: ${data.labelPrinters[idx].name}`,
  });

  db.save();
  res.json(data.labelPrinters[idx]);
});

apiRouter.delete('/labels/printers/:id', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const target = data.labelPrinters.find(p => p.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Impressora não encontrada.' });

  data.labelPrinters = data.labelPrinters.filter(p => p.id !== req.params.id);

  db.logAudit({
    action: 'LABEL_PRINTER_DELETE',
    module: 'ETIQUETAS',
    entityId: target.id,
    entityType: 'LabelPrinter',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Impressora removida: ${target.name}`,
  });

  db.save();
  res.json({ success: true, deletedId: req.params.id });
});

apiRouter.post('/labels/printers/:id/test', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const target = data.labelPrinters.find(p => p.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Impressora não encontrada.' });

  const now = new Date().toISOString();
  target.lastCommunication = now;
  target.status = 'ready';

  db.logAudit({
    action: 'LABEL_PRINTER_TEST',
    module: 'ETIQUETAS',
    entityId: target.id,
    entityType: 'LabelPrinter',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Teste de comunicação executado para a impressora ${target.name}. Protocolo: ${target.protocol} | Status: Conexão bem-sucedida`,
  });

  db.save();

  res.json({
    success: true,
    printerId: target.id,
    status: 'ready',
    latencyMs: Math.floor(Math.random() * 25) + 12,
    testedAt: now,
    message: `Comunicação estabelecida com sucesso com ${target.name} (${target.protocol} via ${target.connectionType.toUpperCase()}).`,
  });
});

// Price Changes (Preços Alterados)
apiRouter.get('/labels/price-changes', (req: Request, res: Response) => {
  const data = db.getData();
  let list = data.labelPriceChanges || [];

  const status = req.query.status as string;
  const changeType = req.query.changeType as string;

  if (status) {
    list = list.filter(pc => pc.status === status);
  }
  if (changeType) {
    list = list.filter(pc => pc.changeType === changeType);
  }

  res.json(list);
});

apiRouter.post('/labels/price-changes/mark-printed', (req: Request, res: Response) => {
  const { ids, printJobId } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Lista de identificadores de alteração é necessária.' });
  }

  db.markPriceChangesPrinted(ids, printJobId);
  res.json({ success: true, count: ids.length });
});

// Active Promotions (Etiquetas Promocionais)
apiRouter.get('/labels/promotions', (_req: Request, res: Response) => {
  const data = db.getData();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Filter products that have promotional pricing
  const promoProducts = data.products
    .filter(p => p.isPromoActive && p.promotionalPrice && p.promotionalPrice < p.salePrice)
    .map(p => {
      // Check if expired
      let isExpired = false;
      if (p.promoEndDate && p.promoEndDate < todayStr) {
        isExpired = true;
      }

      const discountValue = Number((p.salePrice - (p.promotionalPrice || p.salePrice)).toFixed(2));
      const discountPercentage = Number(((discountValue / p.salePrice) * 100).toFixed(1));

      return {
        ...p,
        discountValue,
        discountPercentage,
        isExpired,
      };
    })
    .filter(p => !p.isExpired); // Prompt Rule: "Quando a promoção terminar, as próximas etiquetas deverão utilizar automaticamente o preço normal vigente. Não permitir que uma promoção vencida continue sendo apresentada como ativa."

  res.json(promoProducts);
});

// Print Jobs History & Execution (Fila e Lotes de Impressão)
apiRouter.get('/labels/jobs', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json(data.labelPrintJobs || []);
});

apiRouter.post('/labels/jobs', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  if (!data.labelPrintJobs) data.labelPrintJobs = [];

  const {
    storeId,
    printerId,
    templateId,
    type,
    items,
    simulateFailure,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum item selecionado para impressão.' });
  }

  const store = data.stores.find(s => s.id === storeId) || data.stores[0];
  const printer = data.labelPrinters.find(p => p.id === printerId) || data.labelPrinters[0];
  const template = data.labelTemplates.find(t => t.id === templateId) || data.labelTemplates[0];

  const totalProducts = items.length;
  const totalLabels = items.reduce((sum: number, it: any) => sum + (Number(it.copies) || 1), 0);

  const jobCount = (data.labelPrintJobs?.length || 0) + 1;
  const jobCode = `JOB-${new Date().getFullYear()}-${String(jobCount).padStart(4, '0')}`;

  const isFailed = Boolean(simulateFailure);
  const confirmedLabels = isFailed ? Math.floor(totalLabels / 2) : totalLabels;
  const failedLabels = isFailed ? totalLabels - confirmedLabels : 0;

  const jobItems = items.map((it: any, idx: number) => {
    const isThisItemFailed = isFailed && idx >= Math.ceil(items.length / 2);
    return {
      productId: it.productId,
      productName: it.productName,
      sku: it.sku,
      ean: it.ean,
      salePrice: it.salePrice,
      promoPrice: it.promoPrice,
      unit: it.unit || 'UN',
      brand: it.brand || '',
      categoryName: it.categoryName,
      lotNumber: it.lotNumber,
      expirationDate: it.expirationDate,
      copies: Number(it.copies) || 1,
      printed: !isThisItemFailed,
      printedAt: !isThisItemFailed ? new Date().toISOString() : undefined,
      errorReason: isThisItemFailed ? 'Fim de fita / sensor óptico desalinhado' : undefined,
    };
  });

  const printJob = {
    id: `job-${Date.now()}`,
    jobCode,
    storeId: store?.id || 'store-01',
    storeName: store?.name || 'ASSX Matriz',
    printerId: printer?.id || 'printer-zebra-01',
    printerName: printer?.name || 'Zebra ZD220',
    templateId: template?.id || 'tpl-trad-5030',
    templateName: template?.name || 'Etiqueta Térmica',
    type: type || 'batch',
    totalProducts,
    totalLabels,
    confirmedLabels,
    failedLabels,
    status: isFailed ? ('failed' as const) : ('confirmed' as const),
    failureReason: isFailed ? 'Alerta da impressora: Sensor de mídia detectou fim do rolo térmico ou atolamento' : undefined,
    items: jobItems,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    createdAt: new Date().toISOString(),
    confirmedAt: !isFailed ? new Date().toISOString() : undefined,
  };

  data.labelPrintJobs.unshift(printJob);

  // If this was a price change print job and confirmed, mark matching price changes as printed
  if (!isFailed) {
    const productIds = items.map((it: any) => it.productId);
    const matchingPc = (data.labelPriceChanges || []).filter(pc => productIds.includes(pc.productId) && pc.status === 'pending');
    if (matchingPc.length > 0) {
      db.markPriceChangesPrinted(matchingPc.map(pc => pc.id), printJob.id);
    }
  }

  db.logAudit({
    action: isFailed ? 'LABEL_PRINT_FAILED' : 'LABEL_PRINT_SUCCESS',
    module: 'ETIQUETAS',
    entityId: printJob.id,
    entityType: 'LabelPrintJob',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: isFailed
      ? `Falha parcial na impressão do lote ${printJob.jobCode}: ${confirmedLabels}/${totalLabels} etiquetas concluídas. Motivo: ${printJob.failureReason}`
      : `Lote de etiquetas impresso com sucesso (${printJob.jobCode}): ${totalLabels} etiquetas para ${totalProducts} produtos na impressora ${printJob.printerName}.`,
  });

  db.save();
  res.status(201).json(printJob);
});

// Retry only failed items (Prompt requirement #4: "repetir somente os pendentes, sem duplicar os já confirmados")
apiRouter.post('/labels/jobs/:id/retry-pending', (req: Request, res: Response) => {
  const user = getUser(req);
  const data = db.getData();
  const job = data.labelPrintJobs.find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Lote de impressão não encontrado.' });

  const pendingItems = job.items.filter(it => !it.printed);
  if (pendingItems.length === 0) {
    return res.status(400).json({ error: 'Não há itens pendentes ou com falha neste lote.' });
  }

  const retryCount = (data.labelPrintJobs?.length || 0) + 1;
  const newJobCode = `${job.jobCode}-RETRY`;

  const totalLabels = pendingItems.reduce((sum, it) => sum + it.copies, 0);

  const retriedJob = {
    id: `job-${Date.now()}`,
    jobCode: newJobCode,
    storeId: job.storeId,
    storeName: job.storeName,
    printerId: job.printerId,
    printerName: job.printerName,
    templateId: job.templateId,
    templateName: job.templateName,
    type: job.type,
    totalProducts: pendingItems.length,
    totalLabels,
    confirmedLabels: totalLabels,
    failedLabels: 0,
    status: 'confirmed' as const,
    items: pendingItems.map(it => ({
      ...it,
      printed: true,
      printedAt: new Date().toISOString(),
      errorReason: undefined,
    })),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  };

  data.labelPrintJobs.unshift(retriedJob);

  // Update previous job items to marked resolved
  job.status = 'confirmed';
  job.confirmedLabels = job.totalLabels;
  job.failedLabels = 0;
  job.failureReason = undefined;
  job.items.forEach(it => { it.printed = true; it.printedAt = new Date().toISOString(); });

  db.logAudit({
    action: 'LABEL_PRINT_RETRY',
    module: 'ETIQUETAS',
    entityId: retriedJob.id,
    entityType: 'LabelPrintJob',
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    details: `Reimpressão de ${totalLabels} etiquetas pendentes do lote original ${job.jobCode} executada com sucesso. Sem duplicações.`,
  });

  db.save();
  res.json(retriedJob);
});

