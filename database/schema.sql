-- Smart Spending Backend — Database Schema
-- Postgres (Supabase compatible)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_user_category_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  category_id bigint REFERENCES public.categories (id) ON DELETE SET NULL,
  merchant text,
  description text,
  transport_type text,
  carbon_kg numeric(14,3) NOT NULL DEFAULT 0 CHECK (carbon_kg >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created ON public.expenses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category_id);

-- Incomes
CREATE TABLE IF NOT EXISTS public.incomes (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  category_id bigint REFERENCES public.categories (id) ON DELETE SET NULL,
  source text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user ON public.incomes (user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_created ON public.incomes (user_id, created_at DESC);

-- Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  limit_amount numeric(14,2) NOT NULL CHECK (limit_amount >= 0),
  spent_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  year int NOT NULL CHECK (year BETWEEN 2000 AND 9999),
  CONSTRAINT uniq_budget UNIQUE (user_id, category_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month_year ON public.budgets (user_id, month, year);

-- Savings Goals
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric(14,2) NOT NULL CHECK (target_amount > 0),
  saved_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals (user_id);

-- Achievements (static catalogue)
CREATE TABLE IF NOT EXISTS public.achievements (
  id bigserial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text,
  points int NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Achievements (unlocks)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  achievement_id bigint NOT NULL REFERENCES public.achievements (id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements (user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements (unlocked_at DESC);

-- Recommendation priority enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_priority') THEN
    CREATE TYPE recommendation_priority AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- Recommendations
CREATE TABLE IF NOT EXISTS public.recommendations (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  potential_savings numeric(14,2) NOT NULL DEFAULT 0,
  carbon_reduction numeric(14,3) NOT NULL DEFAULT 0,
  action_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority recommendation_priority NOT NULL DEFAULT 'medium',
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_seen ON public.recommendations (user_id, seen);

-- Triggers: keep budgets.spent_amount in sync with expenses
CREATE OR REPLACE FUNCTION public.fn_budget_spent_on_expense_insert() RETURNS trigger AS $$
DECLARE
  m int;
  y int;
BEGIN
  m := EXTRACT(MONTH FROM NEW.created_at)::int;
  y := EXTRACT(YEAR FROM NEW.created_at)::int;
  UPDATE public.budgets
    SET spent_amount = spent_amount + NEW.amount
    WHERE user_id = NEW.user_id AND category_id = NEW.category_id AND month = m AND year = y;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_budget_spent_on_expense_delete() RETURNS trigger AS $$
DECLARE
  m int;
  y int;
BEGIN
  m := EXTRACT(MONTH FROM OLD.created_at)::int;
  y := EXTRACT(YEAR FROM OLD.created_at)::int;
  UPDATE public.budgets
    SET spent_amount = GREATEST(spent_amount - OLD.amount, 0)
    WHERE user_id = OLD.user_id AND category_id = OLD.category_id AND month = m AND year = y;
  RETURN OLD;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_budget_spent_on_expense_update() RETURNS trigger AS $$
DECLARE
  old_m int; old_y int;
  new_m int; new_y int;
BEGIN
  old_m := EXTRACT(MONTH FROM OLD.created_at)::int;
  old_y := EXTRACT(YEAR FROM OLD.created_at)::int;
  new_m := EXTRACT(MONTH FROM NEW.created_at)::int;
  new_y := EXTRACT(YEAR FROM NEW.created_at)::int;

  -- Subtract from old bucket
  UPDATE public.budgets
    SET spent_amount = GREATEST(spent_amount - OLD.amount, 0)
    WHERE user_id = OLD.user_id AND category_id = OLD.category_id AND month = old_m AND year = old_y;

  -- Add to new bucket
  UPDATE public.budgets
    SET spent_amount = spent_amount + NEW.amount
    WHERE user_id = NEW.user_id AND category_id = NEW.category_id AND month = new_m AND year = new_y;

  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_spent_ins ON public.expenses;
CREATE TRIGGER trg_budget_spent_ins
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_budget_spent_on_expense_insert();

DROP TRIGGER IF EXISTS trg_budget_spent_del ON public.expenses;
CREATE TRIGGER trg_budget_spent_del
AFTER DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_budget_spent_on_expense_delete();

DROP TRIGGER IF EXISTS trg_budget_spent_upd ON public.expenses;
CREATE TRIGGER trg_budget_spent_upd
AFTER UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_budget_spent_on_expense_update();

-- Optional: Row Level Security (RLS) policies for user tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- SELECT policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_categories') THEN
    CREATE POLICY select_own_categories ON public.categories FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_expenses') THEN
    CREATE POLICY select_own_expenses ON public.expenses FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_incomes') THEN
    CREATE POLICY select_own_incomes ON public.incomes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_budgets') THEN
    CREATE POLICY select_own_budgets ON public.budgets FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_savings') THEN
    CREATE POLICY select_own_savings ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_user_achievements') THEN
    CREATE POLICY select_own_user_achievements ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_recommendations') THEN
    CREATE POLICY select_own_recommendations ON public.recommendations FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- INSERT policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_categories') THEN
    CREATE POLICY insert_own_categories ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_expenses') THEN
    CREATE POLICY insert_own_expenses ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_incomes') THEN
    CREATE POLICY insert_own_incomes ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_budgets') THEN
    CREATE POLICY insert_own_budgets ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_savings') THEN
    CREATE POLICY insert_own_savings ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_user_achievements') THEN
    CREATE POLICY insert_own_user_achievements ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_recommendations') THEN
    CREATE POLICY insert_own_recommendations ON public.recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- UPDATE policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_categories') THEN
    CREATE POLICY update_own_categories ON public.categories FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_expenses') THEN
    CREATE POLICY update_own_expenses ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_incomes') THEN
    CREATE POLICY update_own_incomes ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_budgets') THEN
    CREATE POLICY update_own_budgets ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_savings') THEN
    CREATE POLICY update_own_savings ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_recommendations') THEN
    CREATE POLICY update_own_recommendations ON public.recommendations FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- DELETE policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_categories') THEN
    CREATE POLICY delete_own_categories ON public.categories FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_expenses') THEN
    CREATE POLICY delete_own_expenses ON public.expenses FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_incomes') THEN
    CREATE POLICY delete_own_incomes ON public.incomes FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_budgets') THEN
    CREATE POLICY delete_own_budgets ON public.budgets FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_savings') THEN
    CREATE POLICY delete_own_savings ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_recommendations') THEN
    CREATE POLICY delete_own_recommendations ON public.recommendations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Profiles RLS and Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_own_profile') THEN
    CREATE POLICY select_own_profile ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_own_profile') THEN
    CREATE POLICY insert_own_profile ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_own_profile') THEN
    CREATE POLICY update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'delete_own_profile') THEN
    CREATE POLICY delete_own_profile ON public.profiles FOR DELETE USING (auth.uid() = id);
  END IF;
END $$;

-- Sync profiles with auth.users on signup
CREATE OR REPLACE FUNCTION public.fn_handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- Keep profiles.email in sync with auth.users email
CREATE OR REPLACE FUNCTION public.fn_handle_user_email_update() RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_user_email_update();

-- updated_at maintenance on profiles
CREATE OR REPLACE FUNCTION public.fn_profiles_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_profiles_set_updated_at();