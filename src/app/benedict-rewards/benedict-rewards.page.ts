import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  BENEDICT_MAX_POINTS,
  BENEDICT_TIERS,
  BenedictTier,
  resolveBenedictTierFromPoints,
} from '../benedict-tier.config';

@Component({
  selector: 'app-benedict-rewards',
  templateUrl: './benedict-rewards.page.html',
  styleUrls: ['./benedict-rewards.page.scss'],
  standalone: false,
})
export class BENEDICTREWARDSPage implements OnInit {
  name = 'John Smith';

  totalSavings = 110.54;
  points = 84.06;
  pointsGold = 5.94;

  tiers = BENEDICT_TIERS;
  tierPercent = 0;
  activeTier: BenedictTier = BENEDICT_TIERS[0];
  isCardShaking = false;

  // bottom tiles / promo
  promoCount = 152;
  promoMult = 18;
  constructor(private router: Router) {}

  ngOnInit() {
    this.syncTierFromPoints();
  }

  increasePoints() {
    this.points += 5;
    this.syncTierFromPoints();
  }

  decreasePoints() {
    this.points -= 5;
    this.syncTierFromPoints();
  }

  get tier(): string {
    return this.activeTier.memberLabel;
  }

  get tierColorClass(): string {
    return this.activeTier.profileClass;
  }

  get nextTierLabel(): string {
    const activeIndex = this.tiers.findIndex(
      (tier) => tier.key === this.activeTier.key,
    );

    if (activeIndex < 0 || activeIndex === this.tiers.length - 1) {
      return this.activeTier.label;
    }

    return this.tiers[activeIndex + 1].label;
  }

  private syncTierFromPoints() {
    const clampedPoints = Math.max(0, Math.min(this.points, BENEDICT_MAX_POINTS));

    this.points = clampedPoints;
    this.tierPercent = (clampedPoints / BENEDICT_MAX_POINTS) * 100;
    this.activeTier = resolveBenedictTierFromPoints(clampedPoints);
  }

  openTiers() {
    if (this.isCardShaking) {
      return;
    }

    this.isCardShaking = true;

    setTimeout(() => {
      this.router.navigate(['/membership-tiers'], {
        queryParams: { tier: this.activeTier.key },
      });
      this.isCardShaking = false;
    }, 220);
  }
}
