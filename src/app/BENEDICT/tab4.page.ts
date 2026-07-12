import { Component } from '@angular/core';

type ExpiringItem = {
  id: string;
  title: string;
  amount?: number ;
  badgeText?: string;
  badgeColor?: 'danger' | 'warning' | 'primary' | 'success' | 'medium';
  icon: string; // use Ionicons names
  tone?: 'danger' | 'warning' | 'primary' | 'success' | 'medium';
};

@Component({
  selector: 'app-tab4',
  templateUrl: './tab4.page.html',
  styleUrls: ['./tab4.page.scss'],
  standalone: false
})
export class Tab4Page {
  activeSegment: 'vouchers' | 'rewards' = 'vouchers';

  lifetimeEarnings = 154.23;

  // Top mini sections
  expiringSummary = {
    todayCountText: 'Today',
    yesterdayCountText: 'Yesterday',
  };

  todayItems: ExpiringItem[] = [
    {
      id: 'toastbox',
      title: 'ToastBox',
      badgeText: 'Yet to redeem',
      badgeColor: 'primary',
      icon: 'ticket-outline',
      tone: 'primary',
    },
  ];

  yesterdayItems: ExpiringItem[] = [
    {
      id: 'ntuc',
      title: 'NTUC Fairprice',
      amount: 43.47,
      badgeText: 'Yet to redeem',
      badgeColor: 'medium',
      icon: 'cart-outline',
      tone: 'medium',
    },
    {
      id: 'kopitiam',
      title: 'Kopitiam',
      amount: 0,
      badgeText: 'Yet to redeem',
      badgeColor: 'warning',
      icon: 'restaurant-outline',
      tone: 'warning',
    },
    {
      id: 'simplygo',
      title: 'SimplyGo',
      amount: 25.21,
      badgeText: 'Confirmed',
      badgeColor: 'success',
      icon: 'card-outline',
      tone: 'success',
    },
    {
      id: 'mlimited',
      title: 'ML Limited',
      badgeText: "Oops! We can’t verify this.",
      badgeColor: 'danger',
      icon: 'shield-checkmark-outline',
      tone: 'danger',
    },
  ];

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
}
