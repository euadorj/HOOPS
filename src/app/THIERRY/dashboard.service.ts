import { Injectable } from '@angular/core';

import {
  AuthService
} from '../auth/auth.service';

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
  investedAmount: number;
  currentValue: number;
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
    private authService: AuthService
  ) {}

  getSelectedItems(): DashboardItemId[] {
    return [...this.getDashboardData().selectedItems];
  }

  saveSelectedItems(
    itemIds: string[]
  ): DashboardItemId[] {
    const validItems = itemIds
      .filter(
        (
          itemId
        ): itemId is DashboardItemId =>
          this.isDashboardItemId(itemId)
      )
      .filter(
        (
          itemId,
          index,
          items
        ) => items.indexOf(itemId) === index
      )
      .slice(0, 2);

    const selectedItems =
      validItems.length > 0
        ? validItems
        : ['savings-goals'];

    const dashboardData =
      this.getDashboardData();

    dashboardData.selectedItems =
      selectedItems as DashboardItemId[];

    this.saveDashboardData(dashboardData);

    return [...dashboardData.selectedItems];
  }

  getInvestments(): DashboardInvestment[] {
    return this.getDashboardData().investments.map(
      (investment) => ({
        ...investment,
      })
    );
  }

  saveInvestments(
    investments: DashboardInvestment[]
  ): void {
    const dashboardData =
      this.getDashboardData();

    dashboardData.investments =
      investments.map((investment) => ({
        ...investment,
      }));

    this.saveDashboardData(dashboardData);
  }

  getMonthlyBudget(): number {
    return this.getDashboardData().monthlyBudget;
  }

  setMonthlyBudget(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    const dashboardData =
      this.getDashboardData();

    dashboardData.monthlyBudget =
      this.roundMoney(amount);

    this.saveDashboardData(dashboardData);

    return true;
  }

  getUpcomingBills(): DashboardBill[] {
    return this.getDashboardData()
      .upcomingBills
      .map((bill) => ({
        ...bill,
      }));
  }

  markBillPaid(billId: string): boolean {
    const dashboardData =
      this.getDashboardData();

    const bill =
      dashboardData.upcomingBills.find(
        (item) => item.id === billId
      );

    if (!bill) {
      return false;
    }

    bill.paid = true;

    this.saveDashboardData(dashboardData);

    return true;
  }

  getCashbackBalance(): number {
    const storedValue = localStorage.getItem(
      `cashbackBalance_${this.getUsername()}`
    );

    const amount = Number(storedValue);

    return Number.isFinite(amount) && amount >= 0
      ? amount
      : 0;
  }

  getFinancialTips(): string[] {
    return [
      'Set aside part of your income before spending on non-essential items.',
      'Review your merchant payments weekly to spot unnecessary spending.',
      'Build an emergency fund that can cover several months of essential expenses.',
      'Use vouchers only when you were already planning to make the purchase.',
      'Check your upcoming bills before making a large payment.',
    ];
  }

  private getDashboardData(): StoredDashboardData {
    try {
      const storedValue = localStorage.getItem(
        this.getStorageKey()
      );

      if (!storedValue) {
        const defaultData =
          this.createDefaultDashboardData();

        this.saveDashboardData(defaultData);

        return defaultData;
      }

      const parsedValue: unknown =
        JSON.parse(storedValue);

      if (!this.isStoredDashboardData(parsedValue)) {
        const defaultData =
          this.createDefaultDashboardData();

        this.saveDashboardData(defaultData);

        return defaultData;
      }

      return parsedValue;
    } catch (error) {
      console.warn(
        'Unable to load dashboard data:',
        error
      );

      return this.createDefaultDashboardData();
    }
  }

  private saveDashboardData(
    dashboardData: StoredDashboardData
  ): void {
    try {
      localStorage.setItem(
        this.getStorageKey(),
        JSON.stringify(dashboardData)
      );
    } catch (error) {
      console.warn(
        'Unable to save dashboard data:',
        error
      );
    }
  }

  private createDefaultDashboardData():
    StoredDashboardData {
    return {
      selectedItems:
        this.getLegacySelections(),

      investments: [
        {
          id: 'apple-investment',
          name: 'Apple',
          symbol: 'AAPL',
          investedAmount: 1000,
          currentValue: 1100,
        },
        {
          id: 'nvidia-investment',
          name: 'Nvidia',
          symbol: 'NVDA',
          investedAmount: 1500,
          currentValue: 1650,
        },
        {
          id: 'tesla-investment',
          name: 'Tesla',
          symbol: 'TSLA',
          investedAmount: 1000,
          currentValue: 950,
        },
      ],

      monthlyBudget: 1500,

      upcomingBills: [
        {
          id: 'mobile-bill',
          name: 'Mobile Bill',
          amount: 78,
          dueDate:
            this.createFutureDate(5),
          paid: false,
        },
        {
          id: 'internet-bill',
          name: 'Internet Bill',
          amount: 49.90,
          dueDate:
            this.createFutureDate(10),
          paid: false,
        },
        {
          id: 'subscription-bill',
          name: 'Streaming Subscription',
          amount: 19.98,
          dueDate:
            this.createFutureDate(15),
          paid: false,
        },
      ],
    };
  }

  private getLegacySelections():
    DashboardItemId[] {
    try {
      const oldValue =
        localStorage.getItem('dashboardItems');

      if (!oldValue) {
        return [
          'savings-goals',
          'investment-tracking',
        ];
      }

      const parsedValue: unknown =
        JSON.parse(oldValue);

      if (!Array.isArray(parsedValue)) {
        return [
          'savings-goals',
          'investment-tracking',
        ];
      }

      const validItems = parsedValue
        .filter(
          (
            itemId
          ): itemId is DashboardItemId =>
            typeof itemId === 'string' &&
            this.isDashboardItemId(itemId)
        )
        .slice(0, 2);

      return validItems.length > 0
        ? validItems
        : ['savings-goals'];
    } catch {
      return [
        'savings-goals',
        'investment-tracking',
      ];
    }
  }

  private createFutureDate(
    daysFromNow: number
  ): string {
    const date = new Date();

    date.setDate(
      date.getDate() + daysFromNow
    );

    return date.toISOString();
  }

  private getStorageKey(): string {
    return `dashboardData_${this.getUsername()}`;
  }

  private getUsername(): string {
    return (
      this.authService
        .getCurrentUser()
        ?.username.trim()
        .toLowerCase() ?? 'guest'
    );
  }

  private isDashboardItemId(
    value: string
  ): value is DashboardItemId {
    return this.allowedItems.includes(
      value as DashboardItemId
    );
  }

  private isStoredDashboardData(
    value: unknown
  ): value is StoredDashboardData {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const data =
      value as Partial<StoredDashboardData>;

    return (
      Array.isArray(data.selectedItems) &&
      Array.isArray(data.investments) &&
      typeof data.monthlyBudget === 'number' &&
      Array.isArray(data.upcomingBills)
    );
  }

  private roundMoney(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}