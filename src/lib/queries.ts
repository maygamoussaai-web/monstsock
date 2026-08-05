import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  enqueueAction,
  isNetworkError,
  newClientRef,
  newEntityId,
  syncQueue,
  type QueuedAction,
  type QueuedActionKind,
} from "@/lib/offline-queue";
import { ACTION_INVALIDATIONS, executeAction } from "@/lib/offline-actions";
import { applyOptimistic } from "@/lib/offline-optimistic";

type DB = Database["public"]["Tables"];
export type Bakery = DB["bakeries"]["Row"];
export type RawMaterial = DB["raw_materials"]["Row"] & { display_unit_id?: string | null; is_active?: boolean };
export type Purchase = DB["raw_material_purchases"]["Row"];
export type Product = DB["products"]["Row"] & { is_active?: boolean };
export type Recipe = DB["product_recipes"]["Row"];
export type BatchTemplate = DB["batch_templates"]["Row"];
export type BatchTemplateItem = DB["batch_template_items"]["Row"];
export type Batch = DB["batches"]["Row"];
export type BatchConsumption = DB["batch_consumptions"]["Row"];
export type BatchOutput = DB["batch_outputs"]["Row"];
export type SalesSession = DB["sales_sessions"]["Row"];
export type SalesSessionItem = DB["sales_session_items"]["Row"];
export type LedgerEntry = DB["stock_ledger"]["Row"];

// ------- Bakery --------
export function useBakery() {
  return useQuery({
    queryKey: ["bakery"],
    queryFn: async () => {
      const { data: mems, error: e1 } = await supabase
        .from("bakery_members").select("bakery_id").limit(1);
      if (e1) throw e1;
      const id = mems?.[0]?.bakery_id;
      if (!id) return null;
      const { data, error } = await supabase.from("bakeries").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Bakery | null;
    },
  });
}

