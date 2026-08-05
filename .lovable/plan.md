# MonStock offline-first

Refonte en 5 chantiers. Le principe "aucun calcul de stock côté client" est conservé :
la file d'attente rejoue exactement les mêmes appels RPC, plus tard.

## 1. Base de données (une migration)

- Ajouter `p_client_ref uuid default null` à toutes les fonctions d'écriture :
  `record_purchase`, `record_batch`, `record_product_sale`, `record_loss`,
  `close_sales_session`. Chaque fonction commence par insérer le `client_ref` dans
  `processed_client_refs` ; si le ref existe déjà, elle sort immédiatement sans rien
  réappliquer (même mécanisme que `record_quick_sale` aujourd'hui).
- Ajouter un `p_id uuid` optionnel aux créations pour que l'identifiant soit celui
  généré hors ligne : matières premières, produits, unités personnalisées, lignes de
  recette, modèles de fournée. Les écritures simples (tables) continuent de passer par
  la Data API mais avec un `id` fourni par le client.
- Les anciennes signatures restent utilisables (paramètres optionnels), donc rien ne
  casse pendant la transition.

## 2. Lecture hors ligne (cache persistant)

- Ajout de `@tanstack/query-persist-client-core`, `@tanstack/query-async-storage-persister`
  et `idb-keyval`.
- Le `QueryClient` créé dans `src/router.tsx` est branché sur un persister IndexedDB
  (persistance côté navigateur uniquement, jamais pendant le rendu serveur).
- `gcTime` long (7 jours) et `networkMode: "offlineFirst"` pour que les écrans
  s'affichent avec les dernières données connues, même après fermeture complète de l'app.
- Le cache est cloisonné par utilisateur et vidé à la déconnexion.

## 3. File d'attente unique (généralisation de l'existante)

`src/lib/offline-queue.ts` devient une file générique :

```text
{ local_id, client_ref, kind, payload, queued_at, attempts, last_error, status }
```

- `kind` couvre toutes les actions demandées (matière, unité, réappro, produit,
  recette, modèle, fournée, vente, perte, archivage).
- Un seul « exécuteur » par `kind` traduit le payload en appel Supabase — c'est le même
  code que celui utilisé en ligne, donc aucune logique dupliquée.
- Chaque mutation de `src/lib/queries.ts` suit désormais le même schéma : tentative
  immédiate ; en cas d'absence de réseau ou d'erreur réseau, mise en file et succès
  optimiste côté interface. Les erreurs métier (stock insuffisant en ligne) restent
  des erreurs affichées normalement.
- Les entités créées hors ligne sont écrites dans le cache TanStack Query avec leur
  uuid client, donc utilisables immédiatement par les actions suivantes (achat, recette,
  fournée) sans réseau.

## 4. Synchronisation

- Rejeu strictement chronologique (`queued_at`), séquentiel, déclenché au démarrage de
  l'app, à l'évènement `online`, et au retour au premier plan.
- Retrait de la file seulement après confirmation serveur.
- Erreur réseau -> l'entrée reste en attente et la synchro s'arrête (pour préserver
  l'ordre). Erreur métier renvoyée par le serveur -> l'entrée passe en `failed`, la
  synchro continue avec les suivantes.
- Les entrées `failed` sont listées dans une page/section dédiée avec le message exact
  du serveur, et deux actions : « Réessayer » ou « Abandonner cette entrée ».

## 5. Interface

- Bandeau hors ligne existant conservé, enrichi (nombre d'actions en attente, toutes
  natures confondues).
- Compteur global dans l'en-tête, cliquable, ouvrant la liste des actions en attente et
  des échecs.
- Badge « en attente de synchronisation » sur chaque ligne concernée dans les listes
  matières, produits, fournées, ventes, historique.
- Les confirmations de formulaire disent clairement « enregistré, sera synchronisé »
  quand l'action est mise en file.

## Vérifications finales

- Scénario complet en mode avion (matière -> achat -> produit + recette -> fournée ->
  vente), y compris avec fermeture/réouverture de l'app entre deux étapes.
- Retour en ligne : ordre de rejeu, stocks finaux corrects, aucun doublon.
- Notifications push toujours fonctionnelles (le service worker existant est étendu, pas
  remplacé), modales toujours défilables, navigation toujours fluide, unités
  personnalisées et archivage inchangés.

## Points à valider avec toi

1. **Fournées hors ligne** : le serveur refuse une fournée si le stock est insuffisant.
   Hors ligne, l'app ne peut que vérifier le stock connu localement. Si un autre
   appareil a consommé le stock entre temps, la fournée passera en « échec de
   synchronisation » à corriger à la main. C'est le comportement que je propose (plutôt
   que forcer le stock négatif côté serveur).
2. **Ventes hors ligne** : même logique, la vente est refusée au moment de la synchro si
   le stock a été vendu ailleurs.
3. **Clôture de session de vente** hors ligne : je l'inclus dans la file, mais elle
   dépend de tous les items de la session — donc rejouée après eux.
