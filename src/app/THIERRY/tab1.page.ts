import { Component } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page {
  userName = 'Thierry';
  userInitial = 'T';

  totalSaved = 1500;
  netWorth = 1000000;
  balance = 900000;

  savingGoals = [
    { name: 'Emergency Fund', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'success' },
    { name: 'Vacation', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'warning' },
    { name: 'New Laptop', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'tertiary' },
  ];

  actions = [
    { icon: 'card-outline', title: 'Pay', route: '/tabs/tab1' },
    { icon: 'swap-horizontal-outline', title: 'Transfer', route: '/tabs/tab1' },
    { icon: 'game-controller-outline', title: 'Games', route: '/game' },
    { icon: 'receipt-outline', title: 'Bill Split', route: '/tabs/tab2' },
    { icon: 'wallet-outline', title: 'Shared Wallets', route: '/tabs/shared-wallets' },
    { icon: 'pricetag-outline', title: 'Discounts', route: '/tabs/tab1' },
  ];

  constructor() {}
}
