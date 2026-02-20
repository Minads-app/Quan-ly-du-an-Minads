-- ============================================================
-- Transactions (Phiếu thu / Phiếu chi)
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- 1. Enum loại giao dịch
DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('RECEIPT', 'PAYMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Bảng giao dịch
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_partner ON transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_contract ON transactions(contract_id);
CREATE INDEX IF NOT EXISTS idx_transactions_debt ON transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- 4. RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('Admin', 'Accountant'));

CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'Admin');
