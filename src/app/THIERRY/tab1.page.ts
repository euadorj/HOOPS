import {
  Component,
  OnInit,
} from '@angular/core';

import { Router } from '@angular/router';

import {
  AlertController,
  ModalController,
} from '@ionic/angular';

import {
  AuthService,
  CurrentUser,
} from '../auth/auth.service';

import {
  MerchantPayment,
  SavingsGoal,
  SavingsService,
} from './savings.service';

import {
  CoinService
} from '../game/coin.service';

import {
  RewardsService
} from '../game/rewards.service';

import {
  DashboardBill,
  DashboardInvestment,
  DashboardItemId,
  DashboardService,
} from './dashboard.service';

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
  netWorth = 0;
  balance = 0;

  savingGoals: SavingsGoal[] = [];

  selectedDashboardItems:
    DashboardItemId[] = [];

  investments: DashboardInvestment[] = [];

  investmentTotalValue = 0;
  investmentProfitLoss = 0;

  spendingThisMonth = 0;
  monthlyTransactionCount = 0;
  topSpendingMerchant = 'No spending yet';

  monthlyBudget = 0;
  budgetRemaining = 0;
  budgetProgress = 0;

  rewardCoins = 0;
  cashbackBalance = 0;
  activeVoucherCount = 0;

  upcomingBills: DashboardBill[] = [];

  recentTransactions: MerchantPayment[] = [];

  financialTips: string[] = [];

  actions = [
    {
      icon: 'card-outline',
      title: 'Pay',
      route: '/tabs/pay',
    },
    {
      icon: 'swap-horizontal-outline',
      title: 'Transfer',
      route: '/tabs/transfer',
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
      route: '/tabs/discounts',
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
    route: '/tabs/tab1',
  },
  {
    icon: 'cash-outline',
    title: 'Cashback',
    route: '/tabs/tab1',
  },
  ];

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private authService: AuthService,
    private savingsService: SavingsService,
    private dashboardService: DashboardService,
    private coinService: CoinService,
    private rewardsService: RewardsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPageData();
  }

  ionViewWillEnter(): void {
    this.loadPageData();
  }

  loadCurrentUser(): void {
    this.currentUser =
      this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.userName = 'Guest';
      this.userInitial = 'G';
      return;
    }

    this.userName =
      this.currentUser.username;

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

  loadDashboardSettings(): void {
    this.selectedDashboardItems =
      this.dashboardService.getSelectedItems();
  }

  loadDashboardInformation(): void {
    this.investments =
      this.dashboardService.getInvestments();

    this.investmentTotalValue =
      this.investments.reduce(
        (
          total,
          investment
        ) => total + investment.currentValue,
        0
      );

    const totalInvested =
      this.investments.reduce(
        (
          total,
          investment
        ) => total + investment.investedAmount,
        0
      );

    this.investmentProfitLoss =
      this.investmentTotalValue -
      totalInvested;

    this.monthlyBudget =
      this.dashboardService.getMonthlyBudget();

    this.upcomingBills =
      this.dashboardService
        .getUpcomingBills()
        .filter((bill) => !bill.paid)
        .sort(
          (firstBill, secondBill) =>
            new Date(
              firstBill.dueDate
            ).getTime() -
            new Date(
              secondBill.dueDate
            ).getTime()
        )
        .slice(0, 3);

    this.financialTips =
      this.dashboardService.getFinancialTips();

    this.coinService.refreshCoins();

    this.rewardCoins =
      this.coinService.getCoins();

    this.cashbackBalance =
      this.dashboardService
        .getCashbackBalance();

    this.activeVoucherCount =
      this.rewardsService
        .getActiveVouchers()
        .length;

    const paymentHistory =
      this.savingsService.getPaymentHistory();

    this.recentTransactions =
      paymentHistory.slice(0, 5);

    const monthlyPayments =
      paymentHistory.filter(
        (payment) =>
          this.isCurrentMonth(
            payment.paidAt
          )
      );

    this.monthlyTransactionCount =
      monthlyPayments.length;

    this.spendingThisMonth =
      monthlyPayments.reduce(
        (
          total,
          payment
        ) => total + payment.amount,
        0
      );

    this.topSpendingMerchant =
      this.calculateTopMerchant(
        monthlyPayments
      );

    this.budgetRemaining = Math.max(
      this.monthlyBudget -
        this.spendingThisMonth,
      0
    );

    if (this.monthlyBudget <= 0) {
      this.budgetProgress = 0;
    } else {
      this.budgetProgress = Math.min(
        this.spendingThisMonth /
          this.monthlyBudget,
        1
      );
    }

    this.netWorth =
      this.balance +
      this.totalSaved +
      this.investmentTotalValue;
  }

  getGoalProgress(
    goal: SavingsGoal
  ): number {
    if (goal.targetAmount <= 0) {
      return 0;
    }

    return Math.min(
      goal.savedAmount /
        goal.targetAmount,
      1
    );
  }

  getGoalPercent(
    goal: SavingsGoal
  ): number {
    return Math.round(
      this.getGoalProgress(goal) * 100
    );
  }

  getInvestmentProfit(
    investment: DashboardInvestment
  ): number {
    return (
      investment.currentValue -
      investment.investedAmount
    );
  }

  isDashboardItemSelected(
    itemId: DashboardItemId
  ): boolean {
    return this.selectedDashboardItems.includes(
      itemId
    );
  }

  async changeMonthlyBudget():
    Promise<void> {
    const alert =
      await this.alertController.create({
        header: 'Set Monthly Budget',
        message:
          'Enter your new monthly spending budget.',
        inputs: [
          {
            name: 'budget',
            type: 'number',
            min: 1,
            value: this.monthlyBudget,
            placeholder: 'Monthly budget',
          },
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Save',
            handler: (data) => {
              const amount =
                Number(data.budget);

              const saved =
                this.dashboardService
                  .setMonthlyBudget(amount);

              if (!saved) {
                return false;
              }

              this.loadDashboardInformation();

              return true;
            },
          },
        ],
      });

    await alert.present();
  }

  markBillPaid(billId: string): void {
    const updated =
      this.dashboardService
        .markBillPaid(billId);

    if (updated) {
      this.loadDashboardInformation();
    }
  }

  openQuickTab(tab: QuickTab): void {
    if (!tab.route) {
      return;
    }

    this.router.navigateByUrl(tab.route);
  }

  logout(): void {
    this.authService.logout();

    this.router.navigate([
      '/sign-in'
    ]);
  }

  async openDashboardSelector():
    Promise<void> {
    const modal =
      await this.modalController.create({
        component:
          DashboardSelectorModalComponent,
        cssClass:
          'dashboard-selector-modal',
      });

    await modal.present();

    const { data } =
      await modal.onDidDismiss();

    if (data?.saved) {
      this.loadDashboardSettings();
      this.loadDashboardInformation();
    }
  }

  trackByInvestmentId(
    index: number,
    investment: DashboardInvestment
  ): string {
    return investment.id;
  }

  trackByBillId(
    index: number,
    bill: DashboardBill
  ): string {
    return bill.id;
  }

  trackByPaymentId(
    index: number,
    payment: MerchantPayment
  ): string {
    return payment.id;
  }

  private loadPageData(): void {
    this.loadCurrentUser();
    this.loadFinanceData();
    this.loadDashboardSettings();
    this.loadDashboardInformation();
  }

  private isCurrentMonth(
    timestamp: number
  ): boolean {
    const transactionDate =
      new Date(timestamp);

    const today = new Date();

    return (
      transactionDate.getMonth() ===
        today.getMonth() &&
      transactionDate.getFullYear() ===
        today.getFullYear()
    );
  }

  private calculateTopMerchant(
    payments: MerchantPayment[]
  ): string {
    if (payments.length === 0) {
      return 'No spending yet';
    }

    const totals:
      Record<string, number> = {};

    payments.forEach((payment) => {
      totals[payment.merchantName] =
        (totals[payment.merchantName] ?? 0) +
        payment.amount;
    });

    const topMerchant =
      Object.entries(totals).sort(
        (
          firstMerchant,
          secondMerchant
        ) =>
          secondMerchant[1] -
          firstMerchant[1]
      )[0];

    return topMerchant?.[0] ??
      'No spending yet';
  }
}