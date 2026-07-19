# Refonte MonStock — Application SaaS pour boulangeries artisanales

L'app actuelle (MAYGA & Frères) est remplacée par **MonStock**, avec un modèle multi-tenant (`bakery_id`), un domaine métier complet (matières → recettes → fournées → ventes), un cockpit financier, un historique immuable, et un empaquetage PWA installable.

## 1. Modèle de données (nouvelle migration)

Tables (toutes avec RLS scopée `bakery_id` via fonction `current_bakery_id()` security definer) :

- `bakeries` — nom, devise (XOF par défaut), adresse
- `bakery_members(bakery_id, user_id, role)` — rôle `owner|staff` ; sert au check RLS
- `raw_materials` — matières premières : nom, unité (kg/g/L/mL/unité), prix d'achat unitaire (obligatoire, > 0), stock, seuil bas, coût moyen pondéré
- `raw_material_purchases` — réapprovisionnements : quantité, prix total, prix unitaire → met à jour stock + coût moyen pondéré via trigger
- `products` — produits fabriqués : nom, unité de vente, prix de vente, stock, seuil bas, coût matière calculé (dérivé de la recette)
- `product_recipes(product_id, raw_material_id, quantity_per_unit)` — recette : combien de matière pour 1 unité produite
- `batch_templates` — modèle de fournée : nom + lignes `batch_template_items(product_id, planned_quantity)`
- `batches` — fournées réelles : date, template optionnel, notes, statut. **La consommation de matières est saisie manuellement** ligne par ligne dans `batch_consumptions(raw_material_id, quantity_used)`. La quantité produite est saisie dans `batch_outputs(product_id, quantity_produced)` → trigger : décrémente matières, incrémente stock produits, calcule coût matière du lot
- `sales_sessions` — journée/service de vente : date, notes, statut (`open|closed`)
- `sales_session_items(product_id, opening_stock, restocked, closing_stock, unsold, price_at_sale)` — à la clôture : trigger calcule `quantity_sold = opening + restocked - closing - unsold`, décrémente stock produit, enregistre revenus + pertes
- `stock_ledger` — **historique immuable** append-only : type (`purchase|batch_consume|batch_produce|sale|loss|adjustment`), ref_id, matériau ou produit, delta quantité, delta valeur, user_id, created_at. Alimenté uniquement par triggers ; RLS interdit UPDATE/DELETE

Fonctions/triggers :
- `current_bakery_id()` security definer
- `has_bakery_access(uuid)` security definer
- Trigger `handle_new_user` : à la création d'un `auth.users`, crée automatiquement une bakery + membership owner
- Triggers pour : mise à jour coût moyen pondéré, application des fournées, clôture des sessions de vente, écritures ledger

RLS : `SELECT/INSERT/UPDATE` scopés à `has_bakery_access(bakery_id)` ; `stock_ledger` : SELECT seulement, INSERT via triggers (SECURITY DEFINER).

GRANT `SELECT/INSERT/UPDATE/DELETE ... TO authenticated` + `ALL TO service_role` sur chaque table (DELETE refusé par policy sur `stock_ledger`).

## 2. Backend / logique

- Hooks React Query dans `src/lib/` : `bakery.ts`, `raw-materials.ts`, `products.ts`, `recipes.ts`, `batches.ts`, `sales.ts`, `finance.ts`, `ledger.ts`
- Calculs financiers côté requête SQL (vues ou agrégations) : valeur stock (matières + produits au coût), achats période, coût matières consommées, chiffre d'affaires, pertes valorisées, bénéfice brut estimé = ventes − coût matières − pertes
- Devise par défaut FCFA (XOF), formatteur central

## 3. Frontend — refonte complète des routes

Suppression : `dashboard.tsx`, `products.tsx`, `movements.tsx`, `history.tsx` actuels.

Nouvelle arborescence sous `_authenticated/` :
- `dashboard.tsx` — cockpit : KPIs financiers (valeur stock, achats 7/30j, CA, pertes, bénéfice brut), alertes seuil, fournées récentes, top produits
- `raw-materials.tsx` — liste + création (nom, unité, prix d'achat, seuil) + détail avec bouton « Réapprovisionner »
- `products.tsx` — liste produits fabriqués + création avec recette (sélection matières + quantités) + prix de vente
- `batch-templates.tsx` — modèles de fournées réutilisables
- `batches.tsx` — nouvelle fournée : choisir modèle (optionnel) → saisir manuellement consommations matières + quantités produites → validation
- `sales.tsx` — sessions de vente : ouvrir → saisir stock initial + réappros + invendus + stock final → clôture calcule les ventes
- `finance.tsx` — rapport financier période sélectionnable
- `history.tsx` — historique immuable filtré (type, période, matière/produit)

Landing `index.tsx` et `auth.tsx` : rebrand MonStock, Google + email/mot de passe.

Layout : rebrand MonStock, nav mise à jour, français corrigé partout.

Design : conserver la palette crème/brun existante dans `styles.css`, épurer, garder animations `fade-up`, cartes `card-elegant`.

## 4. PWA

- `public/manifest.webmanifest` : nom MonStock, `display: standalone`, thème crème
- Icônes 192/512 générées (`imagegen`, transparent PNG)
- `vite-plugin-pwa` (`generateSW`, `registerType: autoUpdate`, `NetworkFirst` pour navigations, exclusion `/~oauth`)
- Wrapper d'enregistrement `src/lib/pwa-register.ts` gardé (refus preview/iframe/dev, kill-switch `?sw=off`) enregistré depuis `__root.tsx`
- `<link rel="manifest">`, `theme-color`, `apple-touch-icon` dans head du root
- Responsive mobile déjà en place, vérifié sur toutes les nouvelles vues

## 5. Détails techniques

- Auth : Google OAuth via `lovable.auth.signInWithOAuth` (`redirect_uri: window.location.origin`) + email/password ; provider Google déjà configuré ; le trigger `handle_new_user` provisionne la bakery
- Toutes les mutations passent par serveur RLS (client `supabase` navigateur) — pas de `createServerFn` requis pour le CRUD standard
- Formulaires : `react-hook-form` + `zod` pour validation (prix > 0, quantités ≥ 0, unités enum)
- Immuabilité historique : policy `stock_ledger` sans UPDATE/DELETE + INSERT restreint aux triggers SECURITY DEFINER

## 6. Ordre d'exécution

1. Migration SQL complète (table + triggers + RLS + GRANT + trigger new_user) — **approbation utilisateur requise**
2. Suppression anciens fichiers routes
3. Nouveaux hooks + routes + design refresh + rebrand MonStock
4. PWA (manifest, icônes, plugin, register wrapper)
5. Vérification build + test navigation Playwright léger

## Hors périmètre (à confirmer si besoin)
- Multi-utilisateur par boulangerie avec invitations (infrastructure en place via `bakery_members` mais UI d'invitation non incluse dans ce jet)
- Export PDF/CSV des rapports
- Notifications push
