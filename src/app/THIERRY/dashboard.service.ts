import { Injectable } from '@angular/core';

import {
  AuthService,
} from '../auth/auth.service';

import {
  SavingsService,
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
    private savingsService: SavingsService
  ) {}


  getSelectedItems():
    DashboardItemId[] {

    return [
      ...this.getDashboardData()
        .selectedItems,
    ];
  }


  saveSelectedItems(
    itemIds: string[]
  ): DashboardItemId[] {

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
            items
          ) =>
            items.indexOf(
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
          : ['savings-goals'];


    const dashboardData =
      this.getDashboardData();


    dashboardData.selectedItems =
      selectedItems;


    this.saveDashboardData(
      dashboardData
    );


    return [
      ...dashboardData.selectedItems,
    ];
  }


  getInvestments():
    DashboardInvestment[] {

    return this
      .getDashboardData()
      .investments
      .map(
        (investment) => ({
          ...investment,
        })
      );
  }


  saveInvestments(
    investments:
      DashboardInvestment[]
  ): void {

    const dashboardData =
      this.getDashboardData();


    dashboardData.investments =
      investments.map(
        (investment) => ({
          ...investment,
        })
      );


    this.saveDashboardData(
      dashboardData
    );
  }


  /*
   * =====================================
   * UPDATE CURRENT MARKET PRICES
   * =====================================
   */
  updateInvestmentPrices(
    prices: {
      symbol: string;
      priceSgd: number;
    }[]
  ): void {

    const dashboardData =
      this.getDashboardData();


    let changed =
      false;


    dashboardData
      .investments
      .forEach(
        (investment) => {

          const latestPrice =
            prices.find(
              (price) =>
                price.symbol
                  .toUpperCase() ===
                investment.symbol
                  .toUpperCase()
            );


          if (!latestPrice) {
            return;
          }


          if (
            !Number.isFinite(
              latestPrice.priceSgd
            ) ||
            latestPrice.priceSgd <= 0
          ) {
            return;
          }


          investment.lastPriceSgd =
            this.roundMoney(
              latestPrice.priceSgd
            );


          investment.currentValue =
            this.roundMoney(
              investment.shares *
              investment.lastPriceSgd
            );


          changed =
            true;
        }
      );


    if (changed) {

      this.saveDashboardData(
        dashboardData
      );
    }
  }


  /*
   * =====================================
   * BUY WHOLE UNITS
   * =====================================
   *
   * Example:
   *
   * Stock price = S$200
   * Units = 3
   *
   * Cost = S$600
   */
  buyStockUnits(
    symbol: string,
    name: string,
    units: number,
    currentPriceSgd: number
  ): InvestmentTransactionResult {

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


    /*
     * WHOLE UNITS ONLY
     */
    if (
      !Number.isFinite(
        units
      ) ||
      !Number.isInteger(
        units
      ) ||
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


    const unitPrice =
      this.roundMoney(
        currentPriceSgd
      );


    const totalCost =
      this.roundMoney(
        unitPrice *
        units
      );


    /*
     * Deduct from available balance
     */
    const debitResult =
      this.savingsService
        .deductFromBalance(
          totalCost
        );


    if (!debitResult.success) {

      return {
        success: false,
        message:
          debitResult.message,
      };
    }


    const dashboardData =
      this.getDashboardData();


    const existingInvestment =
      dashboardData
        .investments
        .find(
          (investment) =>
            investment.symbol
              .toUpperCase() ===
            cleanedSymbol
        );


    /*
     * Already owns this stock
     */
    if (existingInvestment) {

      const newUnits =
        existingInvestment.shares +
        units;


      const newInvestedAmount =
        this.roundMoney(
          existingInvestment
            .investedAmount +
          totalCost
        );


      existingInvestment.shares =
        newUnits;


      existingInvestment.investedAmount =
        newInvestedAmount;


      /*
       * Weighted average buying price
       */
      existingInvestment.averageBuyPriceSgd =
        this.roundMoney(
          newInvestedAmount /
          newUnits
        );


      existingInvestment.lastPriceSgd =
        unitPrice;


      existingInvestment.currentValue =
        this.roundMoney(
          newUnits *
          unitPrice
        );

    } else {

      /*
       * First time buying this stock
       */
      const newInvestment:
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
          unitPrice,

        lastPriceSgd:
          unitPrice,
      };


      dashboardData
        .investments
        .push(
          newInvestment
        );
    }


    const saved =
      this.saveDashboardData(
        dashboardData
      );


    /*
     * Refund if saving fails
     */
    if (!saved) {

      this.savingsService
        .addToBalance(
          totalCost
        );


      return {
        success: false,
        message:
          'Unable to save the investment. Your money was returned to your balance.',
      };
    }


    return {
      success: true,

      message:
        `${units} ` +
        `${units === 1 ? 'unit' : 'units'} ` +
        `of ${cleanedName} purchased for ` +
        `S$${totalCost.toFixed(2)}.`,

      balance:
        debitResult.balance,

      shares:
        units,

      amountSgd:
        totalCost,
    };
  }


  /*
   * =====================================
   * SELL SELECTED NUMBER OF UNITS
   * =====================================
   *
   * Example:
   *
   * Own = 10 units
   * Sell = 3 units
   *
   * Remaining = 7 units
   */
  sellStockUnits(
    symbol: string,
    unitsToSell: number,
    currentPriceSgd: number
  ): InvestmentTransactionResult {

    const cleanedSymbol =
      symbol
        .trim()
        .toUpperCase();


    /*
     * WHOLE UNITS ONLY
     */
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


    const dashboardData =
      this.getDashboardData();


    /*
     * Make a backup so we can restore
     * everything if something fails.
     */
    const originalDashboardData:
      StoredDashboardData =
      JSON.parse(
        JSON.stringify(
          dashboardData
        )
      );


    const investmentIndex =
      dashboardData
        .investments
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
      dashboardData
        .investments[
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


    /*
     * Amount received from sale
     */
    const saleValue =
      this.roundMoney(
        unitsToSell *
        currentPriceSgd
      );


    /*
     * Original cost of units being sold
     *
     * Needed so remaining investment
     * profit/loss remains correct.
     */
    const costBasisSold =
      this.roundMoney(
        unitsToSell *
        investment.averageBuyPriceSgd
      );


    const remainingUnits =
      investment.shares -
      unitsToSell;


    /*
     * Selling ALL remaining units
     */
    if (
      remainingUnits === 0
    ) {

      dashboardData
        .investments
        .splice(
          investmentIndex,
          1
        );

    } else {

      /*
       * PARTIAL SELL
       */
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


      /*
       * Average buy price of
       * remaining units stays the same.
       */
      investment.averageBuyPriceSgd =
        this.roundMoney(
          investment.averageBuyPriceSgd
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


    /*
     * Save changed portfolio
     */
    const saved =
      this.saveDashboardData(
        dashboardData
      );


    if (!saved) {

      return {
        success: false,
        message:
          'Unable to save the stock sale.',
      };
    }


    /*
     * Add sale proceeds back
     * to user's available balance.
     */
    const creditResult =
      this.savingsService
        .addToBalance(
          saleValue
        );


    /*
     * Restore original portfolio
     * if balance update failed.
     */
    if (
      !creditResult.success
    ) {

      this.saveDashboardData(
        originalDashboardData
      );


      return {
        success: false,
        message:
          'Unable to return the sale proceeds to your account.',
      };
    }


    return {
      success: true,

      message:
        `${unitsToSell} ` +
        `${unitsToSell === 1 ? 'unit' : 'units'} ` +
        `of ${investment.name} sold for ` +
        `S$${saleValue.toFixed(2)}.`,

      balance:
        creditResult.balance,

      shares:
        unitsToSell,

      amountSgd:
        saleValue,
    };
  }


  /*
   * =====================================
   * MONTHLY BUDGET
   * =====================================
   */

  getMonthlyBudget():
    number {

    return this
      .getDashboardData()
      .monthlyBudget;
  }


  setMonthlyBudget(
    amount: number
  ): boolean {

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {

      return false;
    }


    const dashboardData =
      this.getDashboardData();


    dashboardData.monthlyBudget =
      this.roundMoney(
        amount
      );


    this.saveDashboardData(
      dashboardData
    );


    return true;
  }


  /*
   * =====================================
   * BILLS
   * =====================================
   */

  getUpcomingBills():
    DashboardBill[] {

    return this
      .getDashboardData()
      .upcomingBills
      .map(
        (bill) => ({
          ...bill,
        })
      );
  }


  markBillPaid(
    billId: string
  ): boolean {

    const dashboardData =
      this.getDashboardData();


    const bill =
      dashboardData
        .upcomingBills
        .find(
          (item) =>
            item.id ===
            billId
        );


    if (!bill) {

      return false;
    }


    bill.paid =
      true;


    this.saveDashboardData(
      dashboardData
    );


    return true;
  }


  /*
   * =====================================
   * CASHBACK
   * =====================================
   */

  getCashbackBalance():
    number {

    const storedValue =
      localStorage.getItem(
        `cashbackBalance_${this.getUsername()}`
      );


    const amount =
      Number(
        storedValue
      );


    return (
      Number.isFinite(
        amount
      ) &&
      amount >= 0
        ? amount
        : 0
    );
  }


  /*
   * =====================================
   * FINANCIAL TIPS
   * =====================================
   */

  getFinancialTips():
    string[] {

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
   * LOAD DASHBOARD DATA
   * =====================================
   */

  private getDashboardData():
    StoredDashboardData {

    try {

      const storedValue =
        localStorage.getItem(
          this.getStorageKey()
        );


      if (!storedValue) {

        const defaultData =
          this.createDefaultDashboardData();


        this.saveDashboardData(
          defaultData
        );


        return defaultData;
      }


      const parsedValue:
        unknown =
        JSON.parse(
          storedValue
        );


      if (
        !this.isStoredDashboardData(
          parsedValue
        )
      ) {

        const defaultData =
          this.createDefaultDashboardData();


        this.saveDashboardData(
          defaultData
        );


        return defaultData;
      }


      const normalizedData =
        this.normalizeDashboardData(
          parsedValue
        );


      this.saveDashboardData(
        normalizedData
      );


      return normalizedData;

    } catch (error) {

      console.warn(
        'Unable to load dashboard data:',
        error
      );


      return this
        .createDefaultDashboardData();
    }
  }


  /*
   * =====================================
   * SUPPORT OLD SAVED DATA
   * =====================================
   */

  private normalizeDashboardData(
    data: StoredDashboardData
  ): StoredDashboardData {

    return {

      selectedItems:
        data.selectedItems,

      investments:
        data.investments.map(
          (investment) =>
            this.normalizeInvestment(
              investment
            )
        ),

      monthlyBudget:
        data.monthlyBudget,

      upcomingBills:
        data.upcomingBills,
    };
  }


  private normalizeInvestment(
    investment:
      DashboardInvestment
  ): DashboardInvestment {

    const symbol =
      String(
        investment.symbol ??
        ''
      )
        .trim()
        .toUpperCase();


    const investedAmount =
      Number(
        investment.investedAmount
      );


    const currentValue =
      Number(
        investment.currentValue
      );


    let shares =
      Number(
        investment.shares
      );


    let lastPrice =
      Number(
        investment.lastPriceSgd
      );


    let averagePrice =
      Number(
        investment.averageBuyPriceSgd
      );


    /*
     * OLD records might not have
     * units saved.
     */
    if (
      !Number.isFinite(
        shares
      ) ||
      shares <= 0
    ) {

      const referencePrice =
        this.getLegacyReferencePrice(
          symbol
        );


      shares =
        referencePrice > 0
          ? Math.max(
              1,
              Math.round(
                currentValue /
                referencePrice
              )
            )
          : 1;
    }


    /*
     * Whole units only
     */
    shares =
      Math.max(
        1,
        Math.round(
          shares
        )
      );


    if (
      !Number.isFinite(
        lastPrice
      ) ||
      lastPrice <= 0
    ) {

      lastPrice =
        shares > 0
          ? currentValue /
            shares
          : 0;
    }


    if (
      !Number.isFinite(
        averagePrice
      ) ||
      averagePrice <= 0
    ) {

      averagePrice =
        shares > 0
          ? investedAmount /
            shares
          : 0;
    }


    return {
      id:
        String(
          investment.id ??
          `investment-${Date.now()}`
        ),

      name:
        String(
          investment.name ??
          symbol
        ),

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
          averagePrice
        ),

      lastPriceSgd:
        this.roundMoney(
          lastPrice
        ),
    };
  }


  private getLegacyReferencePrice(
    symbol: string
  ): number {

    switch (
      symbol.toUpperCase()
    ) {

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
   * SAVE DASHBOARD
   * =====================================
   */

  private saveDashboardData(
    dashboardData:
      StoredDashboardData
  ): boolean {

    try {

      localStorage.setItem(
        this.getStorageKey(),

        JSON.stringify(
          dashboardData
        )
      );


      return true;

    } catch (error) {

      console.warn(
        'Unable to save dashboard data:',
        error
      );


      return false;
    }
  }


  /*
   * =====================================
   * DEFAULT DATA
   * =====================================
   */

  private createDefaultDashboardData():
    StoredDashboardData {

    return {

      selectedItems:
        this.getLegacySelections(),


      investments: [

        {
          id:
            'apple-investment',

          name:
            'Apple',

          symbol:
            'AAPL',

          investedAmount:
            1000,

          currentValue:
            1100,

          shares:
            4,

          averageBuyPriceSgd:
            250,

          lastPriceSgd:
            275,
        },


        {
          id:
            'nvidia-investment',

          name:
            'NVIDIA',

          symbol:
            'NVDA',

          investedAmount:
            1500,

          currentValue:
            1650,

          shares:
            6,

          averageBuyPriceSgd:
            250,

          lastPriceSgd:
            275,
        },


        {
          id:
            'tesla-investment',

          name:
            'Tesla',

          symbol:
            'TSLA',

          investedAmount:
            1000,

          currentValue:
            950,

          shares:
            2,

          averageBuyPriceSgd:
            500,

          lastPriceSgd:
            475,
        },

      ],


      monthlyBudget:
        1500,


      upcomingBills: [

        {
          id:
            'mobile-bill',

          name:
            'Mobile Bill',

          amount:
            78,

          dueDate:
            this.createFutureDate(
              5
            ),

          paid:
            false,
        },


        {
          id:
            'internet-bill',

          name:
            'Internet Bill',

          amount:
            49.90,

          dueDate:
            this.createFutureDate(
              10
            ),

          paid:
            false,
        },


        {
          id:
            'subscription-bill',

          name:
            'Streaming Subscription',

          amount:
            19.98,

          dueDate:
            this.createFutureDate(
              15
            ),

          paid:
            false,
        },

      ],
    };
  }


  /*
   * =====================================
   * OLD DASHBOARD SETTINGS
   * =====================================
   */

  private getLegacySelections():
    DashboardItemId[] {

    try {

      const oldValue =
        localStorage.getItem(
          'dashboardItems'
        );


      if (!oldValue) {

        return [
          'savings-goals',
          'investment-tracking',
        ];
      }


      const parsedValue:
        unknown =
        JSON.parse(
          oldValue
        );


      if (
        !Array.isArray(
          parsedValue
        )
      ) {

        return [
          'savings-goals',
          'investment-tracking',
        ];
      }


      const validItems =
        parsedValue
          .filter(
            (
              itemId
            ): itemId is DashboardItemId =>
              typeof itemId ===
                'string' &&
              this.isDashboardItemId(
                itemId
              )
          )
          .slice(
            0,
            2
          );


      return (
        validItems.length > 0
          ? validItems
          : ['savings-goals']
      );

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

    const date =
      new Date();


    date.setDate(
      date.getDate() +
      daysFromNow
    );


    return date
      .toISOString();
  }


  private getStorageKey():
    string {

    return (
      `dashboardData_${this.getUsername()}`
    );
  }


  private getUsername():
    string {

    return (
      this.authService
        .getCurrentUser()
        ?.username
        .trim()
        .toLowerCase()
      ??
      'guest'
    );
  }


  private isDashboardItemId(
    value: string
  ): value is DashboardItemId {

    return (
      this.allowedItems
        .includes(
          value as DashboardItemId
        )
    );
  }


  private isStoredDashboardData(
    value: unknown
  ): value is StoredDashboardData {

    if (
      !value ||
      typeof value !==
        'object'
    ) {

      return false;
    }


    const data =
      value as
        Partial<StoredDashboardData>;


    return (
      Array.isArray(
        data.selectedItems
      )

      &&

      Array.isArray(
        data.investments
      )

      &&

      typeof data.monthlyBudget ===
        'number'

      &&

      Array.isArray(
        data.upcomingBills
      )
    );
  }


  private roundMoney(
    amount: number
  ): number {

    return (
      Math.round(
        (
          amount +
          Number.EPSILON
        ) * 100
      ) / 100
    );
  }
}