export function useUpdateBakery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; logo_url?: string | null }) =>
      runOrQueue(qc, {
        kind: "bakery.update",
        entity_id: id,
        label: "Modification de la boulangerie",
        payload: { id, patch },
      }),
    onSuccess: (r) => notifyResult(r, "Boulangerie mise à jour"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// Invalide uniquement les domaines de données concernés, au lieu de recharger toute l'app.
function invalidate(qc: ReturnType<typeof useQueryClient>, keys: string[]) {
  keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Socle « hors ligne d'abord » commun à TOUTES les écritures de l'app :
//  1. le cache local est mis à jour immédiatement (l'app reste utilisable) ;
//  2. l'envoi au serveur est tenté avec un délai court ;
//  3. en cas d'absence de réseau (ou de réseau trop lent), l'action part dans la
//     file d'attente et sera rejouée telle quelle au retour de la connexion —
//     sans risque de doublon grâce au client_ref.
// Une erreur métier du serveur (stock insuffisant…) est renvoyée à l'appelant.
// ─────────────────────────────────────────────────────────────────────────────
const SEND_TIMEOUT_MS = 6000;

export type WriteResult = { queued: boolean; client_ref: string };

async function runOrQueue(
  qc: ReturnType<typeof useQueryClient>,
  input: {
    kind: QueuedActionKind;
    payload: Record<string, unknown>;
    label: string;
    entity_id?: string | null;
  }
): Promise<WriteResult> {
  const client_ref = newClientRef();
  const action: QueuedAction = {
    local_id: client_ref,
    client_ref,
    kind: input.kind,
    payload: input.payload,
    label: input.label,
    entity_id: input.entity_id ?? null,
    queued_at: new Date().toISOString(),
    attempts: 0,
    status: "pending",
    last_error: null,
  };

  // Réactivité immédiate, en ligne comme hors ligne.
  applyOptimistic(qc, input.kind, input.payload);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (!offline) {
    try {
      await withTimeout(executeAction(action), SEND_TIMEOUT_MS);
      invalidate(qc, ACTION_INVALIDATIONS[input.kind] ?? []);
      return { queued: false, client_ref };
    } catch (e) {
      if (!isNetworkError(e)) {
        // Erreur métier : on annule l'optimisme en rechargeant les données.
        invalidate(qc, ACTION_INVALIDATIONS[input.kind] ?? []);
        throw e;
      }
    }
  }

  enqueueAction({ ...input, client_ref });
  return { queued: true, client_ref };
}

function notifyResult(result: { queued: boolean } | undefined, successMessage: string) {
  if (result?.queued) {
    toast.success(`${successMessage} — hors ligne, synchronisation au retour du réseau.`);
  } else {
    toast.success(successMessage);
  }
}


// ------- Raw materials --------
export function useRawMaterials() {
  return useQuery({
    queryKey: ["raw_materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_materials").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as RawMaterial[];
    },
  });
}

export function useCreateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string;
      name: string;
      unit: RawMaterial["unit"];
      purchase_price: number;
      stock: number;
      low_stock_threshold: number;
      notes?: string | null;
    }) => {
      const id = newEntityId();
      const row = { id, ...input, avg_cost: input.purchase_price, is_active: true };
      const result = await runOrQueue(qc, {
        kind: "raw_material.create",
        entity_id: id,
        label: `Matière « ${input.name} »`,
        payload: { row },
      });
      return { ...result, id, row };
    },
    onSuccess: (r) => notifyResult(r, "Matière ajoutée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpdateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RawMaterial> & { id: string }) =>
      runOrQueue(qc, {
        kind: "raw_material.update",
        entity_id: id,
        label: `Modification de la matière ${patch.name ?? ""}`.trim(),
        payload: { id, patch },
      }),
    onSuccess: (r) => notifyResult(r, "Matière mise à jour"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      if (stock > 0) {
        throw new Error("Impossible d'archiver cette matière : le stock doit être nul.");
      }
      // Archivage plutôt que suppression réelle : une matière ayant déjà servi dans une
      // fournée ou une recette est protégée par la base (pour ne jamais casser
      // l'historique), donc une vraie suppression échouerait de toute façon.
      return runOrQueue(qc, {
        kind: "raw_material.archive",
        entity_id: id,
        label: "Archivage d'une matière première",
        payload: { id },
      });
    },
    onSuccess: (r) => notifyResult(r, "Matière archivée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Unités personnalisées (matières premières) --------
export type CustomUnit = {
  id: string; bakery_id: string; raw_material_id: string;
  name: string; factor: number; display_order: number;
};

export function useRawMaterialUnits(rawMaterialId: string | undefined) {
  return useQuery({
    queryKey: ["raw-material-units", rawMaterialId],
    enabled: !!rawMaterialId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("raw_material_units" as any) as any)
        .select("*").eq("raw_material_id", rawMaterialId).order("display_order");
      if (error) throw error;
      return (data ?? []) as CustomUnit[];
    },
  });
}

export function useAllRawMaterialUnits(bakeryId: string | undefined) {
  return useQuery({
    queryKey: ["raw-material-units-all", bakeryId],
    enabled: !!bakeryId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("raw_material_units" as any) as any)
        .select("*").eq("bakery_id", bakeryId).order("display_order");
      if (error) throw error;
      return (data ?? []) as CustomUnit[];
    },
  });
}

