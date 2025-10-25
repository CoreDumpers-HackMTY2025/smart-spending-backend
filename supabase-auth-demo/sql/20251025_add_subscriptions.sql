-- Crear tabla de suscripciones
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES public.categories(id) ON DELETE SET NULL,
  merchant TEXT,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  every_n INTEGER NOT NULL DEFAULT 1 CHECK (every_n > 0),
  unit TEXT NOT NULL CHECK (unit IN ('day','week','month','year')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_charge_at TIMESTAMPTZ NOT NULL,
  last_charge_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_next_charge_at_idx ON public.subscriptions(next_charge_at);

-- Activar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'select_own_subscriptions'
  ) THEN
    CREATE POLICY select_own_subscriptions ON public.subscriptions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'insert_own_subscriptions'
  ) THEN
    CREATE POLICY insert_own_subscriptions ON public.subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'update_own_subscriptions'
  ) THEN
    CREATE POLICY update_own_subscriptions ON public.subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'delete_own_subscriptions'
  ) THEN
    CREATE POLICY delete_own_subscriptions ON public.subscriptions
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;