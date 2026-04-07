
-- Perfis de usuário
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Chaves PIX por perfil
CREATE TABLE public.pix_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  key_value text NOT NULL,
  label text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Cartões de crédito
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now()
);

-- Despesas pessoais
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  due_day integer,
  category text,
  payment_method text,
  card_id uuid REFERENCES public.cards(id),
  parcel_current integer,
  parcel_total integer,
  is_recurring boolean DEFAULT false,
  is_paid boolean DEFAULT false,
  notes text,
  month integer NOT NULL,
  year integer NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Recebíveis pessoais
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  person_name text NOT NULL,
  value numeric,
  due_day integer,
  parcel_current integer,
  parcel_total integer,
  pix_key text,
  is_received boolean DEFAULT false,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Devedores (aba Cobranças)
CREATE TABLE public.debtors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  monthly_value numeric,
  pix_key text,
  email text,
  is_recurring boolean DEFAULT true,
  due_day integer,
  created_at timestamptz DEFAULT now()
);

-- Histórico de cobranças
CREATE TABLE public.collection_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debtor_id uuid REFERENCES public.debtors(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  is_received boolean DEFAULT false,
  reminder_sent_at timestamptz,
  reminder_method text,
  created_at timestamptz DEFAULT now()
);

-- Lançamentos PJ
CREATE TABLE public.pj_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  value numeric NOT NULL,
  entry_date date,
  type text NOT NULL,
  category text,
  client text,
  payment_method text,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Metas PJ
CREATE TABLE public.pj_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  revenue_goal numeric,
  created_at timestamptz DEFAULT now()
);

-- Desabilitar RLS em todas as tabelas (sem autenticação por ora)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pj_goals DISABLE ROW LEVEL SECURITY;
