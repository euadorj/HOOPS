import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { BenedictLoyaltyService } from '../benedict-rewards/benedict-loyalty.service';
import {
  BENEDICT_TIERS,
  BenedictTier,
  BenedictTierKey,
  isBenedictTierKey,
  resolveBenedictTierFromPoints,
} from '../benedict-tier.config';

@Component({
  selector: 'app-membership-tiers',
  templateUrl: './membership-tiers.page.html',
  styleUrls: ['./membership-tiers.page.scss'],
  standalone: false
})
export class MembershipTiersPage implements OnInit {
  tiers = BENEDICT_TIERS;
  currentTier?: BenedictTier;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private loyaltyService: BenedictLoyaltyService
  ) {}

  async ngOnInit() {
    const tierFromQuery = this.route.snapshot.queryParamMap.get('tier');

    if (tierFromQuery && isBenedictTierKey(tierFromQuery)) {
      this.currentTier = this.findTierByKey(tierFromQuery);
      return;
    }

    // No tier passed in (landed here directly) - fall back to the
    // logged-in user's actual tier instead of showing nothing.
    await this.authService.authReady;
    const data = await this.loyaltyService.getLoyaltyData();
    this.currentTier = resolveBenedictTierFromPoints(data.points);
  }

  isCurrentTier(tier: BenedictTier): boolean {
    return tier.key === this.currentTier?.key;
  }

  private findTierByKey(key: BenedictTierKey): BenedictTier {
    return this.tiers.find((tier) => tier.key === key) ?? this.tiers[0];
  }
}
