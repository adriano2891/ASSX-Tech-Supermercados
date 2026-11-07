-- =====================================================================
-- ASSX TECH SUPERMERCADOS — MÓDULO DE IMPRESSÃO DE ETIQUETAS
-- SCHEMA DE BANCO DE DADOS SUPABASE (PostgreSQL + RLS)
-- =====================================================================

-- 1. TABELA: label_templates (Modelos de Etiquetas e Formatos)
CREATE TABLE IF NOT EXISTS public.label_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  model_code VARCHAR(50) NOT NULL DEFAULT 'CUSTOM', -- 'A_TRADITIONAL', 'B_GONDOLA', 'C_PROMOTIONAL', 'D_IDENTIFICATION', 'E_PRODUCE'
  width_mm NUMERIC(6,2) NOT NULL DEFAULT 50.0,
  height_mm NUMERIC(6,2) NOT NULL DEFAULT 30.0,
  orientation VARCHAR(20) NOT NULL DEFAULT 'landscape', -- 'landscape', 'portrait'
  columns_per_page INTEGER NOT NULL DEFAULT 1,
  rows_per_page INTEGER NOT NULL DEFAULT 1,
  gap_mm NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  margin_top_mm NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  margin_right_mm NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  margin_bottom_mm NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  margin_left_mm NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  barcode_type VARCHAR(30) NOT NULL DEFAULT 'EAN13',
  elements JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA: label_printers (Parque de Impressoras Térmicas e Rede)
CREATE TABLE IF NOT EXISTS public.label_printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  model VARCHAR(100) NOT NULL,
  connection_type VARCHAR(50) NOT NULL DEFAULT 'network', -- 'network', 'usb', 'local_agent', 'browser_pdf'
  protocol VARCHAR(30) NOT NULL DEFAULT 'ZPL', -- 'ZPL', 'EPL', 'ESC_POS', 'PDF'
  ip_address VARCHAR(45),
  port INTEGER DEFAULT 9100,
  density_dpi INTEGER NOT NULL DEFAULT 203,
  speed_ips INTEGER NOT NULL DEFAULT 4,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(30) NOT NULL DEFAULT 'ready', -- 'online', 'ready', 'offline', 'error'
  last_communication TIMESTAMPTZ,
  default_template_id UUID REFERENCES public.label_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA: label_price_changes (Auditoria de Reajustes e Pendências de Etiquetas)
CREATE TABLE IF NOT EXISTS public.label_price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  ean VARCHAR(50) NOT NULL,
  category_id VARCHAR(100),
  category_name VARCHAR(100),
  previous_price NUMERIC(10,2) NOT NULL,
  new_price NUMERIC(10,2) NOT NULL,
  difference NUMERIC(10,2) NOT NULL,
  percentage_change NUMERIC(6,2) NOT NULL,
  change_type VARCHAR(20) NOT NULL, -- 'increase', 'decrease'
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  changed_by VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'printed'
  printed_at TIMESTAMPTZ,
  print_job_id UUID
);

-- 4. TABELA: label_print_jobs (Lotes de Impressão e Auditoria Operacional)
CREATE TABLE IF NOT EXISTS public.label_print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code VARCHAR(50) NOT NULL UNIQUE,
  store_id VARCHAR(100) NOT NULL,
  store_name VARCHAR(150) NOT NULL,
  printer_id UUID REFERENCES public.label_printers(id) ON DELETE SET NULL,
  printer_name VARCHAR(150) NOT NULL,
  template_id UUID REFERENCES public.label_templates(id) ON DELETE SET NULL,
  template_name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'batch', -- 'single', 'batch', 'sector', 'price_change', 'promo', 'receiving'
  total_products INTEGER NOT NULL DEFAULT 0,
  total_labels INTEGER NOT NULL DEFAULT 0,
  confirmed_labels INTEGER NOT NULL DEFAULT 0,
  failed_labels INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'requested', -- 'requested', 'sent', 'confirmed', 'failed'
  failure_reason TEXT,
  zpl_content TEXT,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(150) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  confirmed_at TIMESTAMPTZ
);

-- 5. TABELA: label_print_items (Itens de cada Lote de Impressão)
CREATE TABLE IF NOT EXISTS public.label_print_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.label_print_jobs(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  ean VARCHAR(50) NOT NULL,
  sale_price NUMERIC(10,2) NOT NULL,
  promo_price NUMERIC(10,2),
  unit VARCHAR(10) NOT NULL DEFAULT 'UN',
  brand VARCHAR(100),
  lot_number VARCHAR(100),
  expiration_date DATE,
  copies INTEGER NOT NULL DEFAULT 1,
  printed BOOLEAN NOT NULL DEFAULT false,
  printed_at TIMESTAMPTZ,
  error_reason TEXT
);

-- ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_label_price_changes_status ON public.label_price_changes(status);
CREATE INDEX IF NOT EXISTS idx_label_price_changes_product ON public.label_price_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_label_print_jobs_created ON public.label_print_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_label_print_items_job ON public.label_print_items(job_id);

-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_print_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso de leitura para usuários autenticados" ON public.label_templates FOR SELECT USING (true);
CREATE POLICY "Acesso de modificação para administradores e gerentes" ON public.label_templates FOR ALL USING (true);

CREATE POLICY "Acesso de leitura para impressoras" ON public.label_printers FOR SELECT USING (true);
CREATE POLICY "Acesso de modificação para impressoras" ON public.label_printers FOR ALL USING (true);

CREATE POLICY "Acesso de leitura e escrita para reajustes de preços" ON public.label_price_changes FOR ALL USING (true);
CREATE POLICY "Acesso de leitura e escrita para lotes de impressão" ON public.label_print_jobs FOR ALL USING (true);
CREATE POLICY "Acesso de leitura e escrita para itens de impressão" ON public.label_print_items FOR ALL USING (true);

-- =====================================================================
-- 6. TABELAS E VIEWS: VALOR TOTAL ESTIMADO DE VENDA & ESTOQUE FINANCEIRO
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.products (
  id VARCHAR(100) PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  ean VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(100),
  brand VARCHAR(100),
  unit VARCHAR(20) NOT NULL DEFAULT 'UN',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  profit_margin NUMERIC(6,2) DEFAULT 0.00,
  markup NUMERIC(6,2) DEFAULT 0.00,
  min_stock NUMERIC(12,2) NOT NULL DEFAULT 10.00,
  max_stock NUMERIC(12,2) NOT NULL DEFAULT 100.00,
  safety_stock NUMERIC(12,2) NOT NULL DEFAULT 5.00,
  supplier_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR(100) REFERENCES public.products(id) ON DELETE CASCADE,
  store_id VARCHAR(100) NOT NULL,
  warehouse_id VARCHAR(100) NOT NULL,
  physical_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  available_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  reserved_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  blocked_qty NUMERIC(12,3) NOT NULL DEFAULT 0.000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(product_id, store_id, warehouse_id)
);

-- VIEW OFICIAL SUPABASE DE AVALIAÇÃO FINANCEIRA DO ESTOQUE
-- Calcula Valor Total a Custo, Valor Total Estimado de Venda e Lucro Bruto Potencial
CREATE OR REPLACE VIEW public.v_products_stock_valuation AS
SELECT
  p.id AS product_id,
  p.code,
  p.sku,
  p.ean,
  p.name AS product_name,
  p.brand,
  p.category_id,
  p.unit,
  p.cost_price,
  p.sale_price,
  -- 4. MARGEM BRUTA E MARKUP
  CASE 
    WHEN p.sale_price > 0 THEN ROUND(((p.sale_price - p.cost_price) / p.sale_price) * 100, 2)
    ELSE 0.00
  END AS margem_bruta_pct,
  CASE 
    WHEN p.cost_price > 0 THEN ROUND(((p.sale_price - p.cost_price) / p.cost_price) * 100, 2)
    ELSE 0.00
  END AS markup_pct,
  -- SALDO FÍSICO CONSOLIDADO
  COALESCE(SUM(sb.physical_qty), 0.000) AS saldo_fisico,
  -- 2. VALOR TOTAL A CUSTO (Saldo Físico × Preço de Custo)
  ROUND(COALESCE(SUM(sb.physical_qty), 0.000) * p.cost_price, 2) AS valor_total_a_custo,
  -- 1. VALOR TOTAL ESTIMADO DE VENDA (Saldo Físico × Preço de Venda Unitário)
  ROUND(COALESCE(SUM(sb.physical_qty), 0.000) * p.sale_price, 2) AS valor_total_estimado_venda,
  -- 3. LUCRO BRUTO POTENCIAL ((Saldo × Venda) - (Saldo × Custo))
  ROUND(
    (COALESCE(SUM(sb.physical_qty), 0.000) * p.sale_price) - 
    (COALESCE(SUM(sb.physical_qty), 0.000) * p.cost_price), 
    2
  ) AS lucro_bruto_potencial,
  p.min_stock,
  CASE WHEN COALESCE(SUM(sb.physical_qty), 0.000) <= p.min_stock THEN true ELSE false END AS is_stock_critical
FROM public.products p
LEFT JOIN public.stock_balances sb ON sb.product_id = p.id
GROUP BY p.id, p.code, p.sku, p.ean, p.name, p.brand, p.category_id, p.unit, p.cost_price, p.sale_price, p.min_stock;

