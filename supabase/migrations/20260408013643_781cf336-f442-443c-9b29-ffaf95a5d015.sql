-- Add auth_user_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pix_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE pj_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pj_goals ENABLE ROW LEVEL SECURITY;

-- Helper function to get profile_id for current user (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Profiles: user can access only their own profile
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth_user_id = auth.uid());

-- Expenses
CREATE POLICY "users_own_expenses" ON expenses
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- Receivables
CREATE POLICY "users_own_receivables" ON receivables
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- Debtors
CREATE POLICY "users_own_debtors" ON debtors
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- Collection history (via debtor's profile)
CREATE POLICY "users_own_collection_history" ON collection_history
  FOR ALL USING (
    debtor_id IN (SELECT id FROM debtors WHERE profile_id = public.get_my_profile_id())
  );

-- Cards
CREATE POLICY "users_own_cards" ON cards
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- PIX keys
CREATE POLICY "users_own_pix_keys" ON pix_keys
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- PJ entries
CREATE POLICY "users_own_pj_entries" ON pj_entries
  FOR ALL USING (profile_id = public.get_my_profile_id());

-- PJ goals
CREATE POLICY "users_own_pj_goals" ON pj_goals
  FOR ALL USING (profile_id = public.get_my_profile_id());