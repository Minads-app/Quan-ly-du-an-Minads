-- backfill_contracts_to_debts.sql
INSERT INTO debts (partner_id, type, total_amount, paid_amount, contract_id, notes)
SELECT 
    c.client_id, 
    'RECEIVABLE', 
    c.total_value, 
    COALESCE((SELECT SUM(amount) FROM transactions WHERE contract_id = c.id AND type = 'RECEIPT'), 0), 
    c.id, 
    'Công nợ phải thu của Hợp đồng: ' || c.name
FROM contracts c
WHERE c.id NOT IN (SELECT contract_id FROM debts WHERE contract_id IS NOT NULL);
