export const PLAN_IDS = {
  FREE: 'free',
  ESSENCIAL: 'essencial',
  MINISTERIO: 'ministerio',
  IGREJA: 'igreja',
} as const;

export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];

export interface PlanLimits {
  maxMembers: number;
  maxCultosPerMonth: number | null;
  unlimited: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:       { maxMembers: 8,   maxCultosPerMonth: 4,    unlimited: false },
  essencial:  { maxMembers: 20,  maxCultosPerMonth: null,  unlimited: false },
  ministerio: { maxMembers: 50,  maxCultosPerMonth: null,  unlimited: false },
  igreja:     { maxMembers: -1,  maxCultosPerMonth: null,  unlimited: true  },
};

export function canAddMember(planId: PlanId, currentCount: number): boolean {
  const limits = PLAN_LIMITS[planId];
  if (limits.unlimited) return true;
  return currentCount < limits.maxMembers;
}

export function canCreateCulto(planId: PlanId, cultosThisMonth: number): boolean {
  const limits = PLAN_LIMITS[planId];
  if (limits.maxCultosPerMonth === null) return true;
  return cultosThisMonth < limits.maxCultosPerMonth;
}
