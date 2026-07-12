import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-benedict-rewards',
  templateUrl: './benedict-rewards.page.html',
  styleUrls: ['./benedict-rewards.page.scss'],
  standalone: false
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

  // bottom tiles / promo
  promoCount = 152;
  promoMult = 18;
  constructor() { }

  ngOnInit() {
  }

}
