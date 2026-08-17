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
  where,
} from '@angular/fire/firestore';

import {
  AuthService,
} from '../auth/auth.service';


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


export const FINANCE_COLLECTION =
  'financeAccounts';


@Injectable({
  providedIn: 'root',
})
export class SavingsService {

  private readonly financeCollection =
    FINANCE_COLLECTION;


  private readonly paymentsCollection =
    'merchantPayments';


  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {}


  /*
   * =====================================
   * GET FINANCE DATA
   * =====================================
   */

  async getFinanceData():
    Promise<FinanceData> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return this
        .createDefaultFinanceData();
    }


    return this
      .getFinanceDataForUsername(
        username
      );
  }


  /*
   * =====================================
   * CREATE GOAL
   * =====================================
   */

  async createGoal(
    name: string,
    targetAmount: number
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const cleanedName =
      name.trim();


    if (!cleanedName) {

      return {
        success: false,
        message: 'Goal name is required.',
      };
    }


    if (
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter a valid target amount.',
      };
    }


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        const duplicateGoal =
          financeData.goals.some(
            (goal) =>
              goal.name
                .trim()
                .toLowerCase() ===
              cleanedName
                .toLowerCase()
          );


        if (duplicateGoal) {

          return {
            success: false,
            message:
              'A savings goal with this name already exists.',
          };
        }


        const availableColors = [
          'success',
          'warning',
          'tertiary',
          'primary',
          'secondary',
        ];


        const newGoal:
          SavingsGoal = {

          id:
            `goal-${Date.now()}`,

          name:
            cleanedName,

          targetAmount:
            this.roundMoney(
              targetAmount
            ),

          savedAmount:
            0,

          color:
            availableColors[
              financeData.goals.length %
              availableColors.length
            ],
        };


        financeData.goals.push(
          newGoal
        );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,
          message:
            'Savings goal created successfully.',
        };
      }
    );
  }


  /*
   * =====================================
   * UPDATE GOAL
   * =====================================
   */

  async updateGoal(
    goalId: string,
    name: string,
    targetAmount: number
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const cleanedName =
      name.trim();


    if (!cleanedName) {

      return {
        success: false,
        message: 'Goal name is required.',
      };
    }


    if (
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter a valid target amount.',
      };
    }


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        const goal =
          financeData.goals.find(
            (item) =>
              item.id === goalId
          );


        if (!goal) {

          return {
            success: false,
            message:
              'Savings goal was not found.',
          };
        }


        if (
          targetAmount <
          goal.savedAmount
        ) {

          return {
            success: false,
            message:
              'The target cannot be lower than the amount already saved.',
          };
        }


        const duplicate =
          financeData.goals.some(
            (item) =>
              item.id !== goalId &&
              item.name
                .trim()
                .toLowerCase() ===
              cleanedName
                .toLowerCase()
          );


        if (duplicate) {

          return {
            success: false,
            message:
              'A savings goal with this name already exists.',
          };
        }


        goal.name =
          cleanedName;


        goal.targetAmount =
          this.roundMoney(
            targetAmount
          );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,
          message:
            'Savings goal updated successfully.',
        };
      }
    );
  }


  /*
   * =====================================
   * DEPOSIT INTO GOAL
   * =====================================
   */

  async depositToGoal(
    goalId: string,
    amount: number
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter an amount greater than $0.',
      };
    }


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        const goal =
          financeData.goals.find(
            (item) =>
              item.id === goalId
          );


        if (!goal) {

          return {
            success: false,
            message:
              'Savings goal was not found.',
          };
        }


        if (
          amount >
          financeData.balance
        ) {

          return {
            success: false,
            message:
              'You do not have enough available balance.',
          };
        }


        const remaining =
          goal.targetAmount -
          goal.savedAmount;


        if (
          remaining <= 0
        ) {

          return {
            success: false,
            message:
              'This savings goal is already completed.',
          };
        }


        if (
          amount >
          remaining
        ) {

          return {
            success: false,
            message:
              `You can only add up to ` +
              `$${remaining.toFixed(2)} ` +
              `to this goal.`,
          };
        }


        financeData.balance =
          this.roundMoney(
            financeData.balance -
            amount
          );


        goal.savedAmount =
          this.roundMoney(
            goal.savedAmount +
            amount
          );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,

          message:
            `$${amount.toFixed(2)} was added to ${goal.name}.`,

          balance:
            financeData.balance,
        };
      }
    );
  }


  /*
   * =====================================
   * DELETE GOAL
   * =====================================
   */

  async deleteGoal(
    goalId: string
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        const index =
          financeData.goals.findIndex(
            (goal) =>
              goal.id === goalId
          );


        if (
          index === -1
        ) {

          return {
            success: false,
            message:
              'Savings goal was not found.',
          };
        }


        const goal =
          financeData.goals[index];


        financeData.balance =
          this.roundMoney(
            financeData.balance +
            goal.savedAmount
          );


        financeData.goals.splice(
          index,
          1
        );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,

          message:
            `${goal.name} was deleted. ` +
            `Its saved money was returned to your balance.`,

          balance:
            financeData.balance,
        };
      }
    );
  }


  /*
   * =====================================
   * TOTAL SAVED
   * =====================================
   */

  getTotalSaved(
    financeData: FinanceData
  ): number {

    const total =
      financeData.goals.reduce(
        (sum, goal) =>
          sum + goal.savedAmount,
        0
      );


    return this.roundMoney(
      total
    );
  }


  /*
   * =====================================
   * DEDUCT BALANCE
   * =====================================
   */

  async deductFromBalance(
    amount: number
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter an amount greater than S$0.',
      };
    }


    const roundedAmount =
      this.roundMoney(
        amount
      );


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        if (
          roundedAmount >
          financeData.balance
        ) {

          return {
            success: false,
            message:
              'You do not have enough available balance.',
          };
        }


        financeData.balance =
          this.roundMoney(
            financeData.balance -
            roundedAmount
          );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,

          message:
            `S$${roundedAmount.toFixed(2)} was deducted from your balance.`,

          balance:
            financeData.balance,
        };
      }
    );
  }


  /*
   * =====================================
   * ADD BALANCE
   * =====================================
   */

  async addToBalance(
    amount: number
  ): Promise<SavingsResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return {
        success: false,
        message: 'Invalid amount.',
      };
    }


    const roundedAmount =
      this.roundMoney(
        amount
      );


    const ref =
      this.financeRef(
        username
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            ref
          );


        financeData.balance =
          this.roundMoney(
            financeData.balance +
            roundedAmount
          );


        transaction.set(
          ref,
          financeData
        );


        return {
          success: true,

          message:
            `S$${roundedAmount.toFixed(2)} was added to your balance.`,

          balance:
            financeData.balance,
        };
      }
    );
  }


  /*
   * =====================================
   * TRANSFER
   * =====================================
   */

  async transferMoney(
    recipientInput: string,
    amount: number
  ): Promise<TransferResult> {

    await this.authService
      .authReady;


    const senderUsername =
      this.currentUsername();


    if (!senderUsername) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const recipientUsername =
      await this.authService
        .getAccountUsername(
          recipientInput
        );


    if (!recipientUsername) {

      return {
        success: false,
        message:
          'Recipient username does not exist.',
      };
    }


    if (
      senderUsername ===
      this.normalizeUsername(
        recipientUsername
      )
    ) {

      return {
        success: false,
        message:
          'You cannot transfer money to your own account.',
      };
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter an amount greater than $0.',
      };
    }


    const roundedAmount =
      this.roundMoney(
        amount
      );


    const senderRef =
      this.financeRef(
        senderUsername
      );


    const recipientRef =
      this.financeRef(
        recipientUsername
      );


    return runTransaction(
      this.firestore,
      async (transaction) => {

        /*
         * Both reads happen before writes.
         */
        const senderData =
          await this.readFinanceData(
            transaction,
            senderRef
          );


        const recipientData =
          await this.readFinanceData(
            transaction,
            recipientRef
          );


        if (
          roundedAmount >
          senderData.balance
        ) {

          return {
            success: false,
            message:
              'You do not have enough available balance.',
          };
        }


        senderData.balance =
          this.roundMoney(
            senderData.balance -
            roundedAmount
          );


        recipientData.balance =
          this.roundMoney(
            recipientData.balance +
            roundedAmount
          );


        transaction.set(
          senderRef,
          senderData
        );


        transaction.set(
          recipientRef,
          recipientData
        );


        return {
          success: true,

          message:
            `$${roundedAmount.toFixed(2)} was transferred to ${recipientUsername}.`,

          senderBalance:
            senderData.balance,

          recipientUsername,
        };
      }
    );
  }


  /*
   * =====================================
   * PAY MERCHANT
   * =====================================
   */

  async payMerchant(
    merchantName: string,
    amount: number
  ): Promise<MerchantPaymentResult> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return {
        success: false,
        message: 'You must be signed in.',
      };
    }


    const cleanedMerchantName =
      merchantName.trim();


    if (!cleanedMerchantName) {

      return {
        success: false,
        message:
          'Please select a merchant.',
      };
    }


    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {

      return {
        success: false,
        message:
          'Enter an amount greater than $0.',
      };
    }


    const roundedAmount =
      this.roundMoney(
        amount
      );


    const financeRef =
      this.financeRef(
        username
      );


    const paymentRef =
      doc(
        collection(
          this.firestore,
          this.paymentsCollection
        )
      );


    const payment:
      MerchantPayment = {

      id:
        paymentRef.id,

      merchantName:
        cleanedMerchantName,

      amount:
        roundedAmount,

      paidAt:
        Date.now(),
    };


    return runTransaction(
      this.firestore,
      async (transaction) => {

        const financeData =
          await this.readFinanceData(
            transaction,
            financeRef
          );


        if (
          roundedAmount >
          financeData.balance
        ) {

          return {
            success: false,
            message:
              'You do not have enough available balance.',
          };
        }


        financeData.balance =
          this.roundMoney(
            financeData.balance -
            roundedAmount
          );


        transaction.set(
          financeRef,
          financeData
        );


        transaction.set(
          paymentRef,
          {
            id: payment.id,
            merchantName: payment.merchantName,
            amount: payment.amount,
            paidAt: payment.paidAt,
            username,
          }
        );


        return {
          success: true,

          message:
            `$${roundedAmount.toFixed(2)} was paid to ${cleanedMerchantName}.`,

          balance:
            financeData.balance,

          payment,
        };
      }
    );
  }


  /*
   * =====================================
   * PAYMENT HISTORY
   * =====================================
   */

  async getPaymentHistory():
    Promise<MerchantPayment[]> {

    await this.authService
      .authReady;


    const username =
      this.currentUsername();


    if (!username) {

      return [];
    }


    const paymentsQuery =
      query(
        collection(
          this.firestore,
          this.paymentsCollection
        ),

        where(
          'username',
          '==',
          username
        )
      );


    const snapshot =
      await getDocs(
        paymentsQuery
      );


    const payments:
      MerchantPayment[] = [];


    snapshot.docs.forEach(
      (docSnapshot) => {

        const data =
          docSnapshot.data();


        const merchantName =
          typeof data['merchantName'] === 'string'
            ? data['merchantName']
            : '';


        const rawAmount =
          data['amount'];


        const rawPaidAt =
          data['paidAt'];


        const paymentAmount =
          typeof rawAmount === 'number'
            ? rawAmount
            : 0;


        const paidAt =
          typeof rawPaidAt === 'number'
            ? rawPaidAt
            : 0;


        payments.push({

          id:
            docSnapshot.id,

          merchantName,

          amount:
            paymentAmount,

          paidAt,
        });
      }
    );


    payments.sort(
      (a, b) =>
        b.paidAt -
        a.paidAt
    );


    return payments;
  }


  /*
   * =====================================
   * FINANCE DATA FOR USER
   * =====================================
   */

  async getFinanceDataForUsername(
    username: string
  ): Promise<FinanceData> {

    const normalizedUsername =
      this.normalizeUsername(
        username
      );


    if (!normalizedUsername) {

      return this
        .createDefaultFinanceData();
    }


    const ref =
      this.financeRef(
        normalizedUsername
      );


    const snapshot =
      await getDoc(
        ref
      );


    if (!snapshot.exists()) {

      const emptyData =
        this.createDefaultFinanceData();


      await setDoc(
        ref,
        emptyData
      );


      return emptyData;
    }


    return this.toFinanceData(
      snapshot.data()
    );
  }


  /*
   * =====================================
   * TRANSACTION DATA READER
   * =====================================
   */

  private async readFinanceData(
    transaction: any,
    ref: any
  ): Promise<FinanceData> {

    const snapshot =
      await transaction.get(
        ref
      );


    if (!snapshot.exists()) {

      return this
        .createDefaultFinanceData();
    }


    return this.toFinanceData(
      snapshot.data()
    );
  }


  /*
   * =====================================
   * FIRESTORE REFERENCE
   * =====================================
   */

  private financeRef(
    username: string
  ) {

    return doc(
      this.firestore,
      this.financeCollection,
      this.normalizeUsername(
        username
      )
    );
  }


  /*
   * =====================================
   * CONVERT FIRESTORE DATA
   * =====================================
   */

  private toFinanceData(
    data: any
  ): FinanceData {

    if (!data) {

      return this
        .createDefaultFinanceData();
    }


    const rawBalance =
      data['balance'];


    const rawGoals =
      data['goals'];


    const balance =
      typeof rawBalance === 'number' &&
      Number.isFinite(rawBalance)
        ? rawBalance
        : 0;


    const goals =
      Array.isArray(rawGoals)
        ? rawGoals
        : [];


    return {
      balance:
        this.roundMoney(
          balance
        ),

      goals,
    };
  }


  /*
   * =====================================
   * CURRENT USERNAME
   * =====================================
   */

  private currentUsername(): string {

    const currentUser =
      this.authService
        .getCurrentUser();


    if (!currentUser) {

      return '';
    }


    return this.normalizeUsername(
      currentUser.username
    );
  }


  /*
   * =====================================
   * NORMALIZE USERNAME
   * =====================================
   */

  private normalizeUsername(
    username: string
  ): string {

    return (
      username || ''
    )
      .trim()
      .toLowerCase();
  }


  /*
   * =====================================
   * EMPTY DEFAULT
   * =====================================
   */

  private createDefaultFinanceData():
    FinanceData {

    return {

      balance: 0,

      goals: [],
    };
  }


  /*
   * =====================================
   * MONEY ROUNDING
   * =====================================
   */

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