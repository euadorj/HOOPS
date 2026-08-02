import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BENEDICT_TIERS,
  BenedictTier,
  BenedictTierKey,
  isBenedictTierKey,
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

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const tierFromQuery = this.route.snapshot.queryParamMap.get('tier');

    if (!tierFromQuery || !isBenedictTierKey(tierFromQuery)) {
      this.currentTier = undefined;
      return;
    }

    this.currentTier = this.findTierByKey(tierFromQuery);
  }

  isCurrentTier(tier: BenedictTier): boolean {
    return tier.key === this.currentTier?.key;
  }

  private findTierByKey(key: BenedictTierKey): BenedictTier {
    return this.tiers.find((tier) => tier.key === key) ?? this.tiers[0];
  }
}
