export interface CommissionTier {
  id: string;
  tier_name: string;
  min_students: number;
  max_students: number | null;
  commission_per_student: number;
}

export function matchTier(
  activeStudentCount: number,
  tiers: CommissionTier[]
): CommissionTier | null {
  const sorted = [...tiers].sort((a, b) => b.min_students - a.min_students);
  for (const tier of sorted) {
    if (
      activeStudentCount >= tier.min_students &&
      (tier.max_students === null || activeStudentCount <= tier.max_students)
    ) {
      return tier;
    }
  }
  return null;
}

export function calcCommission(
  activeStudentCount: number,
  tiers: CommissionTier[]
): { tier: CommissionTier | null; amount: number } {
  const tier = matchTier(activeStudentCount, tiers);
  if (!tier) return { tier: null, amount: 0 };
  return { tier, amount: activeStudentCount * tier.commission_per_student };
}