-- FUNÇÃO RPC SUPABASE: Resumo financeiro consolidado
CREATE OR REPLACE FUNCTION public.get_stock_financial_summary(p_store_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
  total_items BIGINT,
  total_physical_units NUMERIC,
  capital_investido_custo NUMERIC,
  valor_potencial_venda NUMERIC,
  lucro_bruto_potencial NUMERIC,
  margem_bruta_estimada_geral NUMERIC,
  markup_geral_estimado NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT 
      v.product_id,
      v.saldo_fisico,
      v.valor_total_a_custo,
      v.valor_total_estimado_venda,
      v.lucro_bruto_potencial
    FROM public.v_products_stock_valuation v
  )
  SELECT 
    COUNT(product_id) AS total_items,
    COALESCE(SUM(saldo_fisico), 0) AS total_physical_units,
    COALESCE(SUM(valor_total_a_custo), 0) AS capital_investido_custo,
    COALESCE(SUM(valor_total_estimado_venda), 0) AS valor_potencial_venda,
    COALESCE(SUM(lucro_bruto_potencial), 0) AS lucro_bruto_potencial,
    CASE 
      WHEN SUM(valor_total_estimado_venda) > 0 
      THEN ROUND((SUM(lucro_bruto_potencial) / SUM(valor_total_estimado_venda)) * 100, 2)
      ELSE 0.00 
    END AS margem_bruta_estimada_geral,
    CASE 
      WHEN SUM(valor_total_a_custo) > 0 
      THEN ROUND((SUM(lucro_bruto_potencial) / SUM(valor_total_a_custo)) * 100, 2)
      ELSE 0.00 
    END AS markup_geral_estimado
  FROM base;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 6. SISTEMA DE OPERADORES, PERMISSÕES E SESSÕES (SUPABASE RLS)
-- =====================================================================

-- TABELA: operators (Cadastro Central de Operadores do Supermercado)
CREATE TABLE IF NOT EXISTS public.operators (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'stockist', -- 'superadmin', 'manager', 'stockist', 'buyer', 'checker', 'auditor', 'cashier'
  job_title VARCHAR(100) NOT NULL DEFAULT 'Operador',
  department VARCHAR(100) NOT NULL DEFAULT 'Operações',
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  store_ids JSONB NOT NULL DEFAULT '["store-01"]'::jsonb,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  login_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- TABELA: operator_sessions (Registro de Sessões de Acesso Operacional)
CREATE TABLE IF NOT EXISTS public.operator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id VARCHAR(50) NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  token VARCHAR(100) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  is_active BOOLEAN NOT NULL DEFAULT true,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ
);

-- TABELA: operator_audit_logs (Trilha Imutável de Auditoria de Operadores)
CREATE TABLE IF NOT EXISTS public.operator_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'PERMISSIONS_UPDATE', 'OPERATOR_STATUS_CHANGE', 'UNAUTHORIZED_ACCESS_ATTEMPT'
  module VARCHAR(50) NOT NULL DEFAULT 'AUTENTICACAO',
  entity_id VARCHAR(100),
  entity_type VARCHAR(50),
  operator_id VARCHAR(50) NOT NULL,
  operator_name VARCHAR(150) NOT NULL,
  operator_role VARCHAR(50) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- HABILITAR RLS NAS TABELAS DE OPERADORES
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_audit_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Leitura de operadores para operadores autenticados
CREATE POLICY "Permitir leitura de operadores para autenticados"
  ON public.operators
  FOR SELECT
  USING (true);

-- POLÍTICA 2: Apenas Super Admin pode criar, editar ou excluir operadores
CREATE POLICY "Superadmin tem controle exclusivo sobre operadores"
  ON public.operators
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'superadmin' OR
    EXISTS (
      SELECT 1 FROM public.operators 
      WHERE id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') 
      AND role = 'superadmin'
    )
  );

-- TRIGGER DE SEGURANÇA: Proteger o Super Administrador contra rebaixamento ou exclusão
CREATE OR REPLACE FUNCTION public.protect_superadmin()
RETURNS TRIGGER AS $$
BEGIN
  -- Impedir remoção do superadmin
  IF TG_OP = 'DELETE' AND (OLD.role = 'superadmin' OR OLD.id = 'usr-super') THEN
    RAISE EXCEPTION 'Não é permitido excluir o Super Administrador central do sistema.';
  END IF;

  -- Impedir inativação ou troca de papel do superadmin principal
  IF TG_OP = 'UPDATE' AND (OLD.id = 'usr-super' OR OLD.role = 'superadmin') THEN
    IF NEW.role != 'superadmin' THEN
      RAISE EXCEPTION 'Não é permitido revogar os privilégios do Super Administrador.';
    END IF;
    IF NEW.status = 'inactive' THEN
      RAISE EXCEPTION 'Não é permitido desativar o Super Administrador central.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_superadmin ON public.operators;
CREATE TRIGGER trg_protect_superadmin
  BEFORE UPDATE OR DELETE ON public.operators
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_superadmin();

