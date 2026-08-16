import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  runTransaction,
  setDoc
} from '@angular/fire/firestore';

import { AuthService } from '../auth/auth.service';
import { FINANCE_COLLECTION } from './savings.service';


export type DashboardItemId =
  | 'savings-goals'
  | 'investment-tracking'
  | 'spending-summary'
  | 'monthly-budget'
  | 'rewards-cashback'
  | 'upcoming-bills'
  | 'recent-transactions'
  | 'financial-tips';


export interface DashboardInvestment {
  id: string;
  name: string;
  symbol: string;

  // Total original cost of currently owned units
  investedAmount: number;

  // Current market value of currently owned units
  currentValue: number;

  // Whole units owned
  shares: number;

  // Average buying price per unit
  averageBuyPriceSgd: number;

  // Latest market price per unit
  lastPriceSgd: number;
}


export interface InvestmentTransactionResult {
  success: boolean;
  message: string;
  balance?: number;
  shares?: number;
  amountSgd?: number;
}


export interface DashboardBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  paid: boolean;
}


interface StoredDashboardData {
  selectedItems: DashboardItemId[];
  investments: DashboardInvestment[];
  monthlyBudget: number;
  upcomingBills: DashboardBill[];
}


@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly dashboardCollection = 'dashboards';

  private readonly allowedItems: DashboardItemId[] = [
    'savings-goals',
    'investment-tracking',
    'spending-summary',
    'monthly-budget',
    'rewards-cashback',
    'upcoming-bills',
    'recent-transactions',
    'financial-tips',
  ];


  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {}


  async getSelectedItems(): Promise<DashboardItemId[]> {
    const dashboardData = await this.getDashboardData();
    return [...dashboardData.selectedItems];
  }


  async saveSelectedItems(itemIds: string[]): Promise<DashboardItemId[]> {
    const validItems = itemIds
      .filter((itemId): itemId is DashboardItemId => this.isDashboardItemId(itemId))
      .filter((itemId, index, items) => items.indexOf(itemId) === index)
      .slice(0, 2);

    const selectedItems: DashboardItemId[] = validItems.length > 0 ? validItems : ['savings-goals'];

    const dashboardData = await this.getDashboardData();
    dashboardData.selectedItems = selectedItems;
    await this.saveDashboardData(dashboardData);

    return [...dashboardData.selectedItems];
  }


  async getInvestments(): Promise<DashboardInvestment[]> {
    const dashboardData = await this.getDashboardData();
    return dashboardData.investments.map((investment) => ({ ...investment }));
  }


  /*
   * =====================================
   * UPDATE CURRENT MARKET PRICES
   * =====================================
   */
  async updateInvestmentPrices(prices: { symbol: string; priceSgd: number }[]): Promise<void> {
    const dashboardData = await this.getDashboardData();
    let changed = false;

    dashboardData.investments.forEach((investment) => {
      const latestPrice = prices.find(
        (price) => price.symbol.toUpperCase() === investment.symbol.toUpperCase()
      );

      if (!latestPrice) {
        return;
      }

      if (!Number.isFinite(latestPrice.priceSgd) || latestPrice.priceSgd <= 0) {
        return;
      }

      investment.lastPriceSgd = this.roundMoney(latestPrice.priceSgd);
      investment.currentValue = this.roundMoney(investment.shares * investment.lastPriceSgd);
      changed = true;
    });

    if (changed) {
      await this.saveDashboardData(dashboardData);
    }
  }


  /*
   * =====================================
   * BUY WHOLE UNITS
   * =====================================
   *
   * This runs as a single Firestore transaction spanning both the
   * dashboard doc (investments) and the finance doc (balance), so a
   * buy can never partially apply.
   */
  async buyStockUnits(
    symbol: string,
    name: string,
    units: number,
    currentPriceSgd: number
  ): Promise<InvestmentTransactionResult> {
    const cleanedSymbol = symbol.trim().toUpperCase();
    const cleanedName = name.trim();

    if (!cleanedSymbol) {
      return { success: false, message: 'Stock symbol is required.' };
    }

    if (!cleanedName) {
      return { success: false, message: 'Stock name is required.' };
    }

    if (!Number.isFinite(units) || !Number.isInteger(units) || units <= 0) {
      return { success: false, message: 'Enter a valid whole number of units.' };
    }

    if (!Number.isFinite(currentPriceSgd) || currentPriceSgd <= 0) {
      return { success: false, message: 'The stock price is currently unavailable.' };
    }

    const unitPrice = this.roundMoney(currentPriceSgd);
    const totalCost = this.roundMoney(unitPrice * units);

    const username = this.getUsername();
    const dashboardRef = this.dashboardRef(username);
    const financeRef = this.financeRef(username);

    return runTransaction(this.firestore, async (transaction) => {
      const financeSnapshot = await transaction.get(financeRef);
      const currentBalance = financeSnapshot.exists() && typeof financeSnapshot.data()['balance'] === 'number'
        ? (financeSnapshot.data()['balance'] as number)
        : 0;

      if (totalCost > currentBalance) {
        return { success: false, message: 'You do not have enough available balance.' };
      }

      const dashboardSnapshot = await transaction.get(dashboardRef);
      const dashboardData = dashboardSnapshot.exists()
        ? this.normalizeDashboardData(dashboardSnapshot.data() as StoredDashboardData)
        : this.createDefaultDashboardData();

      const existingInvestment = dashboardData.investments.find(
        (investment) => investment.symbol.toUpperCase() === cleanedSymbol
      );

      if (existingInvestment) {
        const newUnits = existingInvestment.shares + units;
        const newInvestedAmount = this.roundMoney(existingInvestment.investedAmount + totalCost);

        existingInvestment.shares = newUnits;
        existingInvestment.investedAmount = newInvestedAmount;
        existingInvestment.averageBuyPriceSgd = this.roundMoney(newInvestedAmount / newUnits);
        existingInvestment.lastPriceSgd = unitPrice;
        existingInvestment.currentValue = this.roundMoney(newUnits * unitPrice);
      } else {
        const newInvestment: DashboardInvestment = {
          id: `${cleanedSymbol.toLowerCase()}-${Date.now()}`,
          name: cleanedName,
          symbol: cleanedSymbol,
          investedAmount: totalCost,
          currentValue: totalCost,
          shares: units,
          averageBuyPriceSgd: unitPrice,
          lastPriceSgd: unitPrice,
        };

        dashboardData.investments.push(newInvestment);
      }

      const newBalance = this.roundMoney(currentBalance - totalCost);
      transaction.update(financeRef, { balance: newBalance });
      transaction.set(dashboardRef, dashboardData);

      return {
        success: true,
        message: `${units} ${units === 1 ? 'unit' : 'units'} of ${cleanedName} purchased for S$${totalCost.toFixed(2)}.`,
        balance: newBalance,
        shares: units,
        amountSgd: totalCost,
      };
    });
  }


  /*
   * =====================================
   * SELL SELECTED NUMBER OF UNITS
   * =====================================
   */
  async sellStockUnits(
    symbol: string,
    unitsToSell: number,
    currentPriceSgd: number
  ): Promise<InvestmentTransactionResult> {
    const cleanedSymbol = symbol.trim().toUpperCase();

    if (!Number.isFinite(unitsToSell) || !Number.isInteger(unitsToSell) || unitsToSell <= 0) {
      return { success: false, message: 'Enter a valid whole number of units to sell.' };
    }

    if (!Number.isFinite(currentPriceSgd) || currentPriceSgd <= 0) {
      return { success: false, message: 'The stock price is currently unavailable.' };
    }

    const username = this.getUsername();
    const dashboardRef = this.dashboardRef(username);
    const financeRef = this.financeRef(username);

    return runTransaction(this.firestore, async (transaction) => {
      const dashboardSnapshot = await transaction.get(dashboardRef);
      const dashboardData = dashboardSnapshot.exists()
        ? this.normalizeDashboardData(dashboardSnapshot.data() as StoredDashboardData)
        : this.createDefaultDashboardData();

      const investmentIndex = dashboardData.investments.findIndex(
        (investment) => investment.symbol.toUpperCase() === cleanedSymbol
      );

      if (investmentIndex === -1) {
        return { success: false, message: 'Investment was not found.' };
      }

      const investment = dashboardData.investments[investmentIndex];

      if (unitsToSell > investment.shares) {
        return {
          success: false,
          message: `You only own ${investment.shares} ${investment.shares === 1 ? 'unit' : 'units'} of ${investment.name}.`,
        };
      }

      const saleValue = this.roundMoney(unitsToSell * currentPriceSgd);
      const costBasisSold = this.roundMoney(unitsToSell * investment.averageBuyPriceSgd);
      const remainingUnits = investment.shares - unitsToSell;
      const investmentName = investment.name;

      if (remainingUnits === 0) {
        dashboardData.investments.splice(investmentIndex, 1);
      } else {
        investment.shares = remainingUnits;
        investment.investedAmount = this.roundMoney(Math.max(investment.investedAmount - costBasisSold, 0));
        investment.averageBuyPriceSgd = this.roundMoney(investment.averageBuyPriceSgd);
        investment.lastPriceSgd = this.roundMoney(currentPriceSgd);
        investment.currentValue = this.roundMoney(remainingUnits * currentPriceSgd);
      }

      const financeSnapshot = await transaction.get(financeRef);
      const currentBalance = financeSnapshot.exists() && typeof financeSnapshot.data()['balance'] === 'number'
        ? (financeSnapshot.data()['balance'] as number)
        : 0;
      const newBalance = this.roundMoney(currentBalance + saleValue);

      transaction.set(dashboardRef, dashboardData);
      transaction.update(financeRef, { balance: newBalance });

      return {
        success: true,
        message: `${unitsToSell} ${unitsToSell === 1 ? 'unit' : 'units'} of ${investmentName} sold for S$${saleValue.toFixed(2)}.`,
        balance: newBalance,
        shares: unitsToSell,
        amountSgd: saleValue,
      };
    });
  }


  /*
   * =====================================
   * MONTHLY BUDGET
   * =====================================
   */
  async getMonthlyBudget(): Promise<number> {
    const dashboardData = await this.getDashboardData();
    return dashboardData.monthlyBudget;
  }


  async setMonthlyBudget(amount: number): Promise<boolean> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    const dashboardData = await this.getDashboardData();
    dashboardData.monthlyBudget = this.roundMoney(amount);
    await this.saveDashboardData(dashboardData);

    return true;
  }


  /*
   * =====================================
   * BILLS
   * =====================================
   */
  async getUpcomingBills(): Promise<DashboardBill[]> {
    const dashboardData = await this.getDashboardData();
    return dashboardData.upcomingBills.map((bill) => ({ ...bill }));
  }


  async markBillPaid(billId: string): Promise<boolean> {
    const dashboardData = await this.getDashboardData();
    const bill = dashboardData.upcomingBills.find((item) => item.id === billId);

    if (!bill) {
      return false;
    }

    bill.paid = true;
    await this.saveDashboardData(dashboardData);

    return true;
  }


  /*
   * =====================================
   * CASHBACK
   * =====================================
   *
   * Still reads a plain localStorage key written by the game module's
   * scratch-card component — that ownership boundary isn't touched here.
   */
  getCashbackBalance(): number {
    const storedValue = localStorage.getItem(`cashbackBalance_${this.getUsername()}`);
    const amount = Number(storedValue);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
  }


  /*
   * =====================================
   * FINANCIAL TIPS
   * =====================================
   */
  getFinancialTips(): string[] {
    return [
      'Set aside part of your income before spending on non-essential items.',
      'Review your merchant payments weekly to spot unnecessary spending.',
      'Build an emergency fund that can cover several months of essential expenses.',
      'Use vouchers only when you were already planning to make the purchase.',
      'Check your upcoming bills before making a large payment.',
    ];
  }


  /*
   * =====================================
   * LOAD / SAVE DASHBOARD DATA
   * =====================================
   */
  private async getDashboardData(): Promise<StoredDashboardData> {
    const ref = this.dashboardRef(this.getUsername());
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const defaultData = this.createDefaultDashboardData();
      await setDoc(ref, defaultData);
      return defaultData;
    }

    return this.normalizeDashboardData(snapshot.data() as StoredDashboardData);
  }


  private async saveDashboardData(dashboardData: StoredDashboardData): Promise<boolean> {
    try {
      await setDoc(this.dashboardRef(this.getUsername()), dashboardData);
      return true;
    } catch (error) {
      console.warn('Unable to save dashboard data:', error);
      return false;
    }
  }


  private dashboardRef(username: string) {
    return doc(this.firestore, this.dashboardCollection, this.normalizeUsername(username));
  }


  private financeRef(username: string) {
    return doc(this.firestore, FINANCE_COLLECTION, this.normalizeUsername(username));
  }


  /*
   * =====================================
   * NORMALIZE / VALIDATE STORED DATA
   * =====================================
   */
  private normalizeDashboardData(data: Partial<StoredDashboardData> | undefined): StoredDashboardData {
    if (!data || !Array.isArray(data.investments) || !Array.isArray(data.selectedItems) || !Array.isArray(data.upcomingBills)) {
      return this.createDefaultDashboardData();
    }

    return {
      selectedItems: data.selectedItems,
      investments: data.investments.map((investment) => this.normalizeInvestment(investment)),
      monthlyBudget: typeof data.monthlyBudget === 'number' ? data.monthlyBudget : 1500,
      upcomingBills: data.upcomingBills,
    };
  }


  private normalizeInvestment(investment: DashboardInvestment): DashboardInvestment {
    const symbol = String(investment.symbol ?? '').trim().toUpperCase();
    const investedAmount = Number(investment.investedAmount);
    const currentValue = Number(investment.currentValue);
    let shares = Number(investment.shares);
    let lastPrice = Number(investment.lastPriceSgd);
    let averagePrice = Number(investment.averageBuyPriceSgd);

    if (!Number.isFinite(shares) || shares <= 0) {
      const referencePrice = this.getLegacyReferencePrice(symbol);
      shares = referencePrice > 0 ? Math.max(1, Math.round(currentValue / referencePrice)) : 1;
    }

    shares = Math.max(1, Math.round(shares));

    if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
      lastPrice = shares > 0 ? currentValue / shares : 0;
    }

    if (!Number.isFinite(averagePrice) || averagePrice <= 0) {
      averagePrice = shares > 0 ? investedAmount / shares : 0;
    }

    return {
      id: String(investment.id ?? `investment-${Date.now()}`),
      name: String(investment.name ?? symbol),
      symbol,
      investedAmount: this.roundMoney(Number.isFinite(investedAmount) ? investedAmount : 0),
      currentValue: this.roundMoney(Number.isFinite(currentValue) ? currentValue : 0),
      shares,
      averageBuyPriceSgd: this.roundMoney(averagePrice),
      lastPriceSgd: this.roundMoney(lastPrice),
    };
  }


  private getLegacyReferencePrice(symbol: string): number {
    switch (symbol.toUpperCase()) {
      case 'AAPL':
        return 275;
      case 'NVDA':
        return 275;
      case 'TSLA':
        return 475;
      case 'MSFT':
        return 500;
      case 'AMZN':
        return 250;
      case 'GOOGL':
        return 220;
      default:
        return 100;
    }
  }


  /*
   * =====================================
   * DEFAULT DATA
   * =====================================
   */
  private createDefaultDashboardData(): StoredDashboardData {
    return {
      selectedItems: ['savings-goals', 'investment-tracking'],

      investments: [
        {
          id: 'apple-investment',
          name: 'Apple',
          symbol: 'AAPL',
          investedAmount: 1000,
          currentValue: 1100,
          shares: 4,
          averageBuyPriceSgd: 250,
          lastPriceSgd: 275,
        },
        {
          id: 'nvidia-investment',
          name: 'NVIDIA',
          symbol: 'NVDA',
          investedAmount: 1500,
          currentValue: 1650,
          shares: 6,
          averageBuyPriceSgd: 250,
          lastPriceSgd: 275,
        },
        {
          id: 'tesla-investment',
          name: 'Tesla',
          symbol: 'TSLA',
          investedAmount: 1000,
          currentValue: 950,
          shares: 2,
          averageBuyPriceSgd: 500,
          lastPriceSgd: 475,
        },
      ],

      monthlyBudget: 1500,

      upcomingBills: [
        {
          id: 'mobile-bill',
          name: 'Mobile Bill',
          amount: 78,
          dueDate: this.createFutureDate(5),
          paid: false,
        },
        {
          id: 'internet-bill',
          name: 'Internet Bill',
          amount: 49.90,
          dueDate: this.createFutureDate(10),
          paid: false,
        },
        {
          id: 'subscription-bill',
          name: 'Streaming Subscription',
          amount: 19.98,
          dueDate: this.createFutureDate(15),
          paid: false,
        },
      ],
    };
  }


  private createFutureDate(daysFromNow: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString();
  }


  private getUsername(): string {
    return this.authService.getCurrentUser()?.username ?? 'guest';
  }


  private normalizeUsername(username: string): string {
    return (username || '').trim().toLowerCase() || 'guest';
  }


  private isDashboardItemId(value: string): value is DashboardItemId {
    return this.allowedItems.includes(value as DashboardItemId);
  }


  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
