export type CustomUnit = { id: string; name: string; factor: number };

const numberFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

// Convertit une quantité saisie dans une unité (classique si unitId est null/undefined,
// sinon une unité personnalisée) vers l'unité classique de référence — la seule utilisée
// pour tous les calculs de stock côté base.
export function toClassicQuantity(
  quantity: number,
  unitId: string | null | undefined,
  customUnits: CustomUnit[]
): number {
  if (!unitId) return quantity;
  const u = customUnits.find((c) => c.id === unitId);
  if (!u || u.factor <= 0) return quantity;
  return quantity * u.factor;
}

// Formate un stock (toujours stocké en unité classique) selon l'unité principale
// d'affichage choisie pour la matière : unité classique brute, ou décomposition
// "N × unité perso (+ reste en unité classique)".
export function formatStockDisplay(
  stockClassic: number,
  classicUnitLabel: string,
  displayUnit: CustomUnit | null
): string {
  if (!displayUnit || displayUnit.factor <= 0) {
    return `${numberFmt.format(stockClassic)} ${classicUnitLabel}`;
  }
  const count = Math.floor(stockClassic / displayUnit.factor + 1e-9);
  const remainder = stockClassic - count * displayUnit.factor;
  const parts: string[] = [];
  if (count > 0 || remainder <= 1e-6) {
    parts.push(`${count} × ${displayUnit.name}`);
  }
  if (remainder > 1e-6) {
    parts.push(`${numberFmt.format(remainder)} ${classicUnitLabel}`);
  }
  return parts.join(" + ");
}