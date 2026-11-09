import { useMemo } from "react";
import { useAuth } from "./useAuth";

export type EnergyTier = "Bronce" | "Plata" | "Oro" | "Platino";

export function resolveEnergyTier(points: number): EnergyTier {
  if (points >= 1000) return "Platino";
  if (points >= 500) return "Oro";
  if (points >= 100) return "Plata";
  return "Bronce";
}

export function useEnergyTier() {
  const { user, loading } = useAuth();
  const points = Math.max(0, Number(user?.energyPoints ?? user?.points ?? 0));
  const tier = useMemo(() => resolveEnergyTier(points), [points]);
  return { points, tier, loading };
}
