-- ============================================================
-- Fix: handle_new_user() trigger — Ngăn Role Injection
-- Chạy file này trong Supabase SQL Editor
-- ============================================================
-- Vấn đề: Trigger cũ đọc role từ raw_user_meta_data, cho phép
-- user tự gán role Admin khi đăng ký.
-- Fix: Luôn hardcode role = 'Employee' cho user mới.
-- Admin chỉ được gán qua admin action (createUser server action).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'Employee'::user_role  -- Luôn là Employee, không đọc từ metadata
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
