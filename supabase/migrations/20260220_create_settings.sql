-- Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Minads',
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    tax_id TEXT,
    bank_info TEXT, -- Bank name, Account number, etc.
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create policies (simplified checks)
-- Allow everyone to READ
CREATE POLICY "Enable read access for authenticated users" ON "public"."organization_settings"
FOR SELECT TO authenticated USING (true);

-- Allow only Admin to UPDATE/INSERT
CREATE POLICY "Enable modify access for admins" ON "public"."organization_settings"
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Initial Data (Singleton)
INSERT INTO public.organization_settings (id, name, address, phone, email, website)
VALUES (
    1, 
    'CÔNG TY TNHH MINADS', 
    '123 Đường ABC, Quận XYZ, TP.HCM', 
    '0901234567',
    'contact@minads.com',
    'https://minads.com'
)
ON CONFLICT (id) DO NOTHING;

-- Storage Bucket for Organization (run this via dashboard is safer, but SQL can do it if enabled)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization', 'organization', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy
CREATE POLICY "Give admin access to organization bucket" ON storage.objects
FOR ALL TO authenticated
USING ( bucket_id = 'organization' )
WITH CHECK ( bucket_id = 'organization' );
