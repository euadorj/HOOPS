import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type TierKey = 'Blue' | 'Silver' | 'Gold';

@Component({
  selector: 'app-membership-tiers',
  templateUrl: './membership-tiers.page.html',
  styleUrls: ['./membership-tiers.page.scss'],
  standalone: false
})
export class MembershipTiersPage implements OnInit {
  currentTier?: TierKey;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('tier') as TierKey | null;
    this.currentTier = t ?? undefined;
  }
}
