
-- App settings (key/value)
CREATE TABLE public.tg_app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.tg_app_settings TO service_role;
ALTER TABLE public.tg_app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access settings" ON public.tg_app_settings FOR ALL USING (false) WITH CHECK (false);

-- Active boosts
CREATE TABLE public.tg_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tg_id BIGINT NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 2,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'ad'
);
CREATE INDEX idx_tg_boosts_tg_id ON public.tg_boosts(tg_id, expires_at DESC);
GRANT ALL ON public.tg_boosts TO service_role;
ALTER TABLE public.tg_boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access boosts" ON public.tg_boosts FOR ALL USING (false) WITH CHECK (false);

-- Ad views log
CREATE TABLE public.tg_ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tg_id BIGINT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  block_id TEXT,
  status TEXT NOT NULL DEFAULT 'shown'
);
CREATE INDEX idx_tg_ad_views_ts ON public.tg_ad_views(ts DESC);
CREATE INDEX idx_tg_ad_views_tg ON public.tg_ad_views(tg_id, ts DESC);
GRANT ALL ON public.tg_ad_views TO service_role;
ALTER TABLE public.tg_ad_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no public access ad_views" ON public.tg_ad_views FOR ALL USING (false) WITH CHECK (false);

-- Seed default boost config
INSERT INTO public.tg_app_settings (key, value) VALUES
  ('boost', '{"enabled":true,"multiplier":2,"duration_min":30,"cooldown_min":10,"adsgram_block_id":"bot-35303","revenue_per_view_usd":0.003}'::jsonb)
ON CONFLICT (key) DO NOTHING;
