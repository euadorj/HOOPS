import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';

import {
  Router,
} from '@angular/router';

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
  CoinService,
} from '../game/coin.service';

import {
  RewardsService,
} from '../game/rewards.service';

import {
  DashboardBill,
  DashboardInvestment,
  DashboardItemId,
  DashboardService,
} from './dashboard.service';

import {
  DashboardSelectorModalComponent,
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
export class Tab1Page
  implements OnInit, OnDestroy {

  userName = 'Guest';

  userInitial = 'G';


  currentUser:
    CurrentUser | null = null;


  totalSaved = 0;

  netWorth = 0;

  balance = 0;


  savingGoals:
    SavingsGoal[] = [];


  selectedDashboardItems:
    DashboardItemId[] = [];


  investments:
    DashboardInvestment[] = [];


  investmentTotalValue = 0;

  investmentProfitLoss = 0;


  spendingThisMonth = 0;

  monthlyTransactionCount = 0;

  topSpendingMerchant =
    'No spending yet';


  monthlyBudget = 0;

  budgetRemaining = 0;

  budgetProgress = 0;


  rewardCoins = 0;

  cashbackBalance = 0;

  activeVoucherCount = 0;


  upcomingBills:
    DashboardBill[] = [];


  recentTransactions:
    MerchantPayment[] = [];


  financialTips:
    string[] = [];


  /*
   * =====================================
   * EVENTS
   * =====================================
   */

  private portfolioUpdatedHandler =
    (): void => {

      void this.loadPageData();
    };


  private rewardsUpdatedHandler =
    (): void => {

      void this.loadPageData();
    };


  /*
   * =====================================
   * ACTIONS
   * =====================================
   */

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


  quickTabs:
    QuickTab[] = [

    {
      icon: 'save-outline',
      title: 'Savings',
      route: '/tabs/savings',
    },

    {
      icon: 'storefront-outline',
      title: 'Merchant Deals',
      route: '/tabs/tab3',
    },

    {
      icon: 'cash-outline',
      title: 'Cashback',
      route: '/tabs/tab1',
    },

    {
      icon: 'trending-up-outline',
      title: 'Investing',
      route: '/investing',
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


  /*
   * =====================================
   * INIT
   * =====================================
   */

  ngOnInit(): void {

    void this.loadPageData();


    window.addEventListener(
      'portfolio-updated',
      this.portfolioUpdatedHandler
    );


    window.addEventListener(
      'rewards-updated',
      this.rewardsUpdatedHandler
    );
  }


  async ionViewWillEnter():
    Promise<void> {

    await this.loadPageData();
  }


  ngOnDestroy(): void {

    window.removeEventListener(
      'portfolio-updated',
      this.portfolioUpdatedHandler
    );


    window.removeEventListener(
      'rewards-updated',
      this.rewardsUpdatedHandler
    );
  }


  /*
   * =====================================
   * USER
   * =====================================
   */

  loadCurrentUser(): void {

    this.currentUser =
      this.authService
        .getCurrentUser();


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


  /*
   * =====================================
   * FINANCE
   * =====================================
   */

  async loadFinanceData():
    Promise<void> {

    const financeData =
      await this.savingsService
        .getFinanceData();


    this.balance =
      financeData.balance;


    this.savingGoals =
      financeData.goals;


    this.totalSaved =
      this.savingsService
        .getTotalSaved(
          financeData
        );
  }


  /*
   * =====================================
   * DASHBOARD SELECTION
   * =====================================
   */

  async loadDashboardSettings():
    Promise<void> {

    this.selectedDashboardItems =
      await this.dashboardService
        .getSelectedItems();
  }


  /*
   * =====================================
   * DASHBOARD DATA
   * =====================================
   */

  async loadDashboardInformation():
    Promise<void> {

    /*
     * Investments
     */
    this.investments =
      await this.dashboardService
        .getInvestments();


    this.investmentTotalValue =
      this.investments.reduce(
        (
          total,
          investment
        ) =>
          total +
          investment.currentValue,
        0
      );


    const totalInvested =
      this.investments.reduce(
        (
          total,
          investment
        ) =>
          total +
          investment.investedAmount,
        0
      );


    this.investmentProfitLoss =
      this.investmentTotalValue -
      totalInvested;


    /*
     * Budget
     */
    this.monthlyBudget =
      await this.dashboardService
        .getMonthlyBudget();


    /*
     * Bills
     */
    this.upcomingBills =
      (
        await this.dashboardService
          .getUpcomingBills()
      )
        .filter(
          (bill) =>
            !bill.paid
        )
        .sort(
          (
            firstBill,
            secondBill
          ) =>
            new Date(
              firstBill.dueDate
            ).getTime()
            -
            new Date(
              secondBill.dueDate
            ).getTime()
        )
        .slice(
          0,
          3
        );


    /*
     * Tips
     */
    this.financialTips =
      this.dashboardService
        .getFinancialTips();


    /*
     * Coins
     *
     * await works whether your CoinService
     * returns number or Promise<number>.
     */
    this.rewardCoins =
      await this.coinService
        .getCoins();


    /*
     * Cashback
     */
    this.cashbackBalance =
      this.dashboardService
        .getCashbackBalance();


    /*
     * Vouchers
     */
    const activeVouchers =
      await this.rewardsService
        .getActiveVouchers();


    this.activeVoucherCount =
      activeVouchers.length;


    /*
     * Transactions
     */
    const paymentHistory =
      await this.savingsService
        .getPaymentHistory();


    this.recentTransactions =
      paymentHistory.slice(
        0,
        5
      );


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
        ) =>
          total +
          payment.amount,
        0
      );


    this.topSpendingMerchant =
      this.calculateTopMerchant(
        monthlyPayments
      );


    this.budgetRemaining =
      Math.max(
        this.monthlyBudget -
        this.spendingThisMonth,
        0
      );


    if (
      this.monthlyBudget <= 0
    ) {

      this.budgetProgress = 0;

    } else {

      this.budgetProgress =
        Math.min(
          this.spendingThisMonth /
          this.monthlyBudget,
          1
        );
    }


    /*
     * Net Worth
     *
     * loadFinanceData() is completed
     * before this function runs.
     */
    this.netWorth =
      this.balance +
      this.totalSaved +
      this.investmentTotalValue;
  }


  /*
   * =====================================
   * SAVINGS HELPERS
   * =====================================
   */

  getGoalProgress(
    goal: SavingsGoal
  ): number {

    if (
      goal.targetAmount <= 0
    ) {

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
      this.getGoalProgress(
        goal
      ) * 100
    );
  }


  /*
   * =====================================
   * INVESTMENT PROFIT
   * =====================================
   */

  getInvestmentProfit(
    investment:
      DashboardInvestment
  ): number {

    return (
      investment.currentValue -
      investment.investedAmount
    );
  }


  /*
   * =====================================
   * DASHBOARD ITEM CHECK
   * =====================================
   */

  isDashboardItemSelected(
    itemId: DashboardItemId
  ): boolean {

    return this
      .selectedDashboardItems
      .includes(
        itemId
      );
  }


  /*
   * =====================================
   * CHANGE BUDGET
   * =====================================
   */

  async changeMonthlyBudget():
    Promise<void> {

    const alert =
      await this.alertController
        .create({

          header:
            'Set Monthly Budget',

          message:
            'Enter your new monthly spending budget.',

          inputs: [

            {
              name: 'budget',
              type: 'number',
              min: 1,
              value:
                this.monthlyBudget,
              placeholder:
                'Monthly budget',
            },

          ],

          buttons: [

            {
              text: 'Cancel',
              role: 'cancel',
            },

            {
              text: 'Save',

              handler:
                async (data) => {

                  const amount =
                    Number(
                      data.budget
                    );


                  const saved =
                    await this.dashboardService
                      .setMonthlyBudget(
                        amount
                      );


                  if (!saved) {

                    return false;
                  }


                  await this
                    .loadDashboardInformation();


                  return true;
                },
            },

          ],
        });


    await alert.present();
  }


  /*
   * =====================================
   * MARK BILL PAID
   * =====================================
   */

  async markBillPaid(
    billId: string
  ): Promise<void> {

    const updated =
      await this.dashboardService
        .markBillPaid(
          billId
        );


    if (updated) {

      await this
        .loadDashboardInformation();
    }
  }


  /*
   * =====================================
   * QUICK TAB
   * =====================================
   */

  openQuickTab(
    tab: QuickTab
  ): void {

    if (!tab.route) {

      return;
    }


    void this.router
      .navigateByUrl(
        tab.route
      );
  }


  /*
   * =====================================
   * LOGOUT
   * =====================================
   */

  async logout():
    Promise<void> {

    await this.authService
      .logout();


    await this.router
      .navigate([
        '/sign-in',
      ]);
  }


  /*
   * =====================================
   * DASHBOARD SELECTOR
   * =====================================
   */

  async openDashboardSelector():
    Promise<void> {

    const modal =
      await this.modalController
        .create({

          component:
            DashboardSelectorModalComponent,

          cssClass:
            'dashboard-selector-modal',
        });


    await modal.present();


    const result =
      await modal
        .onDidDismiss();


    if (
      result.data?.saved
    ) {

      await this
        .loadDashboardSettings();


      await this
        .loadDashboardInformation();
    }
  }


  /*
   * =====================================
   * TRACK BY
   * =====================================
   */

  trackByInvestmentId(
    index: number,
    investment:
      DashboardInvestment
  ): string {

    return investment.id;
  }


  trackByBillId(
    index: number,
    bill:
      DashboardBill
  ): string {

    return bill.id;
  }


  trackByPaymentId(
    index: number,
    payment:
      MerchantPayment
  ): string {

    return payment.id;
  }


  /*
   * =====================================
   * LOAD EVERYTHING
   * =====================================
   */

  private async loadPageData():
    Promise<void> {

    /*
     * Wait for Firebase user first.
     */
    await this.authService
      .authReady;


    this.loadCurrentUser();


    if (!this.currentUser) {

      this.resetDashboard();

      return;
    }


    /*
     * IMPORTANT:
     *
     * Run these in order.
     *
     * Do NOT run them all at the same time.
     */
    await this.loadFinanceData();

    await this.loadDashboardSettings();

    await this.loadDashboardInformation();
  }


  /*
   * =====================================
   * RESET
   * =====================================
   */

  private resetDashboard(): void {

    this.balance = 0;

    this.totalSaved = 0;

    this.netWorth = 0;

    this.savingGoals = [];

    this.investments = [];

    this.investmentTotalValue = 0;

    this.investmentProfitLoss = 0;

    this.monthlyBudget = 0;

    this.budgetRemaining = 0;

    this.budgetProgress = 0;

    this.upcomingBills = [];

    this.recentTransactions = [];

    this.spendingThisMonth = 0;

    this.monthlyTransactionCount = 0;

    this.topSpendingMerchant =
      'No spending yet';

    this.rewardCoins = 0;

    this.cashbackBalance = 0;

    this.activeVoucherCount = 0;
  }


  /*
   * =====================================
   * CURRENT MONTH
   * =====================================
   */

  private isCurrentMonth(
    timestamp: number
  ): boolean {

    const transactionDate =
      new Date(
        timestamp
      );


    const today =
      new Date();


    return (
      transactionDate.getMonth() ===
        today.getMonth()
      &&
      transactionDate.getFullYear() ===
        today.getFullYear()
    );
  }


  /*
   * =====================================
   * TOP MERCHANT
   * =====================================
   */

  private calculateTopMerchant(
    payments:
      MerchantPayment[]
  ): string {

    if (
      payments.length === 0
    ) {

      return 'No spending yet';
    }


    const totals:
      Record<string, number> = {};


    payments.forEach(
      (payment) => {

        totals[
          payment.merchantName
        ] =
          (
            totals[
              payment.merchantName
            ] ?? 0
          )
          +
          payment.amount;
      }
    );


    const sorted =
      Object
        .entries(
          totals
        )
        .sort(
          (a, b) =>
            b[1] -
            a[1]
        );


    return (
      sorted[0]?.[0] ??
      'No spending yet'
    );
  }
}