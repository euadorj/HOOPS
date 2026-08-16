import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';


export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
}


export interface MerchantPayment {
  id: string;
  merchantName: string;
  amount: number;
  paidAt: number;
}


export interface MerchantPaymentResult {
  success: boolean;
  message: string;
  balance?: number;
  payment?: MerchantPayment;
}


export interface TransferResult {
  success: boolean;
  message: string;
  senderBalance?: number;
  recipientUsername?: string;
}


export interface FinanceData {
  balance: number;
  goals: SavingsGoal[];
}


export interface SavingsResult {
  success: boolean;
  message: string;
  balance?: number;
}


/*
 * Shared with DashboardService, which needs to read/write the same
 * per-user balance document inside its own buy/sell stock transactions.
 */
export const FINANCE_COLLECTION = 'financeAccounts';


@Injectable({
  providedIn: 'root',
})
export class SavingsService {
  private readonly financeCollection = FINANCE_COLLECTION;
  private readonly paymentsCollection = 'merchantPayments';

  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {}


  /*
   * GET CURRENT USER FINANCE DATA
   */
  async getFinanceData(): Promise<FinanceData> {
    return this.getFinanceDataForUsername(this.currentUsername());
  }


  /*
   * CREATE SAVINGS GOAL
   */
  async createGoal(name: string, targetAmount: number): Promise<SavingsResult> {
    const cleanedName = name.trim();

    if (!cleanedName) {
      return { success: false, message: 'Goal name is required.' };
    }

    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return { success: false, message: 'Enter a valid target amount.' };
    }

    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);

      const duplicateGoal = financeData.goals.some(
        (goal) => goal.name.toLowerCase() === cleanedName.toLowerCase()
      );

      if (duplicateGoal) {
        return { success: false, message: 'A savings goal with this name already exists.' };
      }

      const availableColors = ['success', 'warning', 'tertiary', 'primary', 'secondary'];
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}`,
        name: cleanedName,
        targetAmount: this.roundMoney(targetAmount),
        savedAmount: 0,
        color: availableColors[financeData.goals.length % availableColors.length],
      };

      financeData.goals.push(newGoal);
      transaction.set(ref, financeData);

      return { success: true, message: 'Savings goal created successfully.' };
    });
  }


  /*
   * UPDATE SAVINGS GOAL
   */
  async updateGoal(goalId: string, name: string, targetAmount: number): Promise<SavingsResult> {
    const cleanedName = name.trim();
    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);
      const goal = financeData.goals.find((currentGoal) => currentGoal.id === goalId);

      if (!goal) {
        return { success: false, message: 'Savings goal was not found.' };
      }

      if (!cleanedName) {
        return { success: false, message: 'Goal name is required.' };
      }

      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        return { success: false, message: 'Enter a valid target amount.' };
      }

      if (targetAmount < goal.savedAmount) {
        return { success: false, message: 'The target cannot be lower than the amount already saved.' };
      }

      const duplicateGoal = financeData.goals.some(
        (currentGoal) => currentGoal.id !== goalId && currentGoal.name.toLowerCase() === cleanedName.toLowerCase()
      );

      if (duplicateGoal) {
        return { success: false, message: 'A savings goal with this name already exists.' };
      }

      goal.name = cleanedName;
      goal.targetAmount = this.roundMoney(targetAmount);
      transaction.set(ref, financeData);

      return { success: true, message: 'Savings goal updated successfully.' };
    });
  }


  /*
   * DEPOSIT MONEY INTO SAVINGS GOAL
   */
  async depositToGoal(goalId: string, amount: number): Promise<SavingsResult> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Enter an amount greater than $0.' };
    }

    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);
      const goal = financeData.goals.find((currentGoal) => currentGoal.id === goalId);

      if (!goal) {
        return { success: false, message: 'Savings goal was not found.' };
      }

      if (amount > financeData.balance) {
        return { success: false, message: 'You do not have enough available balance.' };
      }

      const amountRemaining = goal.targetAmount - goal.savedAmount;

      if (amountRemaining <= 0) {
        return { success: false, message: 'This savings goal is already completed.' };
      }

      if (amount > amountRemaining) {
        return {
          success: false,
          message: `You can only add up to $${amountRemaining.toFixed(2)} to this goal.`,
        };
      }

      financeData.balance = this.roundMoney(financeData.balance - amount);
      goal.savedAmount = this.roundMoney(goal.savedAmount + amount);
      transaction.set(ref, financeData);

      return {
        success: true,
        message: `$${amount.toFixed(2)} was added to ${goal.name}.`,
        balance: financeData.balance,
      };
    });
  }


  /*
   * DELETE SAVINGS GOAL
   *
   * Saved money is returned to the user's balance.
   */
  async deleteGoal(goalId: string): Promise<SavingsResult> {
    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);
      const goalIndex = financeData.goals.findIndex((goal) => goal.id === goalId);

      if (goalIndex === -1) {
        return { success: false, message: 'Savings goal was not found.' };
      }

      const deletedGoal = financeData.goals[goalIndex];
      financeData.balance = this.roundMoney(financeData.balance + deletedGoal.savedAmount);
      financeData.goals.splice(goalIndex, 1);
      transaction.set(ref, financeData);

      return {
        success: true,
        message: `${deletedGoal.name} was deleted. Its saved money was returned to your balance.`,
        balance: financeData.balance,
      };
    });
  }


  /*
   * TOTAL SAVINGS
   */
  getTotalSaved(financeData: FinanceData): number {
    const total = financeData.goals.reduce((currentTotal, goal) => currentTotal + goal.savedAmount, 0);
    return this.roundMoney(total);
  }


  /*
   * =====================================
   * INVESTING FUNCTIONS
   * =====================================
   */

  /*
   * DEDUCT MONEY FROM AVAILABLE BALANCE
   * Used when the user BUYS stocks.
   */
  async deductFromBalance(amount: number): Promise<SavingsResult> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return { success: false, message: 'You must be signed in.' };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Enter an amount greater than S$0.' };
    }

    const roundedAmount = this.roundMoney(amount);
    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);

      if (roundedAmount > financeData.balance) {
        return { success: false, message: 'You do not have enough available balance.' };
      }

      financeData.balance = this.roundMoney(financeData.balance - roundedAmount);
      transaction.set(ref, financeData);

      return {
        success: true,
        message: `S$${roundedAmount.toFixed(2)} was deducted from your balance.`,
        balance: financeData.balance,
      };
    });
  }


  /*
   * ADD MONEY BACK TO AVAILABLE BALANCE
   * Used when stocks are sold, or an investment fails and money needs to be returned.
   */
  async addToBalance(amount: number): Promise<SavingsResult> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return { success: false, message: 'You must be signed in.' };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Invalid amount.' };
    }

    const roundedAmount = this.roundMoney(amount);
    const ref = this.financeRef(this.currentUsername());

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, ref);
      financeData.balance = this.roundMoney(financeData.balance + roundedAmount);
      transaction.set(ref, financeData);

      return {
        success: true,
        message: `S$${roundedAmount.toFixed(2)} was added to your balance.`,
        balance: financeData.balance,
      };
    });
  }


  /*
   * =====================================
   * TRANSFER MONEY
   * =====================================
   */
  async transferMoney(recipientInput: string, amount: number): Promise<TransferResult> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return { success: false, message: 'You must be signed in.' };
    }

    const recipientUsername = await this.authService.getAccountUsername(recipientInput);

    if (!recipientUsername) {
      return { success: false, message: 'Recipient username does not exist.' };
    }

    const senderUsername = currentUser.username;

    if (senderUsername.trim().toLowerCase() === recipientUsername.trim().toLowerCase()) {
      return { success: false, message: 'You cannot transfer money to your own account.' };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Enter an amount greater than $0.' };
    }

    const roundedAmount = this.roundMoney(amount);
    const senderRef = this.financeRef(senderUsername);
    const recipientRef = this.financeRef(recipientUsername);

    return runTransaction(this.firestore, async (transaction) => {
      const senderData = await this.readFinanceData(transaction, senderRef);

      if (roundedAmount > senderData.balance) {
        return { success: false, message: 'You do not have enough available balance.' };
      }

      const recipientData = await this.readFinanceData(transaction, recipientRef);

      senderData.balance = this.roundMoney(senderData.balance - roundedAmount);
      recipientData.balance = this.roundMoney(recipientData.balance + roundedAmount);

      transaction.set(senderRef, senderData);
      transaction.set(recipientRef, recipientData);

      return {
        success: true,
        message: `$${roundedAmount.toFixed(2)} was transferred to ${recipientUsername}.`,
        senderBalance: senderData.balance,
        recipientUsername,
      };
    });
  }


  /*
   * =====================================
   * MERCHANT PAYMENT
   * =====================================
   */
  async payMerchant(merchantName: string, amount: number): Promise<MerchantPaymentResult> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return { success: false, message: 'You must be signed in.' };
    }

    const cleanedMerchantName = merchantName.trim();

    if (!cleanedMerchantName) {
      return { success: false, message: 'Please select a merchant.' };
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Enter an amount greater than $0.' };
    }

    const roundedAmount = this.roundMoney(amount);
    const financeRef = this.financeRef(this.currentUsername());
    const paymentRef = doc(collection(this.firestore, this.paymentsCollection));

    const payment: MerchantPayment = {
      id: paymentRef.id,
      merchantName: cleanedMerchantName,
      amount: roundedAmount,
      paidAt: Date.now(),
    };

    return runTransaction(this.firestore, async (transaction) => {
      const financeData = await this.readFinanceData(transaction, financeRef);

      if (roundedAmount > financeData.balance) {
        return { success: false, message: 'You do not have enough available balance.' };
      }

      financeData.balance = this.roundMoney(financeData.balance - roundedAmount);
      transaction.set(financeRef, financeData);
      transaction.set(paymentRef, { ...payment, username: this.currentUsername() });

      return {
        success: true,
        message: `$${roundedAmount.toFixed(2)} was paid to ${cleanedMerchantName}.`,
        balance: financeData.balance,
        payment,
      };
    });
  }


  /*
   * =====================================
   * PAYMENT HISTORY
   * =====================================
   */
  async getPaymentHistory(): Promise<MerchantPayment[]> {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      return [];
    }

    const paymentsQuery = query(
      collection(this.firestore, this.paymentsCollection),
      where('username', '==', this.currentUsername())
    );
    const snapshot = await getDocs(paymentsQuery);

    return snapshot.docs
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          merchantName: (data['merchantName'] as string) || '',
          amount: (data['amount'] as number) || 0,
          paidAt: (data['paidAt'] as number) || 0,
        };
      })
      .sort((a, b) => b.paidAt - a.paidAt);
  }


  /*
   * =====================================
   * USER FINANCE DATA
   * =====================================
   */
  async getFinanceDataForUsername(username: string): Promise<FinanceData> {
    const ref = this.financeRef(username);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const defaultData = this.createDefaultFinanceData();
      await setDoc(ref, defaultData);
      return defaultData;
    }

    return this.toFinanceData(snapshot.data());
  }


  private async readFinanceData(
    transaction: Parameters<Parameters<typeof runTransaction>[1]>[0],
    ref: ReturnType<SavingsService['financeRef']>
  ): Promise<FinanceData> {
    const snapshot = await transaction.get(ref);
    return snapshot.exists() ? this.toFinanceData(snapshot.data()) : this.createDefaultFinanceData();
  }


  private financeRef(username: string) {
    return doc(this.firestore, this.financeCollection, this.normalizeUsername(username));
  }


  private toFinanceData(data: Record<string, unknown> | undefined): FinanceData {
    if (!data || typeof data['balance'] !== 'number' || !Array.isArray(data['goals'])) {
      return this.createDefaultFinanceData();
    }
    return {
      balance: data['balance'] as number,
      goals: data['goals'] as SavingsGoal[],
    };
  }


  private currentUsername(): string {
    return this.authService.getCurrentUser()?.username ?? 'guest';
  }


  private normalizeUsername(username: string): string {
    return (username || '').trim().toLowerCase() || 'guest';
  }


  /*
   * DEFAULT USER ACCOUNT
   */
  private createDefaultFinanceData(): FinanceData {
    return {
      /*
       * Starting demo balance
       */
      balance: 900000,

      goals: [
        {
          id: 'emergency-fund',
          name: 'Emergency Fund',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'success',
        },
        {
          id: 'vacation',
          name: 'Vacation',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'warning',
        },
        {
          id: 'new-laptop',
          name: 'New Laptop',
          targetAmount: 2000,
          savedAmount: 500,
          color: 'tertiary',
        },
      ],
    };
  }


  /*
   * MONEY ROUNDING
   */
  private roundMoney(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
