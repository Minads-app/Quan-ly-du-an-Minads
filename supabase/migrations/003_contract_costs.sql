-- ============================================================
-- Contract Costs + Auto Payable Debt Link
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- 1. Bảng chi phí hợp đồng
CREATE TABLE IF NOT EXISTS contract_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  cost_category TEXT NOT NULL DEFAULT 'KHAC',
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Link debts → contract_costs (ON DELETE CASCADE: xóa chi phí → xóa debt)
ALTER TABLE debts ADD COLUMN IF NOT EXISTS contract_cost_id UUID REFERENCES contract_costs(id) ON DELETE CASCADE;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_contract_costs_contract ON contract_costs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_costs_supplier ON contract_costs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_debts_contract_cost ON debts(contract_cost_id);

-- 4. RLS
ALTER TABLE contract_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_costs_select" ON contract_costs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contract_costs_insert" ON contract_costs
  FOR INSERT TO authenticated WITH CHECK (
    public.get_user_role() IN ('Admin', 'Accountant')
  );

CREATE POLICY "contract_costs_update" ON contract_costs
  FOR UPDATE TO authenticated USING (
    public.get_user_role() IN ('Admin', 'Accountant')
  );

CREATE POLICY "contract_costs_delete" ON contract_costs
  FOR DELETE TO authenticated USING (
    public.get_user_role() = 'Admin'
  );
