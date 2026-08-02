export type BenedictTierKey = 'Blue' | 'Silver' | 'Gold' | 'Platinum';

export interface BenedictTier {
  key: BenedictTierKey;
  label: string;
  memberLabel: string;
  profileClass: string;
  cardClass: string;
  minPoints: number;
  maxPoints: number;
  multiplier: number;
  rewards: string[];
}

export const BENEDICT_TIERS: BenedictTier[] = [
  {
    key: 'Blue',
    label: 'Blue',
    memberLabel: 'Blue Member',
    profileClass: 'tier-blue',
    cardClass: 'blue',
    minPoints: 0,
    maxPoints: 49,
    multiplier: 1,
    rewards: ['Birthday Coupon'],
  },
  {
    key: 'Silver',
    label: 'Silver',
    memberLabel: 'Silver Member',
    profileClass: 'tier-silver',
    cardClass: 'silver',
    minPoints: 50,
    maxPoints: 99,
    multiplier: 1.2,
    rewards: ['Upgrade Reward'],
  },
  {
    key: 'Gold',
    label: 'Gold',
    memberLabel: 'Gold Member',
    profileClass: 'tier-gold',
    cardClass: 'gold',
    minPoints: 100,
    maxPoints: 119,
    multiplier: 1.5,
    rewards: ['Free Coffee Beans Upgrade'],
  },
  {
    key: 'Platinum',
    label: 'Platinum',
    memberLabel: 'Platinum Member',
    profileClass: 'tier-platinum',
    cardClass: 'platinum',
    minPoints: 120,
    maxPoints: 150,
    multiplier: 3,
    rewards: ['Free Coffee Beans Upgrade'],
  },
];

export const BENEDICT_MAX_POINTS =
  BENEDICT_TIERS[BENEDICT_TIERS.length - 1].maxPoints;

export function isBenedictTierKey(value: string): value is BenedictTierKey {
  return BENEDICT_TIERS.some((tier) => tier.key === value);
}

export function resolveBenedictTierFromPoints(points: number): BenedictTier {
  const clampedPoints = Math.max(0, Math.min(points, BENEDICT_MAX_POINTS));

  // Use min-threshold ranges [current.minPoints, next.minPoints) so decimals
  // near a boundary (e.g. 119.06) do not jump to the next tier early.
  for (let i = 0; i < BENEDICT_TIERS.length; i += 1) {
    const tier = BENEDICT_TIERS[i];
    const nextTier = BENEDICT_TIERS[i + 1];

    if (!nextTier && clampedPoints >= tier.minPoints) {
      return tier;
    }

    if (
      nextTier &&
      clampedPoints >= tier.minPoints &&
      clampedPoints < nextTier.minPoints
    ) {
      return tier;
    }
  }

  return BENEDICT_TIERS[0];
}
