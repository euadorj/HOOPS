import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

export type CategoryType = 'in' | 'out';

export interface CategoryEntry {
  id: string;
  name: string;
  color: string;
  amount: number;
  type: CategoryType;
}

export interface TxItem {
  title: string;
  subtitle: string;
  amount: number;
  color: string;
}

export interface InsightsData {
  accountTitle: string;
  masked: string;
  todayTransactions: TxItem[];
  categoriesByMonth: Record<number, CategoryEntry[]>;
}

@Injectable({
  providedIn: 'root',
})
export class BenedictInsightsService {
  private readonly collectionName = 'benedictInsights';

  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getInsightsData(): Promise<InsightsData> {
    const ref = this.docRef();
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const defaultData = this.createDefaultData();
      await setDoc(ref, defaultData);
      return defaultData;
    }

    return this.toInsightsData(snapshot.data());
  }

  async saveCategoriesByMonth(categoriesByMonth: Record<number, CategoryEntry[]>): Promise<void> {
    await setDoc(this.docRef(), { categoriesByMonth }, { merge: true });
  }

  async saveTodayTransactions(todayTransactions: TxItem[]): Promise<void> {
    await setDoc(this.docRef(), { todayTransactions }, { merge: true });
  }

  private docRef() {
    return doc(this.firestore, this.collectionName, this.normalizedUsername());
  }

  private normalizedUsername(): string {
    return this.authService.getCurrentUser()?.username.trim().toLowerCase() ?? 'guest';
  }

  private toInsightsData(data: Record<string, unknown> | undefined): InsightsData {
    if (!data) {
      return this.createDefaultData();
    }

    return {
      accountTitle: typeof data['accountTitle'] === 'string' ? (data['accountTitle'] as string) : 'My Account',
      masked: typeof data['masked'] === 'string' ? (data['masked'] as string) : '•••• •••• •••• ••••',
      todayTransactions: this.toTxItems(data['todayTransactions']),
      categoriesByMonth: (data['categoriesByMonth'] as Record<number, CategoryEntry[]>) || {},
    };
  }

  private toTxItems(value: unknown): TxItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .filter(
        (item) =>
          typeof item['title'] === 'string' &&
          typeof item['subtitle'] === 'string' &&
          typeof item['amount'] === 'number' &&
          typeof item['color'] === 'string'
      )
      .map((item) => ({
        title: item['title'] as string,
        subtitle: item['subtitle'] as string,
        amount: item['amount'] as number,
        color: item['color'] as string,
      }));
  }

  private createDefaultData(): InsightsData {
    return {
      accountTitle: 'Amazon Protium',
      masked: '4758 •••• •••• 9018',

      todayTransactions: [
        { title: 'Water Bill', subtitle: 'Today', amount: -280, color: '#ef4444' },
        {
          title: 'Income: Salary October',
          subtitle: 'Today',
          amount: 1200,
          color: '#22c55e',
        },
        {
          title: 'Groceries - Family Mart',
          subtitle: 'Today',
          amount: -84,
          color: '#f59e0b',
        },
        {
          title: 'Ride Share Rebate',
          subtitle: 'Today',
          amount: 36,
          color: '#3b82f6',
        },
        {
          title: 'Mobile Plan Auto Debit',
          subtitle: 'Today',
          amount: -58,
          color: '#a855f7',
        },
      ],

      categoriesByMonth: {
        0: [
          { id: 'jan-shopping', name: 'Shopping', color: '#f59e0b', amount: 90, type: 'out' },
          { id: 'jan-telemarket', name: 'Telemarket', color: '#ef4444', amount: 70, type: 'out' },
          { id: 'jan-groceries', name: 'Groceries', color: '#22c55e', amount: 120, type: 'in' },
          { id: 'jan-transport', name: 'Transport', color: '#3b82f6', amount: 100, type: 'in' },
        ],
        1: [
          { id: 'feb-shopping', name: 'Shopping', color: '#f59e0b', amount: 140, type: 'out' },
          { id: 'feb-telemarket', name: 'Telemarket', color: '#ef4444', amount: 180, type: 'out' },
          { id: 'feb-groceries', name: 'Groceries', color: '#22c55e', amount: 190, type: 'in' },
          { id: 'feb-transport', name: 'Transport', color: '#3b82f6', amount: 130, type: 'in' },
        ],
        2: [
          { id: 'mar-rent', name: 'Rent', color: '#a855f7', amount: 210, type: 'out' },
          { id: 'mar-shopping', name: 'Shopping', color: '#f59e0b', amount: 180, type: 'out' },
          { id: 'mar-salary', name: 'Salary', color: '#22c55e', amount: 260, type: 'in' },
          { id: 'mar-freelance', name: 'Freelance', color: '#10b981', amount: 80, type: 'in' },
        ],
        3: [
          { id: 'apr-food', name: 'Food', color: '#ef4444', amount: 220, type: 'out' },
          { id: 'apr-subs', name: 'Subscriptions', color: '#f97316', amount: 100, type: 'out' },
          { id: 'apr-salary', name: 'Salary', color: '#22c55e', amount: 290, type: 'in' },
          { id: 'apr-bonus', name: 'Bonus', color: '#3b82f6', amount: 50, type: 'in' },
        ],
        4: [
          { id: 'may-dining', name: 'Dining', color: '#ef4444', amount: 170, type: 'out' },
          { id: 'may-shopping', name: 'Shopping', color: '#f59e0b', amount: 190, type: 'out' },
          { id: 'may-salary', name: 'Salary', color: '#22c55e', amount: 210, type: 'in' },
          { id: 'may-refund', name: 'Refund', color: '#60a5fa', amount: 80, type: 'in' },
        ],
        5: [
          { id: 'jun-travel', name: 'Travel', color: '#f43f5e', amount: 240, type: 'out' },
          { id: 'jun-shopping', name: 'Shopping', color: '#f59e0b', amount: 190, type: 'out' },
          { id: 'jun-salary', name: 'Salary', color: '#22c55e', amount: 260, type: 'in' },
          { id: 'jun-cashback', name: 'Cashback', color: '#3b82f6', amount: 50, type: 'in' },
        ],
      },
    };
  }
}