export function useCreateRawMaterialUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; raw_material_id: string; name: string; factor: number; display_order?: number }) => {
      const id = newEntityId();
      return runOrQueue(qc, {
        kind: "unit.create",
        entity_id: id,
        label: `Unité « ${input.name} »`,
        payload: { row: { id, display_order: 0, ...input } },
      });
    },
    onSuccess: (r) => notifyResult(r, "Unité ajoutée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpdateRawMaterialUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; factor?: number; display_order?: number }) =>
      runOrQueue(qc, {
        kind: "unit.update",
        entity_id: id,
        label: "Modification d'une unité personnalisée",
        payload: { id, patch },
      }),
    onSuccess: (r) => notifyResult(r, "Unité mise à jour"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteRawMaterialUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      runOrQueue(qc, {
        kind: "unit.delete",
        entity_id: id,
        label: "Suppression d'une unité personnalisée",
        payload: { id },
      }),
    onSuccess: (r) => notifyResult(r, "Unité supprimée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Purchases --------
export function usePurchases(limit = 100) {
  return useQuery({
    queryKey: ["purchases", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("raw_material_purchases").select("*, raw_materials(name,unit)")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as (Purchase & { raw_materials: { name: string; unit: string } | null })[];
    },
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string;
      raw_material_id: string;
      quantity: number;
      unit_price: number;
      supplier?: string | null;
    }) =>
      runOrQueue(qc, {
        kind: "purchase.create",
        entity_id: input.raw_material_id,
        label: `Réapprovisionnement × ${input.quantity}`,
        payload: {
          bakery_id: input.bakery_id,
          raw_material_id: input.raw_material_id,
          quantity: input.quantity,
          unit_price: input.unit_price,
          supplier: input.supplier ?? null,
        },
      }),
    onSuccess: (r) => notifyResult(r, "Réapprovisionnement enregistré"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// record_product_sale (version simple, sans session) : pour une vente ponctuelle d'un produit,
// sans invendus à répartir. useQuickSale (plus bas) gère le cas avec invendus.
export function useRecordProductSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id: string; quantity: number; unit_price: number }) =>
      runOrQueue(qc, {
        kind: "sale.simple",
        entity_id: input.product_id,
        label: `Vente × ${input.quantity}`,
        payload: input,
      }),
    onSuccess: (r) => notifyResult(r, "Vente enregistrée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// record_loss : uniquement des pertes de PRODUITS (product_id obligatoire) — pas de matières premières.
export function useRecordLoss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id: string; quantity: number; reason?: string | null }) =>
      runOrQueue(qc, {
        kind: "loss.record",
        entity_id: input.product_id,
        label: `Perte × ${input.quantity}`,
        payload: input,
      }),
    onSuccess: (r) => notifyResult(r, "Perte enregistrée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Products & recipes --------
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Product | null;
    },
  });
}

