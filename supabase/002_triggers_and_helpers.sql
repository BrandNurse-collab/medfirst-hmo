-- Run AFTER schema.sql in the Supabase SQL Editor

-- 1. Create a profile automatically when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, cohort)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'provider')::user_role,
    NULLIF(NEW.raw_user_meta_data->>'cohort','')
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Increase a member's utilised benefit
CREATE OR REPLACE FUNCTION public.increment_utilized(member_uuid UUID, amount NUMERIC)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  UPDATE members SET utilized_amount = utilized_amount + amount WHERE id = member_uuid;
$$;

-- 3. Admin check without RLS recursion, and admin power over profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "admin_update_any_profile" ON profiles FOR UPDATE USING (public.is_admin());

-- 4. Realtime for the pending-count badges
ALTER PUBLICATION supabase_realtime ADD TABLE authorizations, claims;
