import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, runTransaction, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

export type ExpiringItemTone = 'danger' | 'warning' | 'primary' | 'success' | 'medium';

export interface ExpiringItem {
  id: string;
  title: string;
  amount?: number;
  badgeText?: string;
  badgeColor?: ExpiringItemTone;
  icon: string;
  tone?: ExpiringItemTone;
}

export interface CashbackData {
  lifetimeEarnings: number;
  todayItems: ExpiringItem[];
  yesterdayItems: ExpiringItem[];
}

@Injectable({
  providedIn: 'root',
})
export class BenedictCashbackService {
  private readonly collectionName = 'benedictCashback';

  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getCashbackData(): Promise<CashbackData> {
    const ref = this.docRef();
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const defaultData = this.createDefaultData();
      await setDoc(ref, defaultData);
      return defaultData;
    }

    return this.toCashbackData(snapshot.data());
  }

  async addLifetimeEarnings(amount: number): Promise<void> {
    const ref = this.docRef();

    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists() ? this.toCashbackData(snapshot.data()) : this.createDefaultData();

      transaction.set(
        ref,
        { lifetimeEarnings: current.lifetimeEarnings + amount },
        { merge: true }
      );
    });
  }

  async redeemItem(period: 'today' | 'yesterday', itemId: string): Promise<void> {
    const ref = this.docRef();
    const field = period === 'today' ? 'todayItems' : 'yesterdayItems';

    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists() ? this.toCashbackData(snapshot.data()) : this.createDefaultData();

      const items = current[field].map((item) =>
        item.id === itemId
          ? { ...item, badgeText: 'Confirmed', badgeColor: 'success' as ExpiringItemTone, tone: 'success' as ExpiringItemTone }
          : item
      );

      transaction.set(ref, { [field]: items }, { merge: true });
    });
  }

  private docRef() {
    return doc(this.firestore, this.collectionName, this.normalizedUsername());
  }

  private normalizedUsername(): string {
    return this.authService.getCurrentUser()?.username.trim().toLowerCase() ?? 'guest';
  }

  private toCashbackData(data: Record<string, unknown> | undefined): CashbackData {
    if (!data) {
      return this.createDefaultData();
    }

    return {
      lifetimeEarnings: typeof data['lifetimeEarnings'] === 'number' ? (data['lifetimeEarnings'] as number) : 0,
      todayItems: this.toExpiringItems(data['todayItems']),
      yesterdayItems: this.toExpiringItems(data['yesterdayItems']),
    };
  }

  private toExpiringItems(value: unknown): ExpiringItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .filter((item) => typeof item['id'] === 'string' && typeof item['title'] === 'string' && typeof item['icon'] === 'string')
      .map((item) => ({
        id: item['id'] as string,
        title: item['title'] as string,
        icon: item['icon'] as string,
        amount: typeof item['amount'] === 'number' ? (item['amount'] as number) : undefined,
        badgeText: typeof item['badgeText'] === 'string' ? (item['badgeText'] as string) : undefined,
        badgeColor: item['badgeColor'] as ExpiringItemTone | undefined,
        tone: item['tone'] as ExpiringItemTone | undefined,
      }));
  }

  private createDefaultData(): CashbackData {
    return {
      lifetimeEarnings: 154.23,

      todayItems: [
        {
          id: 'toastbox',
          title: 'ToastBox',
          badgeText: 'Yet to redeem',
          badgeColor: 'primary',
          icon: 'ticket-outline',
          tone: 'primary',
        },
      ],

      yesterdayItems: [
        {
          id: 'ntuc',
          title: 'NTUC Fairprice',
          amount: 43.47,
          badgeText: 'Yet to redeem',
          badgeColor: 'medium',
          icon: 'cart-outline',
          tone: 'medium',
        },
        {
          id: 'kopitiam',
          title: 'Kopitiam',
          amount: 0,
          badgeText: 'Yet to redeem',
          badgeColor: 'warning',
          icon: 'restaurant-outline',
          tone: 'warning',
        },
        {
          id: 'simplygo',
          title: 'SimplyGo',
          amount: 25.21,
          badgeText: 'Confirmed',
          badgeColor: 'success',
          icon: 'card-outline',
          tone: 'success',
        },
        {
          id: 'mlimited',
          title: 'ML Limited',
          badgeText: "Oops! We can’t verify this.",
          badgeColor: 'danger',
          icon: 'shield-checkmark-outline',
          tone: 'danger',
        },
      ],
    };
  }
}