export function useRecipe(productId: string | undefined) {
  return useQuery({
    queryKey: ["recipe", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase.from("product_recipes")
        .select("*, raw_materials(name,unit,avg_cost)")
        .eq("product_id", productId!);
      if (error) throw error;
      return data as (Recipe & { raw_materials: { name: string; unit: string; avg_cost: number } | null })[];
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string;
      name: string;
      unit: Product["unit"];
      sale_price: number;
      stock: number;
      low_stock_threshold: number;
      notes?: string | null;
    }) => {
      const id = newEntityId();
      const row = { id, ...input, is_active: true };
      const result = await runOrQueue(qc, {
        kind: "product.create",
        entity_id: id,
        label: `Produit « ${input.name} »`,
        payload: { row },
      });
      return { ...result, id, row };
    },
    onSuccess: (r) => notifyResult(r, "Produit créé"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Product> & { id: string }) =>
      runOrQueue(qc, {
        kind: "product.update",
        entity_id: id,
        label: `Modification du produit ${patch.name ?? ""}`.trim(),
        payload: { id, patch },
      }),
    onSuccess: (r) => notifyResult(r, "Produit mis à jour"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      if (stock > 0) {
        throw new Error("Impossible d'archiver ce produit : le stock doit être nul.");
      }
      return runOrQueue(qc, {
        kind: "product.archive",
        entity_id: id,
        label: "Archivage d'un produit",
        payload: { id },
      });
    },
    onSuccess: (r) => notifyResult(r, "Produit archivé"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpsertRecipeLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string; product_id: string; raw_material_id: string; quantity_per_unit?: number | null;
    }) =>
      runOrQueue(qc, {
        kind: "recipe.upsert",
        entity_id: input.product_id,
        label: "Ligne de recette",
        payload: {
          row: {
            id: newEntityId(),
            bakery_id: input.bakery_id,
            product_id: input.product_id,
            raw_material_id: input.raw_material_id,
            quantity_per_unit: input.quantity_per_unit ?? null,
          },
        },
      }),
    onSuccess: () => {},
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteRecipeLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      runOrQueue(qc, {
        kind: "recipe.delete",
        entity_id: id,
        label: "Suppression d'une ligne de recette",
        payload: { id },
      }),
    onSuccess: () => {},
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Batch templates --------
export function useBatchTemplates() {
  return useQuery({
    queryKey: ["batch_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("batch_templates")
        .select(`*,
          batch_template_items(product_id, planned_quantity, products(name,unit)),
          batch_template_ingredients(*, raw_materials(name,unit))`)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((t: any) => {
        const item = t.batch_template_items?.[0] ?? null;
        return {
          ...t,
          product_id: item?.product_id ?? null,
          planned_quantity: item?.planned_quantity ?? null,
          products: item?.products ?? null,
          batch_template_ingredients: t.batch_template_ingredients ?? [],
        };
      }) as (BatchTemplate & {
        product_id: string | null;
        planned_quantity: number | null;
        products: { name: string; unit: string } | null;
        batch_template_ingredients: {
          id: string;
          raw_material_id: string;
          quantity: number;
          raw_materials: { name: string; unit: string } | null;
        }[];
      })[];
    },
  });
}

export function useCreateBatchTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string;
      name: string;
      product_id: string;
      planned_quantity: number;
      ingredients: { raw_material_id: string; quantity: number }[];
    }) => {
      const templateId = newEntityId();
      return runOrQueue(qc, {
        kind: "template.create",
        entity_id: templateId,
        label: `Modèle « ${input.name} »`,
        payload: {
          template: { id: templateId, bakery_id: input.bakery_id, name: input.name },
          item: {
            id: newEntityId(),
            bakery_id: input.bakery_id,
            template_id: templateId,
            product_id: input.product_id,
            planned_quantity: input.planned_quantity,
          },
          ingredients: input.ingredients.map((i) => ({
            id: newEntityId(),
            bakery_id: input.bakery_id,
            template_id: templateId,
            raw_material_id: i.raw_material_id,
            quantity: i.quantity,
          })),
        },
      });
    },
    onSuccess: (r) => notifyResult(r, "Modèle créé"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteBatchTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      runOrQueue(qc, {
        kind: "template.delete",
        entity_id: id,
        label: "Suppression d'un modèle de fournée",
        payload: { id },
      }),
    onSuccess: (r) => notifyResult(r, "Modèle supprimé"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Batches --------
export function useBatches(limit = 50) {
  return useQuery({
    queryKey: ["batches", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("batches")
        .select("*, batch_outputs(*, products(name,unit)), batch_consumptions(*, raw_materials(name,unit))")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as (Batch & {
        batch_outputs: (BatchOutput & { products: { name: string; unit: string } | null })[];
        batch_consumptions: (BatchConsumption & { raw_materials: { name: string; unit: string } | null })[];
      })[];
    },
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string;
      name: string;
      notes?: string | null;
      consumptions: { raw_material_id: string; quantity_used: number }[];
      outputs: { product_id: string; quantity_produced: number }[];
    }) =>
      runOrQueue(qc, {
        kind: "batch.create",
        label: `Fournée « ${input.name} »`,
        payload: {
          bakery_id: input.bakery_id,
          name: input.name,
          notes: input.notes ?? null,
          consumptions: input.consumptions,
          outputs: input.outputs.map((o) => ({
            product_id: o.product_id,
            quantity_produced: o.quantity_produced,
          })),
        },
      }),
    onSuccess: (r) => notifyResult(r, "Fournée enregistrée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Sales --------
export function useSalesSessions(limit = 30) {
  return useQuery({
    queryKey: ["sales", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_sessions")
        .select("*, sales_session_items(*, products(name,unit))")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as (SalesSession & {
        sales_session_items: (SalesSessionItem & { products: { name: string; unit: string } | null })[];
      })[];
    },
  });
}

export function useCreateSalesSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string; name: string; session_date: string;
      items: { product_id: string; opening_stock: number; unsold: number; price_at_sale: number }[];
    }) => {
      const sessionId = newEntityId();
      const result = await runOrQueue(qc, {
        kind: "sales_session.create",
        entity_id: sessionId,
        label: `Session de vente « ${input.name} »`,
        payload: {
          session: {
            id: sessionId,
            bakery_id: input.bakery_id,
            name: input.name,
            session_date: input.session_date,
          },
          items: input.items.map((it) => ({
            id: newEntityId(),
            bakery_id: input.bakery_id,
            session_id: sessionId,
            product_id: it.product_id,
            opening_stock: it.opening_stock,
            unsold: it.unsold,
            price_at_sale: it.price_at_sale,
          })),
        },
      });
      return { ...result, id: sessionId };
    },
    onSuccess: (r) => notifyResult(r, "Session ouverte"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useCloseSalesSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      runOrQueue(qc, {
        kind: "sales_session.close",
        entity_id: id,
        label: "Clôture d'une session de vente",
        payload: { id },
      }),
    onSuccess: (r) => notifyResult(r, "Session clôturée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}


// ------- Quick single-product sale --------
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("network-timeout")), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// ------- Vente rapide (un produit, avec invendus) --------
export function useQuickSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string; product_id: string; product_name: string; quantity_sold: number; unit_price: number;
      kept_quantity: number; thrown_quantity: number;
    }) =>
      runOrQueue(qc, {
        kind: "sale.quick",
        entity_id: input.product_id,
        label: `Vente ${input.product_name} × ${input.quantity_sold}`,
        payload: {
          bakery_id: input.bakery_id,
          product_id: input.product_id,
          quantity_sold: input.quantity_sold,
          unit_price: input.unit_price,
          kept_quantity: input.kept_quantity,
          thrown_quantity: input.thrown_quantity,
        },
      }),
    onSuccess: (r) => notifyResult(r, "Vente enregistrée"),
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// Synchronise la file d'attente hors ligne : au démarrage de l'app, à chaque
// retour de connexion, et au retour de l'app au premier plan.
export function useOfflineQueueSync() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const domains = new Set<string>();
      const { synced, failed } = await syncQueue(async (action: QueuedAction) => {
        await executeAction(action);
        (ACTION_INVALIDATIONS[action.kind] ?? []).forEach((d) => domains.add(d));
      });
      if (cancelled) return;
      if (synced > 0) {
        invalidate(qc, [...domains]);
        toast.success(
          `${synced} action${synced > 1 ? "s" : ""} hors ligne synchronisée${synced > 1 ? "s" : ""}`
        );
      }
      if (failed > 0) {
        toast.error(
          `${failed} action${failed > 1 ? "s" : ""} n'a pas pu être synchronisée — à vérifier dans « À synchroniser ».`
        );
      }
    }

    run();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [qc]);
}

