## Objectif
Transformer le mockup HTML "Scanner Crypto" en vraie app TanStack Start modulaire, avec un design retravaillé et des fonctionnalités étendues.

## 1. Architecture (port React/TanStack)
Découper le monolithe HTML en routes + composants typés :

```text
src/routes/
  __root.tsx              -> shell + TopBar + BottomNav + Toaster
  index.tsx               -> Home (Daily Bonus + Scanner + Balances)
  miner.tsx               -> Mining Rig (shop / active)
  swap.tsx                -> Swap tokens
  profile.tsx             -> Profil + stats

src/components/scanner/
  TopBar, BottomNav, DailyBonus, ScannerTerminal,
  TokenList, TokenRow, MinerShop, MinerActive,
  SwapBox, ProfileCard, WithdrawSheet, ContactSheet

src/lib/scanner/
  state.ts        -> Zustand store persisté (remplace localStorage brut)
  coins.ts        -> catalogue COINS / prix / icônes
  mining.ts       -> hook useMining (logs, rewards, MH/s flicker)
  format.ts       -> fa(), fu(), p2()
```

État géré via **Zustand + persist** (clé `sc_v6`) au lieu du localStorage manuel — migration auto depuis `sc_v5` si présent.

## 2. Design system
Refondre `src/styles.css` avec tokens oklch dédiés (vert mining `--mint`, violet streak, dégradés, ombres glow, mono `JetBrains Mono`, sans `Inter`). Plus aucune couleur hardcodée dans les composants — variants Shadcn (`button` : `mine`, `stop`, `ghost-mint` ; `card` : `glow`).

Améliorations visuelles vs mockup :
- typo plus serrée, hiérarchie clarifiée
- terminal avec scan-line subtile + glow animé pendant mining
- token rows avec micro-graphique sparkline 24h (mock)
- bottom-nav indicateur actif animé (pill qui glisse)
- haptic-like micro-animations (framer-motion) sur claim / reward / swap
- responsive propre (pas figé à 430px max)

## 3. Nouvelles features
- **Historique de mining** : page/section listant les rewards reçus (timestamp, coin, montant USD)
- **Sparklines** sur chaque token (prix mock 7j)
- **Swap réel côté state** : débite le from / crédite le to selon le taux (au lieu d'un simple toast)
- **Notifications toasts** unifiées via `sonner`
- **Streak bonus** : réinitialise si > 1 jour manqué, +bonus visuel jour 7
- **Withdraw flow** : sheet shadcn avec champ adresse + validation min $10 + gate "buy miner"
- **Settings discrètes** : reset démo, langue FR/EN (i18n light via objet)
- **Mining offline-catchup** : si l'utilisateur revient après X minutes en mining actif → calcul rétroactif plafonné

## 4. SEO & meta
- `head()` par route (titres + descriptions FR distincts)
- favicon + og image générée (logo Scanner Crypto)
- `robots.txt` + `sitemap.xml` selon recipe

## 5. Détails techniques
- Pas de backend (Lovable Cloud non requis : tout reste client + persist). Si l'utilisateur veut auth Telegram/leaderboard plus tard → activer Cloud à ce moment.
- Framer-motion (déjà dispo via tw-animate-css ou ajout `motion`) pour transitions.
- Shadcn : `sheet`, `dialog`, `button`, `card`, `tabs`, `sonner` déjà présents → réutilisés.
- Aucun appel réseau réel — données 100% mock, comme le mockup d'origine.

## 6. Hors scope (à confirmer si tu veux)
- Vrais paiements crypto / vérification on-chain
- Backend / multi-device sync
- Auth Telegram Mini App officielle (`window.Telegram.WebApp`)
- Internationalisation complète (juste FR/EN basique prévu)

Dis-moi si tu veux que j'ajoute un de ces points dans le scope avant que je code.