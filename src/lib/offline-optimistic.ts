import type { QueryClient } from "@tanstack/react-query";
import type { QueuedActionKind } from "@/lib/offline-queue";

// ─────────────────────────────────────────────────────────────────────────────
// Mise à jour immédiate du cache local après une action, pour que l'app reste
// utilisable hors ligne : l'entité créée apparaît tout de suite dans les listes
// et peut servir aux actions suivantes (achat, recette, fournée…).
//
// Ce n'est QUE de l'affichage : la vérité reste la base, qui recalcule tous les
// stocks côté serveur au moment de la synchronisation.
//
// IMPORTANT sur les listes PAR ENTITÉ (recette d'un produit, unités d'une
// matière) : on cible la clé EXACTE (["recipe", productId]) avec setQueryData
// plutôt qu'un préfixe large avec setQueriesData, pour deux raisons :
//  1. setQueriesData ne touche que des requêtes déjà en cache — si cette
//     recette n'avait jamais été consultée avant (ex. produit créé hors ligne
//     puis recette ouverte pour la première fois hors ligne), la mise à jour
//     ne faisait RIEN et restait invisible jusqu'au retour du réseau.
//  2. Un préfixe large touche TOUTES les entités en cache en même temps — un
//     ingrédient ajouté au produit A pouvait apparaître par erreur dans le
//     cache du produit B tant que celui-ci n'était pas rechargé.
// setQueryData corrige les deux : il crée l'entrée si elle n'existe pas, et ne
// touche que la bonne entité.
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, any>;

function updateList(qc: QueryClient, key: string, fn: (rows: Row[]) => Row[]) {
  qc.setQueriesData({ queryKey: [key] }, (old: any) => (Array.isArray(old) ? fn(old) : old));
}

function patchById(qc: QueryClient, key: string, id: string, patch: Row) {
  updateList(qc, key, (rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
}

function bumpStock(qc: QueryClient, key: string, id: string, delta: number) {
  updateList(qc, key, (rows) =>
    rows.map((r) => (r.id === id ? { ...r, stock: Number(r.stock ?? 0) + delta } : r))
  );
}

// Ajoute ou met à jour une ligne dans UNE liste précise (clé complète), en
// créant l'entrée de cache si elle n'existait pas encore.
function upsertInExactList(
  qc: QueryClient,
  queryKey: unknown[],
  row: Row,
  matchField: string
) {
  qc.setQueryData(queryKey, (old: any) => {
    const rows: Row[] = Array.isArray(old) ? old : [];
    const idx = rows.findIndex((r) => r[matchField] === row[matchField]);
    if (idx >= 0) {
      const next = [...rows];
      next[idx] = { ...next[idx], ...row };
      return next;
    }
    return [...rows, row];
  });
}

export function applyOptimistic(qc: QueryClient, kind: QueuedActionKind, payload: Row) {
  switch (kind) {
    case "bakery.update":
      qc.setQueryData(["bakery"], (old: any) => (old ? { ...old, ...payload.patch } : old));
      break;

    case "raw_material.create":
      updateList(qc, "raw_materials", (rows) =>
        rows.some((r) => r.id === payload.row.id)
          ? rows
          : [...rows, { avg_cost: payload.row.purchase_price ?? 0, ...payload.row }].sort((a, b) =>
              String(a.name).localeCompare(String(b.name))
            )
      );
      break;
    case "raw_material.update":
      patchById(qc, "raw_materials", payload.id, payload.patch);
      break;
    case "raw_material.archive":
      updateList(qc, "raw_materials", (rows) => rows.filter((r) => r.id !== payload.id));
      break;

    case "unit.create":
      // Clé exacte : ["raw-material-units", raw_material_id] — voir note en tête
      // de fichier. La liste globale (toutes matières confondues) est une seule
      // liste partagée, le préfixe large reste sûr pour elle.
      upsertInExactList(qc, ["raw-material-units", payload.row.raw_material_id], payload.row, "id");
      updateList(qc, "raw-material-units-all", (rows) =>
        rows.some((r) => r.id === payload.row.id) ? rows : [...rows, payload.row]
      );
      break;
    case "unit.update":
      // Patch par id unique : sûr même avec un préfixe large (ne touche que la
      // ligne portant exactement cet id, où qu'elle se trouve).
      patchById(qc, "raw-material-units", payload.id, payload.patch);
      patchById(qc, "raw-material-units-all", payload.id, payload.patch);
      break;
    case "unit.delete":
      updateList(qc, "raw-material-units", (rows) => rows.filter((r) => r.id !== payload.id));
      updateList(qc, "raw-material-units-all", (rows) => rows.filter((r) => r.id !== payload.id));
      break;

    case "purchase.create":
      bumpStock(qc, "raw_materials", payload.raw_material_id, Number(payload.quantity ?? 0));
      break;

    case "product.create":
      updateList(qc, "products", (rows) =>
        rows.some((r) => r.id === payload.row.id)
          ? rows
          : [...rows, { material_cost: 0, ...payload.row }].sort((a, b) =>
              String(a.name).localeCompare(String(b.name))
            )
      );
      break;
    case "product.update":
      patchById(qc, "products", payload.id, payload.patch);
      break;
    case "product.archive":
      updateList(qc, "products", (rows) => rows.filter((r) => r.id !== payload.id));
      break;

    case "recipe.upsert":
      // Clé exacte : ["recipe", product_id] — voir note en tête de fichier.
      upsertInExactList(qc, ["recipe", payload.row.product_id], payload.row, "raw_material_id");
      break;
    case "recipe.delete":
      // Filtrage par id unique : sûr même avec un préfixe large.
      updateList(qc, "recipe", (rows) => rows.filter((r) => r.id !== payload.id));
      break;

    case "template.create":
      updateList(qc, "batch_templates", (rows) =>
        rows.some((r) => r.id === payload.template.id)
          ? rows
          : [
              ...rows,
              {
                ...payload.template,
                product_id: payload.item?.product_id ?? null,
                planned_quantity: payload.item?.planned_quantity ?? null,
                products: payload.product ?? null,
                batch_template_ingredients: (payload.ingredients ?? []).map((i: Row) => ({
                  ...i,
                  raw_materials: null,
                })),
              },
            ]
      );
      break;
    case "template.delete":
      updateList(qc, "batch_templates", (rows) => rows.filter((r) => r.id !== payload.id));
      break;

    case "batch.create":
      (payload.consumptions ?? []).forEach((c: Row) =>
        bumpStock(qc, "raw_materials", c.raw_material_id, -Number(c.quantity_used ?? 0))
      );
      (payload.outputs ?? []).forEach((o: Row) =>
        bumpStock(qc, "products", o.product_id, Number(o.quantity_produced ?? 0))
      );
      break;

    case "sale.quick":
      bumpStock(
        qc,
        "products",
        payload.product_id,
        -(Number(payload.quantity_sold ?? 0) + Number(payload.thrown_quantity ?? 0))
      );
      break;
    case "sale.simple":
      bumpStock(qc, "products", payload.product_id, -Number(payload.quantity ?? 0));
      break;
    case "loss.record":
      bumpStock(qc, "products", payload.product_id, -Number(payload.quantity ?? 0));
      break;

    default:
      break;
  }
}