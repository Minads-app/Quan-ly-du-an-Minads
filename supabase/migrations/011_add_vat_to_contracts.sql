-- ============================================================
-- Add vat_rate to contracts table
-- VAT is tax obligation, separate from business revenue
-- ============================================================

-- Add vat_rate column (default 0 = no VAT)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Backfill: copy vat_rate from linked quotes where available
UPDATE contracts c
SET vat_rate = COALESCE(q.vat_rate, 0)
FROM quotes q
WHERE c.quote_id = q.id
  AND c.vat_rate = 0
  AND q.vat_rate IS NOT NULL
  AND q.vat_rate > 0;
