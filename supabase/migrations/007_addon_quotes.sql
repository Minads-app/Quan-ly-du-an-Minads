-- add_addon_quotes.sql
-- Thêm cột contract_id vào bảng quotes
ALTER TABLE quotes 
ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

COMMENT ON COLUMN quotes.contract_id IS 'Reference to the contract this quote is an add-on for. Null if this is a base quote.';

-- Trigger Function: Update contract total_value when add-on quotes are modified
CREATE OR REPLACE FUNCTION update_contract_total_from_addon_quote()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process quotes that are linked as add-ons to a contract
    
    -- Xử lý DELETE
    IF (TG_OP = 'DELETE') THEN
        IF OLD.contract_id IS NOT NULL THEN
            UPDATE contracts
            SET total_value = total_value - OLD.total_amount
            WHERE id = OLD.contract_id;
        END IF;
        RETURN OLD;
    END IF;

    -- Xử lý INSERT
    IF (TG_OP = 'INSERT') THEN
        IF NEW.contract_id IS NOT NULL THEN
            UPDATE contracts
            SET total_value = total_value + NEW.total_amount
            WHERE id = NEW.contract_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Xử lý UPDATE
    IF (TG_OP = 'UPDATE') THEN
        -- Case 1: Cập nhật giá trị amount của một addon quote đang có
        IF NEW.contract_id IS NOT NULL AND OLD.contract_id IS NOT NULL AND NEW.contract_id = OLD.contract_id THEN
            IF NEW.total_amount != OLD.total_amount THEN
                UPDATE contracts
                SET total_value = total_value + (NEW.total_amount - OLD.total_amount)
                WHERE id = NEW.contract_id;
            END IF;
        -- Case 2: Đổi addon quote từ hợp đồng này sang hợp đồng khác (hiếm khi xảy ra nhưng phòng hờ)
        ELSIF NEW.contract_id IS NOT NULL AND OLD.contract_id IS NOT NULL AND NEW.contract_id != OLD.contract_id THEN
            -- Trừ ở hợp đồng cũ
            UPDATE contracts
            SET total_value = total_value - OLD.total_amount
            WHERE id = OLD.contract_id;
            -- Cộng vào hợp đồng mới
            UPDATE contracts
            SET total_value = total_value + NEW.total_amount
            WHERE id = NEW.contract_id;
        -- Case 3: Chuyển một báo giá bình thường thành addon quote
        ELSIF NEW.contract_id IS NOT NULL AND OLD.contract_id IS NULL THEN
            UPDATE contracts
            SET total_value = total_value + NEW.total_amount
            WHERE id = NEW.contract_id;
        -- Case 4: Huỷ liên kết addon quote với hợp đồng
        ELSIF NEW.contract_id IS NULL AND OLD.contract_id IS NOT NULL THEN
            UPDATE contracts
            SET total_value = total_value - OLD.total_amount
            WHERE id = OLD.contract_id;
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Tạo Trigger trên bảng quotes
DROP TRIGGER IF EXISTS trigger_update_contract_total_addon_quote ON quotes;
CREATE TRIGGER trigger_update_contract_total_addon_quote
AFTER INSERT OR UPDATE OR DELETE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_contract_total_from_addon_quote();
