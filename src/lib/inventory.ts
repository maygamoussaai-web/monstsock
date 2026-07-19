import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Unit = "kg" | "g" | "L" | "mL" | "unité";
export type Product = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit: Unit;
  quantity: number;
  low_stock_threshold: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type Movement = {
  id: string;
  user_id: string;
  product_id: string;
  type: "in" | "out";
  quantity: number;
  note: string | null;
  created_at: string;
};

export const CATEGORIES = [
  "Matières premières",
  "Viennoiseries",
  "Pains",
  "Pâtisseries",
  "Boissons",
  "Emballages",
  "Autre",
];

export const UNITS: Unit[] = ["kg", "g", "L", "mL", "unité"];

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useMovements() {
  return useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements").select("*")
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as Movement[];
    },
  });
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Product> & { name: string; category: string; unit: Unit }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user!.id;
      if (input.id) {
        const { error } = await supabase.from("products").update({
          name: input.name, category: input.category, unit: input.unit,
          quantity: input.quantity ?? 0, low_stock_threshold: input.low_stock_threshold ?? 5,
          notes: input.notes ?? null,
        }).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({
          user_id, name: input.name, category: input.category, unit: input.unit,
          quantity: input.quantity ?? 0, low_stock_threshold: input.low_stock_threshold ?? 5,
          notes: input.notes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["movements"] });
    },
  });
}

export function useAddMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { product_id: string; type: "in" | "out"; quantity: number; note?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user!.id;
      const { error } = await supabase.from("stock_movements").insert({
        user_id, product_id: input.product_id, type: input.type,
        quantity: input.quantity, note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function formatQty(q: number, unit: string) {
  const n = Number(q);
  const rounded = Math.abs(n) < 10 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
  return `${rounded} ${unit}`;
}
