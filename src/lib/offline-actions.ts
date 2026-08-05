import { supabase } from "@/integrations/supabase/client";
import type { QueuedAction } from "@/lib/offline-queue";

// ─────────────────────────────────────────────────────────────────────────────
// Exécuteurs : traduisent une action de la file en appel Supabase.
// C'est EXACTEMENT le même code qui sert à l'envoi immédiat (en ligne) et au
// rejeu ultérieur (retour de réseau) — aucune logique dupliquée.
//
// Les créations utilisent un identifiant généré côté client (upsert) : rejouer
// deux fois n'a aucun effet supplémentaire, et une action hors ligne suivante
// peut déjà s'y référer. Les fonctions RPC reçoivent p_client_ref : le serveur
// refuse de les appliquer deux fois.
// ─────────────────────────────────────────────────────────────────────────────

function fail(error: unknown) {
  if (error) throw error;
}

const t = (x: unknown) => x as any;

export async function executeAction(action: QueuedAction): Promise<void> {
  const p = action.payload as any;
  const ref = action.client_ref;

  switch (action.kind) {
    case "bakery.update": {
      const { error } = await supabase.from("bakeries").update(t(p.patch)).eq("id", p.id);
      return fail(error);
    }

    // ------------------------------------------------------- matières premières
    case "raw_material.create": {
      const { error } = await supabase.from("raw_materials").upsert(t(p.row));
      return fail(error);
    }
    case "raw_material.update": {
      const { error } = await supabase.from("raw_materials").update(t(p.patch)).eq("id", p.id);
      return fail(error);
    }
    case "raw_material.archive": {
      const { error } = await supabase.from("raw_materials").update(t({ is_active: false })).eq("id", p.id);
      return fail(error);
    }

    // ------------------------------------------------------ unités personnalisées
    case "unit.create": {
      const { error } = await t(supabase.from("raw_material_units" as any)).upsert(p.row);
      return fail(error);
    }
    case "unit.update": {
      const { error } = await t(supabase.from("raw_material_units" as any)).update(p.patch).eq("id", p.id);
      return fail(error);
    }
    case "unit.delete": {
      const { error } = await t(supabase.from("raw_material_units" as any)).delete().eq("id", p.id);
      return fail(error);
    }

    // ------------------------------------------------------------ réapprovisionnement
    case "purchase.create": {
      const args: Record<string, unknown> = {
        p_bakery_id: p.bakery_id,
        p_raw_material_id: p.raw_material_id,
        p_quantity: p.quantity,
        p_unit_price: p.unit_price,
        p_client_ref: ref,
      };
      if (p.supplier) args.p_supplier = p.supplier;
      const { error } = await supabase.rpc("record_purchase", t(args));
      return fail(error);
    }

    // -------------------------------------------------------------------- produits
    case "product.create": {
      const { error } = await supabase.from("products").upsert(t(p.row));
      return fail(error);
    }
    case "product.update": {
      const { error } = await supabase.from("products").update(t(p.patch)).eq("id", p.id);
      return fail(error);
    }
    case "product.archive": {
      const { error } = await supabase.from("products").update(t({ is_active: false })).eq("id", p.id);
      return fail(error);
    }

    // -------------------------------------------------------------------- recettes
    case "recipe.upsert": {
      const { error } = await supabase
        .from("product_recipes")
        .upsert(t(p.row), { onConflict: "product_id,raw_material_id" });
      return fail(error);
    }
    case "recipe.delete": {
      const { error } = await supabase.from("product_recipes").delete().eq("id", p.id);
      return fail(error);
    }

    // ------------------------------------------------------------ modèles de fournée
    case "template.create": {
      const { error } = await supabase.from("batch_templates").upsert(t(p.template));
      if (error) throw error;
      const { error: e2 } = await supabase.from("batch_template_items").upsert(t(p.item));
      if (e2) throw e2;
      if (p.ingredients?.length) {
        const { error: e3 } = await supabase.from("batch_template_ingredients").upsert(t(p.ingredients));
        if (e3) throw e3;
      }
      return;
    }
    case "template.delete": {
      const { error } = await supabase.from("batch_templates").delete().eq("id", p.id);
      return fail(error);
    }

    // -------------------------------------------------------------------- fournées
    case "batch.create": {
      const { error } = await supabase.rpc("record_batch", t({
        p_bakery_id: p.bakery_id,
        p_name: p.name,
        p_consumptions: p.consumptions,
        p_outputs: p.outputs,
        p_notes: p.notes ?? undefined,
        p_client_ref: ref,
      }));
      return fail(error);
    }

    // ---------------------------------------------------------- ventes et pertes
    case "sale.quick": {
      const { error } = await supabase.rpc("record_quick_sale" as any, t({
        p_bakery_id: p.bakery_id,
        p_product_id: p.product_id,
        p_quantity_sold: p.quantity_sold,
        p_unit_price: p.unit_price,
        p_kept_quantity: p.kept_quantity ?? 0,
        p_thrown_quantity: p.thrown_quantity ?? 0,
        p_client_ref: ref,
      }));
      return fail(error);
    }
    case "sale.simple": {
      const { error } = await supabase.rpc("record_product_sale", t({
        p_bakery_id: p.bakery_id,
        p_product_id: p.product_id,
        p_quantity: p.quantity,
        p_price: p.unit_price,
        p_client_ref: ref,
      }));
      return fail(error);
    }
    case "loss.record": {
      const args: Record<string, unknown> = {
        p_bakery_id: p.bakery_id,
        p_product_id: p.product_id,
        p_quantity: p.quantity,
        p_client_ref: ref,
      };
      if (p.reason) args.p_reason = p.reason;
      const { error } = await supabase.rpc("record_loss", t(args));
      return fail(error);
    }

    // ------------------------------------------------------- sessions de vente
    case "sales_session.create": {
      const { error } = await supabase.from("sales_sessions").upsert(t(p.session));
      if (error) throw error;
      if (p.items?.length) {
        const { error: e2 } = await supabase.from("sales_session_items").upsert(t(p.items));
        if (e2) throw e2;
      }
      return;
    }
    case "sales_session.close": {
      const { error } = await supabase.rpc("close_sales_session", t({
        _session_id: p.id,
        _client_ref: ref,
      }));
      return fail(error);
    }

    default: {
      throw new Error(`Action inconnue : ${(action as QueuedAction).kind}`);
    }
  }
}

// Domaines de données à rafraîchir après le succès d'une action donnée.
export const ACTION_INVALIDATIONS: Record<QueuedAction["kind"], string[]> = {
  "bakery.update": ["bakery"],
  "raw_material.create": ["raw_materials"],
  "raw_material.update": ["raw_materials"],
  "raw_material.archive": ["raw_materials"],
  "unit.create": ["raw-material-units", "raw-material-units-all"],
  "unit.update": ["raw-material-units", "raw-material-units-all"],
  "unit.delete": ["raw-material-units", "raw-material-units-all", "raw_materials"],
  "purchase.create": ["raw_materials", "purchases", "ledger"],
  "product.create": ["products"],
  "product.update": ["products"],
  "product.archive": ["products"],
  "recipe.upsert": ["recipe", "products"],
  "recipe.delete": ["recipe", "products"],
  "template.create": ["batch_templates"],
  "template.delete": ["batch_templates"],
  "batch.create": ["batches", "raw_materials", "products", "ledger"],
  "sale.quick": ["products", "ledger", "sales"],
  "sale.simple": ["products", "ledger", "sales"],
  "loss.record": ["products", "ledger"],
  "sales_session.create": ["sales"],
  "sales_session.close": ["sales", "products", "ledger"],
};
