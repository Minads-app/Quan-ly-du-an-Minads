-- ============================================================
-- Fix Storage Policy: organization bucket
-- Chạy file này trong Supabase SQL Editor
-- ============================================================
-- Vấn đề: Policy cũ cho phép TẤT CẢ authenticated user có quyền ALL
-- trên bucket organization (bao gồm upload, xóa file).
-- Fix: Tách thành 3 policy riêng biệt:
--   1. Tất cả user đọc được
--   2. Chỉ Admin được upload
--   3. Chỉ Admin được xóa/sửa

-- Xóa policy cũ (tên chính xác từ migration 20260220_create_settings.sql)
DROP POLICY IF EXISTS "Give admin access to organization bucket" ON storage.objects;

-- 1. Cho phép tất cả authenticated users đọc file từ bucket organization
CREATE POLICY "organization_read_access" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'organization');

-- 2. Chỉ Admin được upload file
CREATE POLICY "organization_admin_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'organization'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);

-- 3. Chỉ Admin được cập nhật file
CREATE POLICY "organization_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'organization'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);

-- 4. Chỉ Admin được xóa file
CREATE POLICY "organization_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'organization'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);
