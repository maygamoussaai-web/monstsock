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
    mutationFn: async (id: string) => {
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
      notes?: string | null;
    }) => {
      const { error } = await supabase.rpc("record_purchase", {
        _bakery_id: input.bakery_id,
        _raw_material_id: input.raw_material_id,
        _quantity: input.quantity,
        _unit_price: input.unit_price,
        _supplier: input.supplier ?? undefined,
        _notes: input.notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Réapprovisionnement enregistré"); invalidate(qc, ["raw_materials", "purchases", "ledger"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useRecordProductSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id: string; quantity: number; unit_price: number; notes?: string | null }) => {
      const { error } = await supabase.rpc("record_product_sale", {
        _bakery_id: input.bakery_id,
        _product_id: input.product_id,
        _quantity: input.quantity,
        _unit_price: input.unit_price,
        _notes: input.notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Vente enregistrée"); invalidate(qc, ["products", "ledger", "sales"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useRecordLoss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; product_id?: string | null; raw_material_id?: string | null; quantity: number; notes?: string | null }) => {
      const { error } = await supabase.rpc("record_loss", {
        _bakery_id: input.bakery_id,
        _product_id: input.product_id ?? undefined,
        _raw_material_id: input.raw_material_id ?? undefined,
        _quantity: input.quantity,
        _notes: input.notes ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perte enregistrée"); invalidate(qc, ["products", "raw_materials", "ledger"]); },
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
    mutationFn: async (id: string) => {
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
      bakery_id: string; product_id: string; raw_material_id: string; quantity_per_unit: number;
    }) => {
      const { error } = await supabase.from("product_recipes")
        .upsert(input, { onConflict: "product_id,raw_material_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Recette mise à jour"); invalidate(qc, ["recipe", "products"]); },
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
export function useBatchTemplates() {
  return useQuery({
    queryKey: ["batch_templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("batch_templates")
        .select("*, batch_template_items(*, products(name,unit))")
        .order("name");
      if (error) throw error;
      return data as (BatchTemplate & {
        batch_template_items: (BatchTemplateItem & { products: { name: string; unit: string } | null })[];
      })[];
    },
  });
}

export function useCreateBatchTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bakery_id: string; name: string; items: { product_id: string; planned_quantity: number }[] }) => {
      const { data: tpl, error } = await supabase.from("batch_templates")
        .insert({ bakery_id: input.bakery_id, name: input.name }).select().single();
      if (error) throw error;
      if (input.items.length) {
        const { error: e2 } = await supabase.from("batch_template_items").insert(
          input.items.map((i) => ({ ...i, bakery_id: input.bakery_id, template_id: tpl.id }))
        );
        if (e2) throw e2;
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
      template_id?: string | null;
      notes?: string | null;
      consumptions: { raw_material_id: string; quantity_used: number }[];
      outputs: { product_id: string; quantity_produced: number }[];
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: batch, error } = await supabase.from("batches").insert({
        bakery_id: input.bakery_id, name: input.name, template_id: input.template_id ?? null,
        notes: input.notes ?? null, created_by: u.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      if (input.consumptions.length) {
        const { error: e2 } = await supabase.from("batch_consumptions").insert(
          input.consumptions.map((c) => ({ ...c, bakery_id: input.bakery_id, batch_id: batch.id }))
        );
        if (e2) throw e2;
      }
      if (input.outputs.length) {
        const { error: e3 } = await supabase.from("batch_outputs").insert(
          input.outputs.map((o) => ({ ...o, bakery_id: input.bakery_id, batch_id: batch.id }))
        );
        if (e3) throw e3;
      }
      const { error: e4 } = await supabase.rpc("complete_batch" as any, { _batch_id: batch.id });
      if (e4) throw e4;
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
      bakery_id: string; name: string; session_date: string; notes?: string | null;
      items: { product_id: string; opening_stock: number; restocked: number; closing_stock: number; unsold: number; price_at_sale: number }[];
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data: s, error } = await supabase.from("sales_sessions").insert({
        bakery_id: input.bakery_id, name: input.name, session_date: input.session_date,
        notes: input.notes ?? null, created_by: u.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      if (input.items.length) {
        const { error: e2 } = await supabase.from("sales_session_items").insert(
          input.items.map((i) => ({ ...i, bakery_id: input.bakery_id, session_id: s.id }))
        );
        if (e2) throw e2;
      }
      return s;
    },
    onSuccess: () => { toast.success("Session ouverte"); invalidate(qc, ["sales"]); },
    onError: (e: any) => toast.error(e.message ?? "Erreur"),
  });
}

export function useCloseSalesSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("close_sales_session" as any, { _session_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session clôturée"); invalidate(qc, ["sales", "products", "ledger"]); },
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
