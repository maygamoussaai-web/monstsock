export const CURRENCY = "XOF";

const numberFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const moneyFmt = new Intl.NumberFormat("fr-FR", {
  style: "decimal",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || isNaN(n as number)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(n as number);
}

export function formatMoney(n: number | null | undefined) {
  if (n === null || n === undefined || isNaN(n as number)) return "— FCFA";
  return `${moneyFmt.format(Math.round(n as number))} FCFA`;
}

export function formatQty(n: number | null | undefined, unit?: string) {
  return `${numberFmt.format(n ?? 0)}${unit ? " " + unit : ""}`;
}

export function formatDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const MATERIAL_UNITS = ["kg", "g", "L", "mL", "unite"] as const;
export const PRODUCT_UNITS = ["unite", "piece", "kg", "g"] as const;
export const UNIT_LABEL: Record<string, string> = {
  kg: "kg", g: "g", L: "L", mL: "mL", unite: "unité", piece: "pièce",
};
