export interface CommissionTier {
  id: string;
  tier_name: string;
  min_students: number;
  max_students: number | null;
  commission_per_student: number;
}

export interface UniversityCommission {
  university_id: string;
  commission_per_student: number;
  tier_id?: string | null;
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

/**
 * Calculate commission per enrollment using university-specific rates when available,
 * falling back to global tier system.
 */
export function calcCommissionByEnrollments(
  enrollments: { university_id: string }[],
  uniCommissions: UniversityCommission[],
  tiers: CommissionTier[]
): number {
  const uniMap = new Map(uniCommissions.map(uc => [uc.university_id, uc]));
  const tierMap = new Map(tiers.map(t => [t.id, t]));
  let total = 0;
  
  // Count enrollments without a university-specific rate for tier fallback
  let tierCount = 0;
  
  for (const e of enrollments) {
    const uc = uniMap.get(e.university_id);
    if (uc) {
      // Dynamic lookup: if linked to a tier, use the tier's live rate
      if (uc.tier_id) {
        const linkedTier = tierMap.get(uc.tier_id);
        total += linkedTier ? Number(linkedTier.commission_per_student) : Number(uc.commission_per_student);
      } else {
        total += Number(uc.commission_per_student);
      }
    } else {
      tierCount++;
    }
  }
  
  // Apply global tier for remaining enrollments
  if (tierCount > 0) {
    const { amount } = calcCommission(tierCount, tiers);
    total += amount;
  }
  
  return total;
}
