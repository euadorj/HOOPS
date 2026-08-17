import { Injectable } from '@angular/core';

import {
  Firestore,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from '@angular/fire/firestore';

import {
  AuthService,
} from '../auth/auth.service';

import {
  FINANCE_COLLECTION,
} from './savings.service';


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
  shares: number;
  averageBuyPriceSgd: number;
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

  private readonly dashboardCollection =
    'dashboards';


  private readonly allowedItems:
    DashboardItemId[] = [

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


  /*
   * =====================================
   * SELECTED ITEMS
   * =====================================
   */

  async getSelectedItems():
    Promise<DashboardItemId[]> {

    await this.authService
      .authReady;


    const data =
      await this.getDashboardData();


    return [
      ...data.selectedItems,
    ];
  }


  async saveSelectedItems(
    itemIds: string[]
  ): Promise<DashboardItemId[]> {

    await this.authService
      .authReady;


    const validItems =
      itemIds
        .filter(
          (
            itemId
          ): itemId is DashboardItemId =>
            this.isDashboardItemId(
              itemId
            )
        )
        .filter(
          (
            itemId,
            index,
            allItems
          ) =>
            allItems.indexOf(
              itemId
            ) === index
        )
        .slice(
          0,
          2
        );


    const selectedItems:
      DashboardItemId[] =
      validItems.length > 0
        ? validItems
        : [
            'savings-goals',
            'investment-tracking',
          ];


    const dashboardData =
      await this.getDashboardData();


    dashboardData.selectedItems =
      selectedItems;


    await this.saveDashboardData(
      dashboardData
    );


    return [
      ...selectedItems,
    ];
  }


  /*
   * =====================================
   * INVESTMENTS
   * =====================================
   */

  async getInvestments():
    Promise<DashboardInvestment[]> {

    await this.authService
      .authReady;


    const data =
      await this.getDashboardData();


    return data.investments.map(
      (investment) => ({
        ...investment,
      })
    );
  }


  /*
   * =====================================
   * UPDATE STOCK PRICES
   * =====================================
   */

  async updateInvestmentPrices(
    prices: {
      symbol: string;
      priceSgd: number;
    }[]
  ): Promise<void> {

    await this.authService
      .authReady;


    const dashboardData =
      await this.getDashboardData();


    let changed =
      false;


    dashboardData.investments.forEach(
      (investment) => {

        const quote =
          prices.find(
            (price) =>
              price.symbol
                .toUpperCase() ===
              investment.symbol
                .toUpperCase()
          );


        if (!quote) {

          return;
        }


        if (
          !Number.isFinite(
            quote.priceSgd
          ) ||
          quote.priceSgd <= 0
        ) {

          return;
        }


        investment.lastPriceSgd =
          this.roundMoney(
            quote.priceSgd
          );


        investment.currentValue =
          this.roundMoney(
            investment.shares *
            investment.lastPriceSgd
          );


        changed = true;
      }
    );


    if (changed) {

      await this.saveDashboardData(
        dashboardData
      );
    }
  }


  /*
   * =====================================
   * BUY STOCK
   * =====================================
   */

  async buyStockUnits(
    symbol: string,
    name: string,
    units: number,
    currentPriceSgd: number
  ): Promise<InvestmentTransactionResult> {

    await this.authService
      .authReady;


    const username =
      this.getUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const cleanedSymbol =
      symbol
        .trim()
        .toUpperCase();


    const cleanedName =
      name.trim();


    if (!cleanedSymbol) {

      return {
        success: false,
        message:
          'Stock symbol is required.',
      };
    }


    if (!cleanedName) {

      return {
        success: false,
        message:
          'Stock name is required.',
      };
    }


    if (
      !Number.isFinite(units) ||
      !Number.isInteger(units) ||
      units <= 0
    ) {

      return {
        success: false,
        message:
          'Enter a valid whole number of units.',
      };
    }


    if (
      !Number.isFinite(
        currentPriceSgd
      ) ||
      currentPriceSgd <= 0
    ) {

      return {
        success: false,
        message:
          'The stock price is currently unavailable.',
      };
    }


    const price =
      this.roundMoney(
        currentPriceSgd
      );


    const totalCost =
      this.roundMoney(
        units * price
      );


    const dashboardRef =
      this.dashboardRef(
        username
      );


    const financeRef =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        /*
         * ALL READS FIRST.
         */

        const financeSnapshot =
          await transaction.get(
            financeRef
          );


        const dashboardSnapshot =
          await transaction.get(
            dashboardRef
          );


        let balance = 0;

        let goals: any[] = [];


        if (
          financeSnapshot.exists()
        ) {

          const data =
            financeSnapshot.data();


          const rawBalance =
            data['balance'];


          const rawGoals =
            data['goals'];


          balance =
            typeof rawBalance === 'number'
              ? rawBalance
              : 0;


          goals =
            Array.isArray(rawGoals)
              ? rawGoals
              : [];
        }


        if (
          totalCost >
          balance
        ) {

          return {
            success: false,
            message:
              'You do not have enough available balance.',
          };
        }


        const dashboardData =
          dashboardSnapshot.exists()
            ? this.normalizeDashboardData(
                dashboardSnapshot.data()
              )
            : this.createDefaultDashboardData();


        const existing =
          dashboardData.investments.find(
            (investment) =>
              investment.symbol
                .toUpperCase() ===
              cleanedSymbol
          );


        if (existing) {

          const newUnits =
            existing.shares +
            units;


          const newInvestedAmount =
            this.roundMoney(
              existing.investedAmount +
              totalCost
            );


          existing.shares =
            newUnits;


          existing.investedAmount =
            newInvestedAmount;


          existing.averageBuyPriceSgd =
            this.roundMoney(
              newInvestedAmount /
              newUnits
            );


          existing.lastPriceSgd =
            price;


          existing.currentValue =
            this.roundMoney(
              newUnits *
              price
            );

        } else {

          const investment:
            DashboardInvestment = {

            id:
              `${cleanedSymbol.toLowerCase()}-${Date.now()}`,

            name:
              cleanedName,

            symbol:
              cleanedSymbol,

            investedAmount:
              totalCost,

            currentValue:
              totalCost,

            shares:
              units,

            averageBuyPriceSgd:
              price,

            lastPriceSgd:
              price,
          };


          dashboardData.investments.push(
            investment
          );
        }


        const newBalance =
          this.roundMoney(
            balance -
            totalCost
          );


        transaction.set(
          financeRef,
          {
            balance:
              newBalance,

            goals,
          }
        );


        transaction.set(
          dashboardRef,
          dashboardData
        );


        return {
          success: true,

          message:
            `${units} ` +
            `${units === 1 ? 'unit' : 'units'} ` +
            `of ${cleanedName} purchased for ` +
            `S$${totalCost.toFixed(2)}.`,

          balance:
            newBalance,

          shares:
            units,

          amountSgd:
            totalCost,
        };
      }
    );
  }


  /*
   * =====================================
   * SELL STOCK
   * =====================================
   */

  async sellStockUnits(
    symbol: string,
    unitsToSell: number,
    currentPriceSgd: number
  ): Promise<InvestmentTransactionResult> {

    await this.authService
      .authReady;


    const username =
      this.getUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const cleanedSymbol =
      symbol
        .trim()
        .toUpperCase();


    if (
      !Number.isFinite(
        unitsToSell
      ) ||
      !Number.isInteger(
        unitsToSell
      ) ||
      unitsToSell <= 0
    ) {

      return {
        success: false,
        message:
          'Enter a valid whole number of units to sell.',
      };
    }


    if (
      !Number.isFinite(
        currentPriceSgd
      ) ||
      currentPriceSgd <= 0
    ) {

      return {
        success: false,
        message:
          'The stock price is currently unavailable.',
      };
    }


    const dashboardRef =
      this.dashboardRef(
        username
      );


    const financeRef =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        /*
         * ALL READS FIRST.
         */

        const dashboardSnapshot =
          await transaction.get(
            dashboardRef
          );


        const financeSnapshot =
          await transaction.get(
            financeRef
          );


        const dashboardData =
          dashboardSnapshot.exists()
            ? this.normalizeDashboardData(
                dashboardSnapshot.data()
              )
            : this.createDefaultDashboardData();


        let balance = 0;

        let goals: any[] = [];


        if (
          financeSnapshot.exists()
        ) {

          const financeData =
            financeSnapshot.data();


          const rawBalance =
            financeData['balance'];


          const rawGoals =
            financeData['goals'];


          balance =
            typeof rawBalance === 'number'
              ? rawBalance
              : 0;


          goals =
            Array.isArray(rawGoals)
              ? rawGoals
              : [];
        }


        const investmentIndex =
          dashboardData.investments
            .findIndex(
              (investment) =>
                investment.symbol
                  .toUpperCase() ===
                cleanedSymbol
            );


        if (
          investmentIndex === -1
        ) {

          return {
            success: false,
            message:
              'Investment was not found.',
          };
        }


        const investment =
          dashboardData.investments[
            investmentIndex
          ];


        if (
          unitsToSell >
          investment.shares
        ) {

          return {
            success: false,

            message:
              `You only own ${investment.shares} ` +
              `${investment.shares === 1 ? 'unit' : 'units'} ` +
              `of ${investment.name}.`,
          };
        }


        const saleValue =
          this.roundMoney(
            unitsToSell *
            currentPriceSgd
          );


        const costBasisSold =
          this.roundMoney(
            unitsToSell *
            investment.averageBuyPriceSgd
          );


        const remainingUnits =
          investment.shares -
          unitsToSell;


        const investmentName =
          investment.name;


        if (
          remainingUnits === 0
        ) {

          dashboardData.investments.splice(
            investmentIndex,
            1
          );

        } else {

          investment.shares =
            remainingUnits;


          investment.investedAmount =
            this.roundMoney(
              Math.max(
                investment.investedAmount -
                costBasisSold,
                0
              )
            );


          investment.lastPriceSgd =
            this.roundMoney(
              currentPriceSgd
            );


          investment.currentValue =
            this.roundMoney(
              remainingUnits *
              currentPriceSgd
            );
        }


        const newBalance =
          this.roundMoney(
            balance +
            saleValue
          );


        transaction.set(
          dashboardRef,
          dashboardData
        );


        transaction.set(
          financeRef,
          {
            balance:
              newBalance,

            goals,
          }
        );


        return {
          success: true,

          message:
            `${unitsToSell} ` +
            `${unitsToSell === 1 ? 'unit' : 'units'} ` +
            `of ${investmentName} sold for ` +
            `S$${saleValue.toFixed(2)}.`,

          balance:
            newBalance,

          shares:
            unitsToSell,

          amountSgd:
            saleValue,
        };
      }
    );
  }


  /*
   * =====================================
   * BUDGET
   * =====================================
   */

  async getMonthlyBudget():
    Promise<number> {

    const data =
      await this.getDashboardData();


    return data.monthlyBudget;
  }


  async setMonthlyBudget(
    amount: number
  ): Promise<boolean> {

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return false;
    }


    const data =
      await this.getDashboardData();


    data.monthlyBudget =
      this.roundMoney(
        amount
      );


    return this.saveDashboardData(
      data
    );
  }


  /*
   * =====================================
   * BILLS
   * =====================================
   */

  async getUpcomingBills():
    Promise<DashboardBill[]> {

    const data =
      await this.getDashboardData();


    return data.upcomingBills.map(
      (bill) => ({
        ...bill,
      })
    );
  }


  async markBillPaid(
    billId: string
  ): Promise<boolean> {

    const data =
      await this.getDashboardData();


    const bill =
      data.upcomingBills.find(
        (item) =>
          item.id === billId
      );


    if (!bill) {

      return false;
    }


    bill.paid = true;


    return this.saveDashboardData(
      data
    );
  }


  /*
   * =====================================
   * CASHBACK
   * =====================================
   */

  getCashbackBalance(): number {

    const username =
      this.getUsername();


    if (!username) {

      return 0;
    }


    const value =
      localStorage.getItem(
        `cashbackBalance_${username}`
      );


    const amount =
      Number(
        value
      );


    return (
      Number.isFinite(amount) &&
      amount >= 0
    )
      ? amount
      : 0;
  }


  /*
   * =====================================
   * TIPS
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
   * LOAD DASHBOARD
   * =====================================
   */

  private async getDashboardData():
    Promise<StoredDashboardData> {

    await this.authService
      .authReady;


    const username =
      this.getUsername();


    if (!username) {

      return this
        .createDefaultDashboardData();
    }


    const ref =
      this.dashboardRef(
        username
      );


    const snapshot =
      await getDoc(
        ref
      );


    if (!snapshot.exists()) {

      const emptyDashboard =
        this.createDefaultDashboardData();


      await setDoc(
        ref,
        emptyDashboard
      );


      return emptyDashboard;
    }


    return this
      .normalizeDashboardData(
        snapshot.data()
      );
  }


  /*
   * =====================================
   * SAVE DASHBOARD
   * =====================================
   */

  private async saveDashboardData(
    dashboardData:
      StoredDashboardData
  ): Promise<boolean> {

    const username =
      this.getUsername();


    if (!username) {

      return false;
    }


    try {

      await setDoc(
        this.dashboardRef(
          username
        ),
        dashboardData
      );


      return true;

    } catch (error) {

      console.warn(
        'Unable to save dashboard:',
        error
      );


      return false;
    }
  }


  /*
   * =====================================
   * REFERENCES
   * =====================================
   */

  private dashboardRef(
    username: string
  ) {

    return doc(
      this.firestore,
      this.dashboardCollection,
      this.normalizeUsername(
        username
      )
    );
  }


  private financeRef(
    username: string
  ) {

    return doc(
      this.firestore,
      FINANCE_COLLECTION,
      this.normalizeUsername(
        username
      )
    );
  }


  /*
   * =====================================
   * NORMALIZE DASHBOARD
   * =====================================
   */

  private normalizeDashboardData(
    data: any
  ): StoredDashboardData {

    const selectedItems:
      DashboardItemId[] = [];


    if (
      Array.isArray(
        data?.selectedItems
      )
    ) {

      data.selectedItems.forEach(
        (item: unknown) => {

          if (
            typeof item === 'string' &&
            this.isDashboardItemId(
              item
            )
          ) {

            selectedItems.push(
              item
            );
          }
        }
      );
    }


    const investments:
      DashboardInvestment[] = [];


    if (
      Array.isArray(
        data?.investments
      )
    ) {

      data.investments.forEach(
        (item: unknown) => {

          const investment =
            this.normalizeInvestment(
              item
            );


          if (investment) {

            investments.push(
              investment
            );
          }
        }
      );
    }


    const bills:
      DashboardBill[] = [];


    if (
      Array.isArray(
        data?.upcomingBills
      )
    ) {

      data.upcomingBills.forEach(
        (item: any) => {

          if (
            item &&
            typeof item.id === 'string' &&
            typeof item.name === 'string' &&
            typeof item.amount === 'number' &&
            typeof item.dueDate === 'string'
          ) {

            bills.push({

              id:
                item.id,

              name:
                item.name,

              amount:
                item.amount,

              dueDate:
                item.dueDate,

              paid:
                item.paid === true,
            });
          }
        }
      );
    }


    const monthlyBudget =
      typeof data?.monthlyBudget === 'number'
        ? data.monthlyBudget
        : 0;


    return {

      selectedItems:
        selectedItems.length > 0
          ? selectedItems.slice(0, 2)
          : [
              'savings-goals',
              'investment-tracking',
            ],

      investments,

      monthlyBudget:

        this.roundMoney(
          monthlyBudget
        ),

      upcomingBills:
        bills,
    };
  }


  /*
   * =====================================
   * NORMALIZE INVESTMENT
   * =====================================
   */

  private normalizeInvestment(
    item: any
  ): DashboardInvestment | null {

    if (!item) {

      return null;
    }


    const symbol =
      typeof item.symbol === 'string'
        ? item.symbol
            .trim()
            .toUpperCase()
        : '';


    if (!symbol) {

      return null;
    }


    const sharesRaw =
      Number(
        item.shares
      );


    const shares =
      Number.isFinite(sharesRaw)
        ? Math.max(
            0,
            Math.round(
              sharesRaw
            )
          )
        : 0;


    /*
     * A zero-unit holding should
     * not remain in portfolio.
     */
    if (
      shares <= 0
    ) {

      return null;
    }


    const investedAmount =
      Number(
        item.investedAmount
      );


    const currentValue =
      Number(
        item.currentValue
      );


    const averageBuyPrice =
      Number(
        item.averageBuyPriceSgd
      );


    const lastPrice =
      Number(
        item.lastPriceSgd
      );


    return {

      id:
        typeof item.id === 'string'
          ? item.id
          : `investment-${Date.now()}`,

      name:
        typeof item.name === 'string'
          ? item.name
          : symbol,

      symbol,

      investedAmount:
        this.roundMoney(
          Number.isFinite(
            investedAmount
          )
            ? investedAmount
            : 0
        ),

      currentValue:
        this.roundMoney(
          Number.isFinite(
            currentValue
          )
            ? currentValue
            : 0
        ),

      shares,

      averageBuyPriceSgd:
        this.roundMoney(
          Number.isFinite(
            averageBuyPrice
          )
            ? averageBuyPrice
            : 0
        ),

      lastPriceSgd:
        this.roundMoney(
          Number.isFinite(
            lastPrice
          )
            ? lastPrice
            : 0
        ),
    };
  }


  /*
   * =====================================
   * EMPTY DEFAULT
   * =====================================
   */

  private createDefaultDashboardData():
    StoredDashboardData {

    return {

      selectedItems: [
        'savings-goals',
        'investment-tracking',
      ],

      investments: [],

      monthlyBudget: 0,

      upcomingBills: [],
    };
  }


  /*
   * =====================================
   * USERNAME
   * =====================================
   */

  private getUsername(): string {

    const user =
      this.authService
        .getCurrentUser();


    if (!user) {

      return '';
    }


    return this.normalizeUsername(
      user.username
    );
  }


  private normalizeUsername(
    username: string
  ): string {

    return (
      username || ''
    )
      .trim()
      .toLowerCase();
  }


  private isDashboardItemId(
    value: string
  ): value is DashboardItemId {

    return this.allowedItems
      .includes(
        value as DashboardItemId
      );
  }


  private roundMoney(
    amount: number
  ): number {

    return (
      Math.round(
        (amount + Number.EPSILON) *
        100
      ) / 100
    );
  }
}