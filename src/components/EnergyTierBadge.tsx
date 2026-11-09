import { useEnergyTier } from "../hooks/useEnergyTier";

const tierStyles = {
  Bronce: "border-amber-200 bg-amber-50 text-amber-800",
  Plata: "border-slate-300 bg-slate-100 text-slate-700",
  Oro: "border-yellow-300 bg-yellow-50 text-yellow-800",
  Platino: "border-violet-200 bg-violet-50 text-violet-800",
};

export function EnergyTierBadge() {
  const { tier, points, loading } = useEnergyTier();
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${tierStyles[tier]}`} aria-label={`Nivel de energía ${tier}`}>
      <span>{loading ? "…" : tier}</span>
      <span className="opacity-70">{loading ? "" : points.toLocaleString() + " pts"}</span>
    </span>
  );
}
