
CREATE TABLE public.tg_users (
  tg_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  language_code TEXT,
  has_miner BOOLEAN NOT NULL DEFAULT false,
  bonus_day INT NOT NULL DEFAULT 1,
  last_bonus DATE,
  earned_usd NUMERIC NOT NULL DEFAULT 0,
  sessions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.tg_users TO service_role;
ALTER TABLE public.tg_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access tg_users" ON public.tg_users FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.tg_balances (
  tg_id BIGINT NOT NULL REFERENCES public.tg_users(tg_id) ON DELETE CASCADE,
  sym TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tg_id, sym)
);
GRANT ALL ON public.tg_balances TO service_role;
ALTER TABLE public.tg_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access tg_balances" ON public.tg_balances FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.tg_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tg_id BIGINT NOT NULL REFERENCES public.tg_users(tg_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  sym TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  usd NUMERIC NOT NULL,
  kind TEXT NOT NULL DEFAULT 'mining'
);
CREATE INDEX tg_history_user_ts ON public.tg_history (tg_id, ts DESC);
GRANT ALL ON public.tg_history TO service_role;
ALTER TABLE public.tg_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access tg_history" ON public.tg_history FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_users_updated BEFORE UPDATE ON public.tg_users
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_balances_updated BEFORE UPDATE ON public.tg_balances
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
