-- create_contract_receivables.sql
-- Thêm cột contract_id vào bảng debts để biết khoản nợ này thuộc hợp đồng nào
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

COMMENT ON COLUMN debts.contract_id IS 'Liên kết trực tiếp khoản Công nợ tới hợp đồng gốc. Xóa hợp đồng tự động xóa nợ.';

-- Trigger Function: Tự động tạo/sửa/xóa khoản Phải thu khách hàng (RECEIVABLE) tương ứng khi Hợp đồng thay đổi
CREATE OR REPLACE FUNCTION sync_contract_to_receivable_debt()
RETURNS TRIGGER AS $$
BEGIN
    -- Xử lý DELETE
    -- Khi hợp đồng bị xóa, công nợ (debts.contract_id) sẽ tự động biến mất nhờ ON DELETE CASCADE
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;

    -- Xử lý INSERT
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO debts (
            partner_id,
            type,
            total_amount,
            paid_amount,
            contract_id,
            notes
        ) 
        VALUES (
            NEW.client_id,
            'RECEIVABLE',
            NEW.total_value,
            0,
            NEW.id,
            'Công nợ phải thu của Hợp đồng: ' || NEW.name
        );
        RETURN NEW;
    END IF;

    -- Xử lý UPDATE
    IF (TG_OP = 'UPDATE') THEN
        -- Cập nhật tổng số tiền và tên đối tác (nếu có biến động)
        UPDATE debts
        SET total_amount = NEW.total_value,
            partner_id = NEW.client_id,
            notes = 'Công nợ phải thu của Hợp đồng: ' || NEW.name
        WHERE contract_id = NEW.id;
        
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Trigger trên bảng contracts
DROP TRIGGER IF EXISTS trigger_sync_contract_to_receivable_debt ON contracts;
CREATE TRIGGER trigger_sync_contract_to_receivable_debt
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION sync_contract_to_receivable_debt();
