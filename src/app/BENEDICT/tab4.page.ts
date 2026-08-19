import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { BenedictCashbackService, ExpiringItem } from './benedict-cashback.service';

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false
})
export class Tab4Page implements OnInit {
  activeSegment: 'vouchers' | 'rewards' = 'vouchers';

  lifetimeEarnings = 0;
  loading = true;

  // Top mini sections
  expiringSummary = {
    todayCountText: 'Today',
    yesterdayCountText: 'Yesterday',
  };

  todayItems: ExpiringItem[] = [];
  yesterdayItems: ExpiringItem[] = [];

  constructor(
    private authService: AuthService,
    private cashbackService: BenedictCashbackService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadCashbackData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadCashbackData();
  }

  get formattedLifetime(): string {
    return `$${this.lifetimeEarnings.toFixed(2)}`;
  }

  segmentChanged(ev: any) {
    this.activeSegment = ev.detail.value;
  }

  // If you want the red “danger” triangle only on one item
  isDangerItem(item: ExpiringItem): boolean {
    return item.id === 'mlimited';
  }

  isRedeemable(item: ExpiringItem): boolean {
    return item.badgeText === 'Yet to redeem';
  }

  async redeemItem(period: 'today' | 'yesterday', item: ExpiringItem): Promise<void> {
    if (!this.isRedeemable(item)) {
      return;
    }

    await this.cashbackService.redeemItem(period, item.id);
    await this.loadCashbackData();
  }

  private async loadCashbackData(): Promise<void> {
    await this.authService.authReady;

    this.loading = true;
    const data = await this.cashbackService.getCashbackData();

    this.lifetimeEarnings = data.lifetimeEarnings;
    this.todayItems = data.todayItems;
    this.yesterdayItems = data.yesterdayItems;
    this.loading = false;
  }
}
