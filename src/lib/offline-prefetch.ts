import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBakery, useProducts, useAllRawMaterialUnits, type CustomUnit } from "@/lib/queries";
import { useOnlineStatus } from "@/lib/offline";

// ─────────────────────────────────────────────────────────────────────────────
// Préchargement automatique des données consultées "à la demande" (recette
// d'un produit, unités d'une matière, historique complet) — jusqu'ici, ces
// données n'étaient mises en cache hors ligne QUE si l'utilisateur avait
// explicitement ouvert la page/l'onglet correspondant pendant qu'il était en
// ligne. Ces hooks, appelés une fois dans le layout authentifié, chargent tout
// ça automatiquement dès que l'app a du réseau, pour que tout soit disponible
// hors ligne sans action manuelle.
// ─────────────────────────────────────────────────────────────────────────────

// Recettes de TOUS les produits en une seule requête (au lieu d'une requête
// par produit à chaque ouverture de sa fiche recette).
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
        .in(
          "product_id",
          products.map((p) => p.id)
        );
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

// Répartit la liste globale des unités personnalisées (déjà chargée par
// ailleurs) dans le cache PAR MATIÈRE — aucune requête réseau en plus, juste
// une distribution en mémoire, pour que la fiche de chaque matière soit
// pré-remplie sans avoir eu besoin de l'ouvrir au préalable.
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

// Historique complet (journal des ventes, historique, finances) — les tailles
// utilisées par chaque page, chargées dès que l'app est en ligne plutôt qu'à
// la visite de chaque page.
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

// À appeler une seule fois dans le layout authentifié.
export function usePrefetchOfflineEssentials() {
  usePrefetchAllRecipes();
  usePrefetchUnitsPerMaterial();
  usePrefetchLedger();
}