-- FIX v2: Tắt trigger, tạo user thủ công, rồi bật lại
-- Chạy từng bước trong Supabase SQL Editor

-- Bước 1: Xóa trigger cũ (để tạo user không bị lỗi)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Bước 2: Thêm INSERT policy cho profiles (thiếu ở migration gốc)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Bước 3: Cho phép service role insert (dùng cho trigger)
CREATE POLICY "profiles_service_insert" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Bước 4: Tạo lại trigger function với SET search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.email, '')),
    'Employee'::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bước 5: Tạo lại trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
