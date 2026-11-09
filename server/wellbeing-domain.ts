export interface WellbeingCheckin {
  userId?: string;
  companyId?: string | null;
  shareWithCompany?: boolean;
  energyLevel?: number;
  clarityLevel?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export function isValidWellbeingCheckin(energyLevel: unknown, clarityLevel: unknown): boolean {
  const energy = Number(energyLevel);
  const clarity = Number(clarityLevel);
  return Number.isInteger(energy) && energy >= 1 && energy <= 5
    && Number.isInteger(clarity) && clarity >= 1 && clarity <= 5;
}

export function aggregateCompanyWellbeing(
  checkins: readonly WellbeingCheckin[],
  minimumCohortSize = 5
) {
  const latestByUser = new Map<string, WellbeingCheckin>();
  for (const item of checkins) {
    if (item.shareWithCompany !== true || !item.userId || !item.companyId) continue;
    const previous = latestByUser.get(item.userId);
    const currentTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
    const previousTime = previous ? new Date(previous.updatedAt || previous.createdAt || 0).getTime() : -1;
    if (!previous || currentTime > previousTime) latestByUser.set(item.userId, item);
  }
  const rows = [...latestByUser.values()];
  if (rows.length < minimumCohortSize) {
    return { suppressed: true as const, sampleSize: 0, minimumCohortSize };
  }
  const average = (field: "energyLevel" | "clarityLevel") =>
    Math.round(rows.reduce((sum, row) => sum + Number(row[field] || 0), 0) / rows.length * 100) / 100;
  const averageEnergy = average("energyLevel");
  const averageClarity = average("clarityLevel");
  const highRiskCount = rows.filter(row => Number(row.energyLevel) <= 2 || Number(row.clarityLevel) <= 2).length;
  return {
    suppressed: false as const,
    sampleSize: rows.length,
    minimumCohortSize,
    averageEnergy,
    averageClarity,
    averageEngagement: Math.round(((averageEnergy + averageClarity) / 2) * 100) / 100,
    highRiskCount
  };
}
