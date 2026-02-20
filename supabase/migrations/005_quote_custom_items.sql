-- ============================================================
-- Quote Items: cho phép nhập nội dung tự do (không bắt buộc chọn dịch vụ)
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- 1. Thêm cột custom_name, custom_unit và description
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS custom_name TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS custom_unit TEXT;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Cho phép service_id = NULL (nhập tự do)
ALTER TABLE quote_items ALTER COLUMN service_id DROP NOT NULL;
