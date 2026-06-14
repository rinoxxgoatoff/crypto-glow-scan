## Objectif
Transformer Scanner Crypto en app multi-utilisateurs : chaque compte Telegram a sa propre balance/historique côté serveur, un panneau admin réservé au chat_id `7808474075`, et les vrais logos crypto partout.

## 1. Activer Lovable Cloud
Tables Postgres (toutes avec RLS + `GRANT` explicite) :

```text
tg_users
  tg_id BIGINT PRIMARY KEY        -- chat_id Telegram
  username, first_name, last_name, photo_url
  has_miner BOOLEAN
  bonus_day INT, last_bonus DATE
  earned_usd NUMERIC, sessions INT
  created_at, last_seen

tg_balances
  tg_id BIGINT, sym TEXT, amount NUMERIC
  PRIMARY KEY (tg_id, sym)

tg_history (50 dernières récompenses / user)
  id, tg_id, ts, sym, amount, usd

user_roles            -- pattern Lovable standard
  user_id (= tg_id::text), role app_role
```

RLS : un user ne voit que ses lignes (`tg_id = current_setting('app.tg_id')::bigint`). L'admin (`has_role('admin')`) voit tout. Le `tg_id` est posé par le server-fn après vérification.

## 2. Auth Telegram WebApp
- Frontend : `window.Telegram.WebApp.initData` envoyé à chaque server-fn.
- Server-fn `verifyTelegramAuth` : recalcule le HMAC SHA-256 d'`initData` avec le `TELEGRAM_BOT_TOKEN` (secret), extrait `user.id`, upsert dans `tg_users`. Renvoie un JWT signé `{ tg_id, is_admin }` stocké côté client.
- Toutes les server-fn protégées prennent ce JWT, posent `app.tg_id` via RPC `set_tg_context(tg_id)` avant les requêtes Supabase (service role + RLS forcé par contexte).
- Chat_id admin **`7808474075`** seedé en migration avec role `admin`.

## 3. Refonte state
- `useScanner` (zustand local) → `useUser`/`useBalances`/`useHistory` via TanStack Query branchés sur server-fn (`getMe`, `getBalances`, `getHistory`, `addReward`, `claimBonus`, `swap`, `buyMiner`, `withdraw`).
- Mining tick déclenche `addReward` côté serveur (au lieu d'`addReward` local). Optimistic update pour rester fluide.
- Fallback "dev hors Telegram" : bouton mock-login chat_id local (uniquement si `import.meta.env.DEV`).

## 4. Panneau admin `/admin`
Route sous `_authenticated/` gardée par `has_role('admin')`. Server-fn `listUsers` (admin-only) renvoie :
- chat_id, username, photo, has_miner, earned_usd, sessions, last_seen, total balance USD
- table triable + recherche, badge "Miner payé"
- détail user : balances par token + 20 dernières récompenses
- KPIs en haut : nb users, % avec miner, total mined, sessions/24h

## 5. Vrais logos crypto (CoinGecko CDN)
- `COINS[sym].logo` = URL CoinGecko (`https://assets.coingecko.com/coins/images/.../small/...png`)
- `<TokenIcon sym={...} size={36} />` : `<img>` avec fallback lettre si erreur (`onError`)
- Remplace tous les `<div>{icon}</div>` dans `TokenList`, `SwapBox`, `MinerActive`, history…

## 6. Hors scope
- Vrais paiements crypto on-chain (achat miner reste mock côté serveur).
- i18n complète, leaderboard public, notifications push.

## Détails techniques
- Secret requis : `TELEGRAM_BOT_TOKEN` (je te le demanderai via add_secret après ton OK).
- `src/integrations/telegram/verify.server.ts` : HMAC + parse initData.
- `src/lib/scanner/api.functions.ts` : tous les server-fn (chacun appelle `verifyTelegramAuth` puis `supabaseAdmin` + `set_tg_context`).
- Migration unique avec : enum `app_role`, tables, RLS, GRANTs, fonctions `has_role`/`set_tg_context`, seed admin.
- TanStack Query côté client, loaders légers, `invalidateQueries` après mutations.

Dis-moi si OK pour activer Cloud + me donner le bot token, ou si tu veux ajuster quelque chose (ex: plusieurs admins, autres KPIs, logos en SVG plutôt que PNG).
