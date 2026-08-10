import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useBakery,
  useProducts,
  useAllRawMaterialUnits,
  useBatchTemplates,
  useBatches,
  type CustomUnit,
} from "@/lib/queries";
import { useOnlineStatus } from "@/lib/offline";

// ─────────────────────────────────────────────────────────────────────────────
// Préchargement automatique des données consultées "à la demande" — jusqu'ici,
// certaines données n'étaient mises en cache hors ligne QUE si l'utilisateur
// avait explicitement ouvert la page correspondante pendant qu'il était en
// ligne. Ces hooks, appelés une fois dans le layout authentifié, chargent tout
// ça automatiquement dès que l'app a du réseau.
// ─────────────────────────────────────────────────────────────────────────────

export function usePrefetchAllRecipes() {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const { data: products = [] } = useProducts();

  useEffect(() => {
    if (!online || products.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("product_recipes")
        .select("*, raw_materials(name,unit,avg_cost)")
        .in("product_id", products.map((p) => p.id));
      if (cancelled || error || !data) return;
      const byProduct: Record<string, unknown[]> = {};
      for (const row of data as any[]) {
        (byProduct[row.product_id] ??= []).push(row);
      }
      for (const p of products) {
        qc.setQueryData(["recipe", p.id], byProduct[p.id] ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, products.length]);
}

export function usePrefetchUnitsPerMaterial() {
  const qc = useQueryClient();
  const { data: bakery } = useBakery();
  const { data: allUnits = [] } = useAllRawMaterialUnits(bakery?.id);

  useEffect(() => {
    if (allUnits.length === 0) return;
    const byMaterial: Record<string, CustomUnit[]> = {};
    for (const u of allUnits) (byMaterial[u.raw_material_id] ??= []).push(u);
    for (const [materialId, units] of Object.entries(byMaterial)) {
      qc.setQueryData(["raw-material-units", materialId], units);
    }
  }, [allUnits, qc]);
}

export function usePrefetchLedger() {
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const { data: bakery } = useBakery();

  useEffect(() => {
    if (!online || !bakery) return;
    [300, 200, 800].forEach((limit) => {
      qc.prefetchQuery({
        queryKey: ["ledger", limit],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("stock_ledger")
            .select("*, raw_materials(name,unit), products(name,unit)")
            .order("created_at", { ascending: false })
            .limit(limit);
          if (error) throw error;
          return data;
        },
      });
    });
  }, [online, bakery, qc]);
}

// Modèles de fournée et fournées récentes : ce sont déjà des hooks normaux
// (useBatchTemplates/useBatches) — les appeler ici, en plus de leur page
// habituelle, suffit à remplir le même cache sans dupliquer la moindre requête.
export function usePrefetchTemplatesAndBatches() {
  useBatchTemplates();
  useBatches();
}

// À appeler une seule fois dans le layout authentifié.
export function usePrefetchOfflineEssentials() {
  usePrefetchAllRecipes();
  usePrefetchUnitsPerMaterial();
  usePrefetchLedger();
  usePrefetchTemplatesAndBatches();
}