// Rejeu manuel (bouton « Réessayer » de la liste des actions en attente).
export function useRetryQueue() {
  const qc = useQueryClient();
  return async () => {
    const domains = new Set<string>();
    const { synced, failed } = await syncQueue(async (action: QueuedAction) => {
      await executeAction(action);
      (ACTION_INVALIDATIONS[action.kind] ?? []).forEach((d) => domains.add(d));
    });
    if (synced > 0) {
      invalidate(qc, [...domains]);
      toast.success(`${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}`);
    } else if (failed === 0) {
      toast.info("Rien à synchroniser pour le moment.");
    }
    return { synced, failed };
  };
}


// ------- Ledger --------
export function useLedger(limit = 200) {
  return useQuery({
    queryKey: ["ledger", limit],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_ledger")
        .select("*, raw_materials(name,unit), products(name,unit)")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as (LedgerEntry & {
        raw_materials: { name: string; unit: string } | null;
        products: { name: string; unit: string } | null;
      })[];
    },
  });
}

// ============================================================
// Équipe, invitations, abonnements, journal d'activité
// ============================================================

export type MemberRole = "owner" | "staff";

export function useCurrentMember() {
  return useQuery({
    queryKey: ["current-member"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("bakery_members")
        .select("bakery_id, role, user_id, phone")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as { bakery_id: string; role: MemberRole; user_id: string; phone: string | null } | null;
    },
  });
}

