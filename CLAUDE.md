# CLAUDE.md — Référence permanente MonStock

> Ce fichier est la source de vérité pour tout travail sur ce dépôt.
> Lis-le intégralement avant de modifier quoi que ce soit.

---

## 1. Rôle et objectif de MonStock

MonStock est une **PWA de gestion pour boulangeries artisanales**, conçue pour fonctionner
en zone à connectivité intermittente (Afrique de l'Ouest). Elle couvre :

- Gestion des matières premières (stock, coût moyen pondéré, seuils d'alerte)
- Recettes et modèles de fournées
- Fournées (consommation matières → production produits, ledger immuable)
- Sessions de vente (ouverture, clôture, calcul invendus/pertes)
- Finances (CA, coûts matières, bénéfice brut)
- Historique des mouvements de stock
- Gestion du personnel (rôles owner/staff, invitations)
- Mode hors ligne complet — lecture + écriture en file d'attente

**Priorité absolue : l'app doit rester utilisable sans réseau.**

---

## 2. Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19, TanStack Router v1, TanStack Query v5 |
| Build | Vite 8, TypeScript strict |
| Style | Tailwind CSS v4 (syntaxe `@utility`), Radix UI / shadcn |
| Animation | Three.js + React Three Fiber + Drei (page auth uniquement) |
| Graphiques | Recharts |
| Backend | Supabase (PostgreSQL) — pas de serveur applicatif propre |
| Auth | Supabase Auth (JWT) |
| PWA | Workbox, vite-plugin-pwa |
| Notifications | Web Push VAPID |
| Persistance locale | IndexedDB (cache lecture, via idb-keyval) + localStorage (file d'écriture hors ligne) |

---

## 3. Architecture du projet

```
src/
├── routes/
│   ├── __root.tsx              # Shell HTML, QueryClient, persistance IndexedDB
│   ├── auth.tsx                # Connexion / inscription / reset mdp
│   ├── join.$token.tsx         # Invitation équipe
│   └── _authenticated/
│       ├── route.tsx           # Layout principal, nav, contrôle abonnement
│       ├── dashboard.tsx
│       ├── raw-materials.tsx
│       ├── products.tsx
│       ├── batch-templates.tsx
│       ├── batches.tsx
│       ├── sales.tsx
│       ├── finance.tsx
│       ├── history.tsx
│       ├── profile.tsx
│       ├── staff.tsx
│       └── sync.tsx            # File hors ligne visible
├── lib/
│   ├── queries.ts              # Toute la couche data (useQuery / useMutation)
│   ├── offline-queue.ts        # File d'attente localStorage (écriture hors ligne)
│   ├── offline-actions.ts      # Exécuteurs : file → appel Supabase
│   ├── offline-optimistic.ts   # Mises à jour optimistes du cache
│   ├── offline-prefetch.ts     # Préchargement données essentielles
│   ├── query-persist.ts        # Persistance IndexedDB du cache lecture
│   ├── auth-local.ts           # Session hors ligne (lecture localStorage)
│   ├── push.ts                 # Notifications push VAPID
│   ├── format.ts               # Formatage monnaie, quantité, date
│   └── units.ts, utils.ts
└── components/
    ├── baker/                  # Boulanger 3D Three.js (page auth uniquement)
    └── ui/                     # Composants Radix/shadcn
supabase/migrations/            # Migrations SQL versionnées
```

**Pattern central : offline-first.**
Toute écriture tente le réseau en 6 s, sinon elle est mise en file `localStorage`.
Au retour du réseau, la file est rejouée chronologiquement via `syncQueue()`.
Chaque action porte un `client_ref` UUID que Postgres refuse d'appliquer deux fois.

---

## 4. Règles d'architecture

- **Pas de backend applicatif.** Toute logique métier sensible vit dans Postgres (fonctions `SECURITY DEFINER`). Ne pas créer de serveur Express/Hono/Nitro intermédiaire.
- **Une seule couche data : `src/lib/queries.ts`.** Tous les `useQuery` et `useMutation` sont ici. Ne pas écrire d'appels Supabase directement dans les composants de page.
- **Toute écriture passe par `runOrQueue()`.** Jamais d'appel direct à Supabase depuis un `useMutation` sans passer par la file hors ligne.
- **Invalidation ciblée.** Utiliser `ACTION_INVALIDATIONS` dans `offline-actions.ts` pour n'invalider que les domaines concernés — jamais `qc.invalidateQueries()` sans argument.
- **Séparation stricte route / composant.** Une route TanStack Router = un fichier dans `src/routes/`. Les composants réutilisables vont dans `src/components/`.
- **Three.js uniquement dans `src/components/baker/`.** Ne pas importer Three.js dans les pages métier.
- **Chargement différé obligatoire** pour tout module lourd (Three.js, PDF, compression image) : utiliser `lazy()` + `<Suspense>`.

---

## 5. Règles Supabase / PostgreSQL / RLS / SECURITY DEFINER

- **RLS activé sur toutes les tables.** Jamais de table sans politique RLS.
- **Isolation par `bakery_id`.** Chaque table multi-tenant a un `bakery_id` et une politique basée sur `has_bakery_access(bakery_id)`.
- **Les fonctions `SECURITY DEFINER` vérifient toujours :**
  1. `user_has_bakery_access(p_bakery_id)` — accès de l'utilisateur
  2. `subscription_active(p_bakery_id)` — abonnement valide
  3. `claim_client_ref(p_client_ref)` — idempotence (bloque les doublons de rejeu)
- **Le `stock_ledger` est immuable.** Jamais d'UPDATE/DELETE sur cette table. Les insertions se font uniquement depuis des fonctions `SECURITY DEFINER`.
- **Pas d'INSERT/UPDATE/DELETE direct sur les tables critiques** (stock_ledger, batches, sales_sessions) depuis le client — passer par les RPC Postgres.
- **Chaque nouvelle migration** doit être nommée `YYYYMMDDHHMMSS_description.sql` et placée dans `supabase/migrations/`. Ne jamais modifier une migration déjà appliquée.
- **Les fonctions RPC** doivent toujours avoir `SET search_path = public` pour éviter les injections de schéma.
- **Indexes obligatoires** sur `(bakery_id, created_at DESC)` pour toute table paginée.

---

## 6. Règles offline-first

- **`networkMode: "offlineFirst"`** doit rester sur tous les `useQuery` et `useMutation` globalement (configuré dans `src/router.tsx`).
- **`runOrQueue()`** dans `queries.ts` est le point d'entrée unique de toute écriture. Il tente le réseau en 6 s, sinon enfile dans localStorage. Ne jamais le contourner.
- **La file est strictement chronologique.** `syncQueue()` rejoue dans l'ordre `queued_at ASC`. Une fournée qui consomme du stock doit passer après le réapprovisionnement correspondant.
- **Un `client_ref` UUID par action.** Il est transmis à Postgres et enregistré dans `processed_client_refs`. Un rejeu du même UUID est un no-op côté serveur.
- **`applyOptimistic()`** doit être appelé avant l'envoi réseau pour mettre à jour le cache localement. Les erreurs d'optimisme ne doivent jamais faire planter l'écriture.
- **La session hors ligne** est lue depuis `auth-local.ts` (`getLocalUser()`), jamais depuis `supabase.auth.getUser()` quand on est hors ligne.
- **Ne jamais afficher une page blanche** quand le réseau est absent. Afficher les données du cache IndexedDB.

---

## 7. Règles IndexedDB et localStorage

- **IndexedDB** (via `idb-keyval`) = cache lecture TanStack Query. Persistance 30 jours, restauré au démarrage avant le premier rendu.
- **localStorage** = file d'écriture hors ligne (`monstock:offline-queue`). Synchrone, limité à ~5 MB — ne jamais y stocker des blobs ou des images.
- **La sauvegarde du cache** est déclenchée sur `visibilitychange` (app en arrière-plan) et `pagehide`. L'intervalle de secours (`setInterval`) est un filet de sécurité uniquement — ne pas le réduire en dessous de 20 s.
- **`clearPersistedQueryCache()`** doit être appelé à la déconnexion pour ne pas laisser les données d'une boulangerie accessibles à un autre utilisateur sur le même appareil.
- **`shouldPersistQuery()`** retourne `true` pour tout actuellement. Si le cache dépasse 20 MB en pratique, introduire une exclusion sur les requêtes avec `limit > 500`.

---

## 8. Règles TypeScript

- **TypeScript strict** — pas de `"strict": false` dans `tsconfig.json`.
- **Éviter `as any`** sauf pour les cas où le client Supabase ne génère pas encore les types (tables ou RPC récents). Dans ce cas, annoter avec un commentaire `// TODO: typage fort dès que les types sont régénérés`.
- **Les types DB** viennent de `src/integrations/supabase/types.ts` (généré par `supabase gen types`). Ne pas les écrire à la main.
- **Les types locaux partagés** (ex. `QueuedAction`, `QueuedActionKind`) vivent dans `src/lib/` à côté du code qui les utilise.
- **Pas d'`enum` TypeScript** — utiliser des `union types` (`"trial" | "code"`) qui sont plus compatibles avec la sérialisation JSON.

---

## 9. Règles UI/UX et responsive

- **Design system** défini dans `src/styles.css` via `@utility` Tailwind v4. Ne pas écrire de styles inline hors des cas Three.js/SVG.
- **Classes utilitaires métier** : `card-elegant`, `card-premium`, `btn-press`, `btn-shimmer`, `icon-medallion`, `stat-figure`, `badge-pill`, `skeleton`. Les utiliser, ne pas les réinventer.
- **Toujours mobile-first.** Tester à 375 px avant de tester en desktop.
- **Le formulaire d'auth est prioritaire** sur mobile — le boulanger 3D est secondaire et ne doit jamais masquer les champs.
- **`prefers-reduced-motion`** doit être respecté dans tous les composants animés (CSS et Three.js).
- **`pointer-events: none`** sur tous les éléments purement décoratifs (boulanger, avion, blobs de fond).
- **`aria-hidden="true"`** sur tous les éléments visuels décoratifs.
- **Les toasts** (`sonner`) sont le seul mécanisme de feedback utilisateur pour les succès et erreurs. Pas de modales de confirmation pour les actions réversibles.
- **Les erreurs Postgres/Auth/Storage** doivent être traduites en français via `describeError()` avant d'aller dans un toast. Ne jamais afficher un message brut d'erreur serveur.

---

## 10. Règles Git

- **Une fonctionnalité = une branche** (`feat/nom-feature`) ou un fix (`fix/description`).
- **Messages de commit** en français, format conventionnel :
  - `feat(domaine): description`
  - `fix(domaine): description`
  - `refactor(domaine): description`
  - `docs: description`
  - `chore: description`
- **Ne jamais commiter** directement sur `main` un changement qui n'a pas été relu.
- **Ne jamais commiter** de secrets, clés API ou tokens — même publics par nature (sauf la clé publique VAPID qui est intentionnellement dans `push.ts`).
- **Les migrations SQL** sont immuables une fois poussées sur `main`. Pour corriger une migration, créer une nouvelle migration.

---

## 11. Commandes disponibles

```bash
npm run dev          # Serveur de développement Vite (hot reload)
npm run build        # Build de production (output : dist/)
npm run build:dev    # Build en mode développement (source maps, non minifié)
npm run preview      # Aperçu du build de production en local
npm run lint         # ESLint sur tout src/
npm run format       # Prettier — formate tous les fichiers
```

**Aucun framework de test n'est installé.** Avant d'en ajouter un, choisir Vitest (compatible Vite, pas de config supplémentaire).

---

## 12. Checklist avant de considérer une tâche terminée

- [ ] `npm run lint` passe sans erreur
- [ ] `npm run build` passe sans erreur TypeScript
- [ ] La fonctionnalité fonctionne **hors ligne** (tester avec DevTools → Network → Offline)
- [ ] La fonctionnalité fonctionne sur mobile à 375 px de large
- [ ] Les erreurs sont traduites en français via `describeError()` dans les toasts
- [ ] Toute nouvelle écriture passe par `runOrQueue()` et est référencée dans `ACTION_INVALIDATIONS`
- [ ] Toute nouvelle table SQL a RLS activé et une politique `has_bakery_access(bakery_id)`
- [ ] Toute nouvelle fonction RPC `SECURITY DEFINER` vérifie accès + abonnement + idempotence
- [ ] Aucun `console.log` de débogage dans le code commité
- [ ] Aucune clé API ou secret dans le code
- [ ] `prefers-reduced-motion` respecté si des animations ont été ajoutées
- [ ] Les éléments décoratifs ont `aria-hidden="true"` et `pointer-events: none`

---

## 13. Règles de sécurité

- **RLS sur toutes les tables** — c'est la première ligne de défense. Ne jamais désactiver.
- **`SECURITY DEFINER`** pour toute opération qui doit bypasser temporairement RLS (ex. écriture dans `stock_ledger`). Toujours avec `SET search_path = public`.
- **Vérification d'accès en double** : RLS côté base + `user_has_bakery_access()` dans les fonctions RPC — les deux ensemble, jamais l'un sans l'autre pour les opérations critiques.
- **`claim_client_ref()`** est obligatoire dans toute RPC mutante pour garantir l'idempotence. Ne pas l'omettre.
- **Pas de données d'une boulangerie exposées à une autre.** Vérifier systématiquement que chaque requête filtre par `bakery_id`.
- **La clé privée VAPID** ne doit jamais être dans le code front. Seule la clé publique VAPID est dans `push.ts`.
- **Les sessions expirées** sont gérées côté auth (`getResilientUser()`) — en cas de doute, retourner la session locale plutôt que de déconnecter l'utilisateur.
- **Pas d'évaluation de code dynamique** (`eval`, `new Function`, `innerHTML` avec données utilisateur).

---

## 14. Règles pour la montée en charge

Ces règles s'appliquent dès maintenant pour éviter des refontes coûteuses plus tard.

**Base de données :**
- Chaque nouvelle table volumineuse (> millions de lignes attendues) doit prévoir un `PARTITION BY RANGE (created_at)` dès sa création. `stock_ledger` en est le cas le plus urgent.
- Ne jamais faire de `SELECT *` sur le ledger sans `LIMIT`. Toujours paginer.
- `has_bakery_access()` est appelé à chaque row par RLS — s'assurer que l'index `(bakery_id)` existe sur toutes les tables concernées.

**Frontend :**
- Tous les modules lourds (Three.js ≈ 600 KB, PDF, compression image) sont chargés avec `lazy()`. Ne jamais les importer statiquement dans une route.
- `structuralSharing: true` sur tous les `useQuery` — React ne re-rend que si la donnée a vraiment changé.
- `refetchOnMount: false` sur les données stables (catalogue matières, produits) — le cache suffit jusqu'à invalidation explicite.
- Ne jamais charger plus de 800 lignes de ledger en une requête. Paginer ou filtrer par période.

**Offline :**
- La file `localStorage` est synchrone et limitée à ~5 MB. Si une boulangerie accumule des centaines d'actions hors ligne, migrer la file vers IndexedDB.
- `syncQueue()` est séquentiel par design — acceptable jusqu'à ~50 actions. Au-delà, envisager un rejeu par lots avec pauses.

**Infrastructure (futur) :**
- Prévoir une région Supabase proche de l'Afrique de l'Ouest (Europe West ou Middle East) pour réduire la latence.
- Ajouter Sentry (ou équivalent) avant d'onboarder les premiers clients payants — sans monitoring, les régressions silencieuses sont invisibles.
- Passer sur Supabase Pro ou Enterprise avant d'atteindre 500 boulangeries actives simultanées.
