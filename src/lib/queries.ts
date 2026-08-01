import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type DB = Database["public"]["Tables"];
export type Bakery = DB["bakeries"]["Row"];
export type RawMaterial = DB["raw_materials"]["Row"];
export type Purchase = DB["raw_material_purchases"]["Row"];
export type Product = DB["products"]["Row"];
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
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; logo_url?: string | null }) => {
      const { error } = await supabase.from("bakeries").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Boulangerie mise à jour"); invalidate(qc, ["bakery"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// Invalide uniquement les domaines de données concernés, au lieu de recharger toute l'app.
function invalidate(qc: ReturnType<typeof useQueryClient>, keys: string[]) {
  keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}

// ------- Raw materials --------
export function useRawMaterials() {
  return useQuery({
    queryKey: ["raw_materials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("raw_materials").select("*").order("name");
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
      const { error, data } = await supabase.from("raw_materials").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Matière ajoutée"); invalidate(qc, ["raw_materials"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpdateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RawMaterial> & { id: string }) => {
      const { error } = await supabase.from("raw_materials").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Matière mise à jour"); invalidate(qc, ["raw_materials"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      if (stock > 0) {
        throw new Error("Impossible de supprimer cette matière : le stock doit être nul pour pouvoir la supprimer.");
      }
      const { error } = await supabase.from("raw_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Matière supprimée"); invalidate(qc, ["raw_materials"]); },
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
    }) => {
      const args: Record<string, unknown> = {
        p_bakery_id: input.bakery_id,
        p_raw_material_id: input.raw_material_id,
        p_quantity: input.quantity,
        p_unit_price: input.unit_price,
      };
      if (input.supplier) args.p_supplier = input.supplier;
      const { error } = await supabase.rpc("record_purchase", args as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Réapprovisionnement enregistré"); invalidate(qc, ["raw_materials", "purchases", "ledger"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// record_product_sale (version simple, sans session) : pour une vente ponctuelle d'un produit,
// sans invendus à répartir. useQuickSale (plus bas) gère le cas avec invendus.
export function useRecordProductSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id: string; quantity: number; unit_price: number }) => {
      const { error } = await supabase.rpc("record_product_sale", {
        p_bakery_id: input.bakery_id,
        p_product_id: input.product_id,
        p_quantity: input.quantity,
        p_price: input.unit_price,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vente enregistrée"); invalidate(qc, ["products", "ledger", "sales"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// record_loss : uniquement des pertes de PRODUITS (product_id obligatoire) — pas de matières premières.
export function useRecordLoss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id: string; quantity: number; reason?: string | null }) => {
      const args: Record<string, unknown> = {
        p_bakery_id: input.bakery_id,
        p_product_id: input.product_id,
        p_quantity: input.quantity,
      };
      if (input.reason) args.p_reason = input.reason;
      const { error } = await supabase.rpc("record_loss", args as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perte enregistrée"); invalidate(qc, ["products", "ledger"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// ------- Products & recipes --------
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
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
      const { data, error } = await supabase.from("products").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Produit créé"); invalidate(qc, ["products"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from("products").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produit mis à jour"); invalidate(qc, ["products"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      if (stock > 0) {
        throw new Error("Impossible de supprimer ce produit : le stock doit être nul pour pouvoir le supprimer.");
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produit supprimé"); invalidate(qc, ["products"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useUpsertRecipeLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string; product_id: string; raw_material_id: string; quantity_per_unit?: number | null;
    }) => {
      const payload = { ...input, quantity_per_unit: input.quantity_per_unit ?? null };
      const { error } = await supabase.from("product_recipes")
        .upsert(payload as any, { onConflict: "product_id,raw_material_id" });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(qc, ["recipe", "products"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteRecipeLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(qc, ["recipe", "products"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// ------- Batch templates --------
// Un modèle (batch_templates) a un seul produit/quantité prévue, stocké dans batch_template_items,
// et une liste d'ingrédients dans batch_template_ingredients. On aplatit tout pour l'UI existante.
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
      const { data: tpl, error } = await supabase.from("batch_templates")
        .insert({ bakery_id: input.bakery_id, name: input.name })
        .select().single();
      if (error) throw error;

      const { error: e2 } = await supabase.from("batch_template_items").insert({
        bakery_id: input.bakery_id,
        template_id: tpl.id,
        product_id: input.product_id,
        planned_quantity: input.planned_quantity,
      });
      if (e2) throw e2;

      if (input.ingredients.length) {
        const { error: e3 } = await supabase.from("batch_template_ingredients").insert(
          input.ingredients.map((i) => ({ ...i, bakery_id: input.bakery_id, template_id: tpl.id }))
        );
        if (e3) throw e3;
      }
    },
    onSuccess: () => { toast.success("Modèle créé"); invalidate(qc, ["batch_templates"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useDeleteBatchTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("batch_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(qc, ["batch_templates"]); toast.success("Modèle supprimé"); },
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
    }) => {
      const { error } = await supabase.rpc("record_batch", {
        p_bakery_id: input.bakery_id,
        p_name: input.name,
        p_consumptions: input.consumptions as any,
        p_outputs: input.outputs.map((o) => ({ product_id: o.product_id, quantity_produced: o.quantity_produced })) as any,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fournée enregistrée"); invalidate(qc, ["batches", "raw_materials", "products", "ledger"]); },
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
      const { data: session, error } = await supabase
        .from("sales_sessions")
        .insert({ bakery_id: input.bakery_id, name: input.name, session_date: input.session_date })
        .select().single();
      if (error) throw error;
      if (input.items.length) {
        const { error: e2 } = await supabase.from("sales_session_items").insert(
          input.items.map((it) => ({
            bakery_id: input.bakery_id,
            session_id: session.id,
            product_id: it.product_id,
            opening_stock: it.opening_stock,
            unsold: it.unsold,
            price_at_sale: it.price_at_sale,
          }))
        );
        if (e2) throw e2;
      }
      return session.id;
    },
    onSuccess: () => { toast.success("Session ouverte"); invalidate(qc, ["sales"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useCloseSalesSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("close_sales_session", { _session_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session clôturée"); invalidate(qc, ["sales", "products", "ledger"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

// ------- Quick single-product sale --------
// Répartit les invendus (s'il y en a) entre "conservés en stock" et "jetés (perte)".
// La somme des deux ne doit jamais dépasser le nombre d'invendus (vérifié côté UI dans sales.tsx).
// Tout est fait en une seule transaction atomique côté base (record_quick_sale), et la ligne de
// perte est liée à la ligne de vente (ref_id) pour qu'elles apparaissent ensemble dans l'historique.
export function useQuickSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bakery_id: string; product_id: string; quantity_sold: number; unit_price: number;
      kept_quantity: number; thrown_quantity: number;
    }) => {
      const { error } = await supabase.rpc("record_quick_sale" as any, {
        p_bakery_id: input.bakery_id,
        p_product_id: input.product_id,
        p_quantity_sold: input.quantity_sold,
        p_unit_price: input.unit_price,
        p_kept_quantity: input.kept_quantity,
        p_thrown_quantity: input.thrown_quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vente enregistrée"); invalidate(qc, ["products", "ledger", "sales"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
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

// Le gérant modifie SON PROPRE numéro de téléphone (indicatif + numéro déjà concaténés côté UI).
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

// Suppression self-service de la boulangerie par son gérant (owner_delete_bakery, distinct de
// admin_delete_bakery qui est réservé aux admins MAYGA).
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