export function useUpdateMemberPhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { error } = await supabase
        .from("bakery_members")
        .update({ phone })
        .eq("user_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Téléphone mis à jour"); invalidate(qc, ["current-member"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteBakery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bakeryId: string) => {
      const { error } = await supabase.rpc("owner_delete_bakery" as any, { _bakery_id: bakeryId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Boulangerie supprimée");
      invalidate(qc, ["bakery", "current-member", "bakery-members"]);
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useBakeryMembers() {
  return useQuery({
    queryKey: ["bakery-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bakery_members")
        .select("bakery_id, user_id, role, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as { bakery_id: string; user_id: string; role: MemberRole; created_at: string }[];
    },
  });
}

export function useMemberActivity(userId: string | undefined, bakeryId: string | undefined) {
  return useQuery({
    queryKey: ["activity", userId, bakeryId],
    enabled: !!userId && !!bakeryId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("activity_log" as any) as any)
        .select("*")
        .eq("user_id", userId)
        .eq("bakery_id", bakeryId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as {
        id: string; bakery_id: string; user_id: string;
        action_type: string; description: string | null; created_at: string;
      }[];
    },
  });
}

export function useBakeryInvitations(bakeryId: string | undefined) {
  return useQuery({
    queryKey: ["invitations", bakeryId],
    enabled: !!bakeryId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("bakery_invitations" as any) as any)
        .select("*")
        .eq("bakery_id", bakeryId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as {
        id: string; token: string; expires_at: string; used_at: string | null; created_at: string;
      }[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bakeryId: string) => {
      const { data, error } = await supabase.rpc("create_bakery_invitation" as any, { _bakery_id: bakeryId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { toast.success("Lien d'invitation généré"); invalidate(qc, ["invitations"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useAcceptInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc("accept_bakery_invitation" as any, { _token: token });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { toast.success("Vous avez rejoint la boulangerie"); invalidate(qc, ["bakery", "current-member", "bakery-members"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bakery_id, user_id }: { bakery_id: string; user_id: string }) => {
      const { error } = await supabase.rpc("remove_bakery_member" as any, {
        _bakery_id: bakery_id, _user_id: user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Employé retiré"); invalidate(qc, ["bakery-members"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bakery_id, new_owner }: { bakery_id: string; new_owner: string }) => {
      const { error } = await supabase.rpc("transfer_bakery_ownership" as any, {
        _bakery_id: bakery_id, _new_owner_id: new_owner,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rôle de gérant transféré"); invalidate(qc, ["bakery-members", "current-member"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useSubscription(bakeryId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", bakeryId],
    enabled: !!bakeryId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("subscriptions" as any) as any)
        .select("*")
        .eq("bakery_id", bakeryId)
        .maybeSingle();
      if (error) throw error;
      return data as null | {
        status: "trial" | "active" | "expired" | "blocked";
        plan: "monthly" | "annual" | null;
        trial_end: string | null;
        subscription_end: string | null;
      };
    },
  });
}