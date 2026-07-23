import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-benedict-rewards',
  templateUrl: './benedict-rewards.page.html',
  styleUrls: ['./benedict-rewards.page.scss'],
  standalone: false,
})
export class BENEDICTREWARDSPage implements OnInit {
  name = 'John Smith';
  tier = 'Silver Member';

  totalSavings = 110.54;
  points = 84.06;
  pointsGold = 5.94;

  // fake tier progress (adjust as needed)
  tiers = ['Blue', 'Silver', 'Gold', 'Platinum'];
  tierPercent = 58;
  tierColorClass = 'tier-silver';

  private maxPoints = 150;
  private blueMaxPoints = 49;
  private silverMaxPoints = 99;
  private platinumCutoffPoints = 120;

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
    if (this.points < 0) this.points = 0;
    this.syncTierFromPoints();
  }

  private syncTierFromPoints() {
    // Convert points -> percent for the progress bar + tier boundaries
    this.tierPercent = Math.max(
      0,
      Math.min(100, (this.points / this.maxPoints) * 100),
    );

    const step = 100 / this.tiers.length;

    let idx: number;
    if (this.tierPercent < step)
      idx = 0; // Blue
    else if (this.tierPercent < step * 2)
      idx = 1; // Silver
    else if (this.tierPercent < step * 3)
      idx = 2; // Gold
    else idx = 3; // Platinum

    if (this.points <= this.blueMaxPoints) {
      this.tier = 'Blue Member';
      this.tierColorClass = 'tier-blue';
      return;
    }

    if (this.points <= this.silverMaxPoints) {
      this.tier = 'Silver Member';
      this.tierColorClass = 'tier-silver';
      return;
    }

    if (this.points < this.platinumCutoffPoints) {
      this.tier = 'Gold Member';
      this.tierColorClass = 'tier-gold';
      return;
    }

    this.tier = 'Platinum Member';
    this.tierColorClass = 'tier-platinum';
  }

  openTiers(){
    this.router.navigate(['/membership-tiers']),
    this.tier;
  }
}
