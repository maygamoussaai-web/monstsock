# Plan de mise à jour MonStock

Regroupe l'ensemble des demandes en une passe, migration Supabase unique, réutilisation maximale de l'existant.

## 1. Migration Supabase (une seule)

Un fichier de migration couvrant :

- `bakeries.logo_url text null` (ajout colonne).
- `product_recipes.quantity_per_unit` → drop du CHECK existant, colonne rendue nullable, nouveau CHECK `quantity_per_unit IS NULL OR quantity_per_unit > 0`.
- Nouvelle table `activity_log(id, bakery_id, user_id, action_type, description, created_at)` + GRANT + RLS (SELECT owner de la bakery uniquement ; INSERT tout membre de la bakery via `has_bakery_access`).
- Nouvelle table `bakery_invitations(id, bakery_id, token unique, created_by, used_by, used_at, expires_at, created_at)` + GRANT + RLS (owner gère ; INSERT/UPDATE via RPC).
- Fonctions/RPC SECURITY DEFINER :
  - `create_invitation(_bakery_id)` : vérifie owner + max 3 staff, retourne token.
  - `accept_invitation(_token)` : vérifie non utilisé, non expiré, ajoute `bakery_members` en `staff` (rejette si déjà >3 staff), marque `used_at/used_by`.
  - `remove_member(_bakery_id, _user_id)` : owner uniquement, empêche de se supprimer soi-même.
  - `transfer_ownership(_bakery_id, _new_owner_id)` : owner uniquement, swap owner ↔ staff atomique.
  - `register_with_invitation_code(_code, _bakery_name)` : marque `invitation_codes.used=true`, crée `subscriptions` (status='trial', trial_end=now()+14j, invitation_code_id).
- Ajustement du trigger `handle_new_user` : lit `raw_user_meta_data.invitation_code` s'il est présent pour marquer le code + créer l'abonnement essai. Si absent (ancien compte), pas de subscription auto.
- RLS `bakeries` UPDATE : uniquement owner (has_role `owner` sur cette bakery).

## 2. Dashboard

- Correction `useSalesSessions` : vérifier que les sessions ouvertes/fermées sont bien retournées et affichées. Le bloc "Dernières ventes" filtrait peut-être uniquement les fermées → afficher toutes les sessions récentes.
- Nom boulangerie : retirer `truncate`, utiliser `break-words` + taille responsive, layout wrap sur mobile.

## 3. Produits / Matières premières

- Retirer les selects de filtres, ne garder que la barre de recherche.

## 4. Fiche produit

- Supprimer les lignes "Coût matière" et "Marge unitaire" dans la fiche détail.

## 5. Recette (bug critique)

- Migration ci-dessus corrige le CHECK.
- `RecipeEditor` : insérer avec `quantity_per_unit: null`. Texte d'intro conforme, ajout d'ingrédients libre y compris stock 0, bouton dynamique "Enregistrer la recette" / "Modifier la recette".
- `BatchForm` : quand un produit avec recette est sélectionné, préremplir les lignes de consommation avec les matières premières de la recette (quantités vides à saisir).

## 6. Page d'accueil

- Refonte `src/routes/index.tsx` avec discours commercial (contrôle stocks, réduction pertes/vols/invendus, augmentation des bénéfices), CTA "Créer un compte" et "Se connecter".

## 7. Inscription

- `src/routes/auth.tsx` : ajouter mode inscription avec champs `nom boulangerie`, `email`, `mot de passe`, `code d'inscription` obligatoire.
- Passer `bakery_name` et `invitation_code` dans `signUp` options `data`.
- Le trigger `handle_new_user` mis à jour valide le code, crée la subscription trial.
- Lien WhatsApp (`https://wa.me/qr/CX26K3Z2GUMCK1?text=...`) sous le champ code + bouton "Contacter sur WhatsApp".

## 8. Mon personnel (nouvelle page)

- Route `src/routes/_authenticated/staff.tsx` avec garde : redirect si user n'est pas owner.
- Hook `useIsOwner()` basé sur `bakery_members.role`.
- UI : liste des membres, bouton "Générer un lien d'invitation" (copie le lien `/join/{token}`), max 3 staff.
- Clic membre → drawer/modal listant `activity_log` filtré par `user_id`.
- Boutons "Retirer" et "Transférer la gérance" (confirm).
- Menu latéral : afficher "Mon personnel" uniquement pour owner.

## 9. Rejoindre via lien

- Nouvelle route publique `src/routes/join.$token.tsx` : si non connecté, redirige vers `/auth?next=/join/TOKEN`. Sinon appelle `accept_invitation(token)`.

## 10. Journalisation

- Hook `useLogActivity()` (une seule fonction serveur/RPC ou insert direct via RLS) appelé dans :
  - création/complétion fournée
  - clôture session vente
  - achat matière première
  - create/update produit, create/update matière première

## 11. Profil

- Bloc "Statut de l'abonnement" lit `subscriptions` de la bakery, calcule les jours restants selon (status, plan).
- Édition nom/logo bakery : bouton "Modifier" masqué pour staff.

## 12. PWA

- Le manifest existe. Ajouter un service worker minimal (`public/sw.js`) enregistré via un wrapper guardé (pas en preview Lovable, pas en dev, pas en iframe, `?sw=off` kill switch). Cache NetworkFirst pour navigations, CacheFirst pour assets hashés `/assets/`.
- Enregistrement dans `src/routes/__root.tsx` via `useEffect` browser-only.

## 13. Perf / sécurité

- Vérifier absence de `console.log` de debug, requêtes redondantes ; s'assurer que les queries utilisent bien `staleTime` raisonnable dans `src/lib/queries.ts` (garder l'existant s'il est correct).
- RLS relues : `bakeries` UPDATE limité au owner, `activity_log` SELECT owner uniquement, `bakery_invitations` idem, `bakery_members` DELETE via RPC (pas d'accès direct).

## Points signalés comme non couverts / à confirmer

- **Pas d'app admin** : conformément à la demande, aucun back-office pour émettre les codes ou marquer les subscriptions `active` (paiement). Les codes doivent donc être insérés manuellement dans Supabase.
- **Aucun cron n'existe** pour passer `status='trial'` → `expired` à l'échéance : le frontend calcule l'affichage "fin dans X jours" mais un `subscriptions.status` ne changera pas seul. À prévoir plus tard (pg_cron ou route publique).
- **Suppression d'un membre** : révoque l'accès via RLS mais ne supprime pas son compte auth ni son historique dans `activity_log` (par design, l'historique reste consultable par le owner).
- **Transfert de gérance** : instantané, sans double confirmation email — bouton avec confirm() côté UI.
- Le lien WhatsApp `https://wa.me/qr/CX26K3Z2GUMCK1` n'accepte pas de paramètre `?text=` (les liens `wa.me/qr/*` ignorent le pré-remplissage). Je conserverai le lien tel quel mais **le message ne sera pas pré-rempli**. Si un message pré-rempli est indispensable, il faut remplacer par un lien `https://wa.me/<numéro>?text=...`.

Confirmer et j'exécute l'ensemble en une passe.
