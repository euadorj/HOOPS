import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';

import {
  AuthService,
  CurrentUser,
} from '../auth/auth.service';

import {
  SavingsGoal,
  SavingsService,
} from './savings.service';

import {
  DashboardSelectorModalComponent
} from './dashboard-selector-modal.component';

interface QuickTab {
  icon: string;
  title: string;
  route: string | null;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  userName = 'Guest';
  userInitial = 'G';
  currentUser: CurrentUser | null = null;

  totalSaved = 0;
  netWorth = 1000000;
  balance = 0;

  savingGoals: SavingsGoal[] = [];

  actions = [
    {
      icon: 'card-outline',
      title: 'Pay',
      route: '/tabs/tab1',
    },
    {
      icon: 'swap-horizontal-outline',
      title: 'Transfer',
      route: '/tabs/tab1',
    },
    {
      icon: 'game-controller-outline',
      title: 'Games',
      route: '/game',
    },
    {
      icon: 'receipt-outline',
      title: 'Bill Split',
      route: '/tabs/tab2',
    },
    {
      icon: 'wallet-outline',
      title: 'Shared Wallets',
      route: '/tabs/shared-wallets',
    },
    {
      icon: 'pricetag-outline',
      title: 'Discounts',
      route: '/tabs/tab1',
    },
  ];

  quickTabs: QuickTab[] = [
    {
      icon: 'save-outline',
      title: 'Savings',
      route: '/tabs/savings',
    },
    {
      icon: 'storefront-outline',
      title: 'Merchant Deals',
      route: null,
    },
    {
      icon: 'cash-outline',
      title: 'Cashback',
      route: null,
    },
  ];

  selectedDashboardItems: string[] = [];

  constructor(
    private modalController: ModalController,
    private authService: AuthService,
    private savingsService: SavingsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadDashboardSettings();
    this.loadFinanceData();
  }

  ionViewWillEnter(): void {
    this.loadCurrentUser();
    this.loadFinanceData();
  }

  loadCurrentUser(): void {
    this.currentUser =
      this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.userName = 'Guest';
      this.userInitial = 'G';
      return;
    }

    this.userName = this.currentUser.username;

    this.userInitial =
      this.currentUser.username
        .charAt(0)
        .toUpperCase();
  }

  loadFinanceData(): void {
    const financeData =
      this.savingsService.getFinanceData();

    this.balance = financeData.balance;
    this.savingGoals = financeData.goals;

    this.totalSaved =
      this.savingsService.getTotalSaved(
        financeData
      );
  }

  getGoalProgress(goal: SavingsGoal): number {
    if (goal.targetAmount <= 0) {
      return 0;
    }

    return Math.min(
      goal.savedAmount / goal.targetAmount,
      1
    );
  }

  getGoalPercent(goal: SavingsGoal): number {
    return Math.round(
      this.getGoalProgress(goal) * 100
    );
  }

  loadDashboardSettings(): void {
    try {
      const saved =
        localStorage.getItem('dashboardItems');

      if (saved) {
        const parsedValue: unknown =
          JSON.parse(saved);

        if (Array.isArray(parsedValue)) {
          this.selectedDashboardItems =
            parsedValue.filter(
              (item): item is string =>
                typeof item === 'string'
            );

          return;
        }
      }
    } catch (error) {
      console.error(
        'Unable to load dashboard items:',
        error
      );
    }

    this.selectedDashboardItems = [
      'savings-goals',
      'investment-tracking',
    ];
  }

  isDashboardItemSelected(
    itemId: string
  ): boolean {
    return this.selectedDashboardItems.includes(
      itemId
    );
  }

  openQuickTab(tab: QuickTab): void {
    if (!tab.route) {
      return;
    }

    this.router.navigateByUrl(tab.route);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/sign-in']);
  }

  async openDashboardSelector(): Promise<void> {
    const modal =
      await this.modalController.create({
        component:
          DashboardSelectorModalComponent,
        cssClass: 'dashboard-selector-modal',
      });

    await modal.present();

    const { data } = await modal.onDidDismiss();

    if (data?.saved && Array.isArray(data.data)) {
      localStorage.setItem(
        'dashboardItems',
        JSON.stringify(data.data)
      );

      this.loadDashboardSettings();
    }
  }
}