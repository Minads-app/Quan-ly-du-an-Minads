-- ============================================================
-- ERP Mini - Database Schema Migration
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- ===================== ENUMS =====================

CREATE TYPE user_role AS ENUM ('Admin', 'Accountant', 'Employee');
CREATE TYPE partner_type AS ENUM ('Client', 'Supplier');
CREATE TYPE service_type AS ENUM ('Material', 'Labor', 'Service', 'Ads');
CREATE TYPE quote_status AS ENUM ('Draft', 'Sent', 'Approved');
CREATE TYPE project_type AS ENUM ('THI_CONG', 'DICH_VU');
CREATE TYPE project_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE debt_type AS ENUM ('RECEIVABLE', 'PAYABLE');

-- ===================== TABLES =====================

-- 1. Profiles (liên kết với auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'Employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Partners (Khách hàng / Nhà cung cấp)
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type partner_type NOT NULL,
  phone TEXT,
  address TEXT,
  tax_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Services (Dịch vụ / Vật tư)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'cái',
  type service_type NOT NULL DEFAULT 'Service',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Quotes (Báo giá)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  status quote_status NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Quote Items (Chi tiết báo giá)
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(5,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Contracts (Hợp đồng)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  signed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Projects (Dự án)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type project_type NOT NULL,
  status project_status NOT NULL DEFAULT 'NOT_STARTED',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Project Costs (Chi phí dự án)
CREATE TABLE project_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  cost_category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Debts (Công nợ)
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  type debt_type NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== INDEXES =====================

CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_quote ON contracts(quote_id);
CREATE INDEX idx_projects_contract ON projects(contract_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_assigned ON projects(assigned_to);
CREATE INDEX idx_project_costs_project ON project_costs(project_id);
CREATE INDEX idx_project_costs_supplier ON project_costs(supplier_id);
CREATE INDEX idx_debts_partner ON debts(partner_id);
CREATE INDEX idx_debts_type ON debts(type);
CREATE INDEX idx_debts_due_date ON debts(due_date);

-- ===================== UPDATED_AT TRIGGER =====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_partners
  BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_services
  BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_quotes
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_contracts
  BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_debts
  BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================== AUTO-CREATE PROFILE ON SIGNUP =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'Employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================== ROW LEVEL SECURITY (RLS) =====================

-- Bật RLS cho tất cả bảng
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Helper function: lấy role của user hiện tại
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- PROFILES ----
-- Tất cả authenticated users có thể đọc profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Users chỉ có thể update profile của chính mình (trừ role)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin có thể update tất cả profiles (bao gồm role)
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE TO authenticated USING (public.get_user_role() = 'Admin');

-- ---- PARTNERS ----
CREATE POLICY "partners_select" ON partners
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "partners_insert" ON partners
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "partners_update" ON partners
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "partners_delete" ON partners
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ---- SERVICES ----
CREATE POLICY "services_select" ON services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "services_insert" ON services
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "services_update" ON services
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "services_delete" ON services
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ---- QUOTES ----
CREATE POLICY "quotes_select" ON quotes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quotes_insert" ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant', 'Employee'));

CREATE POLICY "quotes_update" ON quotes
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_user_role() IN ('Admin', 'Accountant')
  );

CREATE POLICY "quotes_delete" ON quotes
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ---- QUOTE ITEMS ----
CREATE POLICY "quote_items_select" ON quote_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quote_items_insert" ON quote_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_id
      AND (quotes.created_by = auth.uid() OR public.get_user_role() IN ('Admin', 'Accountant'))
    )
  );

CREATE POLICY "quote_items_update" ON quote_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_id
      AND (quotes.created_by = auth.uid() OR public.get_user_role() IN ('Admin', 'Accountant'))
    )
  );

CREATE POLICY "quote_items_delete" ON quote_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_id
      AND (quotes.created_by = auth.uid() OR public.get_user_role() = 'Admin')
    )
  );

-- ---- CONTRACTS ----
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ---- PROJECTS ----
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR public.get_user_role() IN ('Admin', 'Accountant')
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');

-- ---- PROJECT COSTS ----
CREATE POLICY "project_costs_select" ON project_costs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_costs_insert" ON project_costs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.assigned_to = auth.uid() OR public.get_user_role() IN ('Admin', 'Accountant'))
    )
  );

CREATE POLICY "project_costs_update" ON project_costs
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.assigned_to = auth.uid() OR public.get_user_role() IN ('Admin', 'Accountant'))
    )
  );

CREATE POLICY "project_costs_delete" ON project_costs
  FOR DELETE TO authenticated USING (
    public.get_user_role() = 'Admin'
  );

-- ---- DEBTS ----
CREATE POLICY "debts_select" ON debts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "debts_insert" ON debts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "debts_update" ON debts
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "debts_delete" ON debts
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');
