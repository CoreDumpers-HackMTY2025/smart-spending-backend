-- Migration: Add incomes table with RLS policies

-- Table: public.incomes
CREATE TABLE IF NOT EXISTS public.incomes (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  category_id bigint REFERENCES public.categories (id) ON DELETE SET NULL,
  source text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incomes_user ON public.incomes (user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_created ON public.incomes (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incomes' AND policyname = 'select_own_incomes'
  ) THEN
    CREATE POLICY select_own_incomes ON public.incomes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incomes' AND policyname = 'insert_own_incomes'
  ) THEN
    CREATE POLICY insert_own_incomes ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incomes' AND policyname = 'update_own_incomes'
  ) THEN
    CREATE POLICY update_own_incomes ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incomes' AND policyname = 'delete_own_incomes'
  ) THEN
    CREATE POLICY delete_own_incomes ON public.incomes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;