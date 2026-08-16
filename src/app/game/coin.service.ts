import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, runTransaction } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

/*
 * Shared with RewardsService, which needs to spend coins and award a
 * voucher as a single atomic transaction when redeeming.
 */
export const GAME_COINS_COLLECTION = 'gameCoins';

@Injectable({
  providedIn: 'root',
})
export class CoinService {
  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getCoins(): Promise<number> {
    const snapshot = await getDoc(this.coinsRef());
    return snapshot.exists() && typeof snapshot.data()['coins'] === 'number'
      ? (snapshot.data()['coins'] as number)
      : 0;
  }

  async addCoins(amount: number): Promise<number> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return this.getCoins();
    }

    const amountToAdd = Math.floor(amount);
    const ref = this.coinsRef();

    return runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const currentCoins = snapshot.exists() && typeof snapshot.data()['coins'] === 'number'
        ? (snapshot.data()['coins'] as number)
        : 0;

      const updatedCoins = currentCoins + amountToAdd;
      transaction.set(ref, { coins: updatedCoins });

      return updatedCoins;
    });
  }

  async spendCoins(amount: number): Promise<{
    success: boolean;
    remainingCoins: number;
    message: string;
  }> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        remainingCoins: await this.getCoins(),
        message: 'Enter a valid coin amount.',
      };
    }

    const amountToSpend = Math.floor(amount);
    const ref = this.coinsRef();

    return runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const currentCoins = snapshot.exists() && typeof snapshot.data()['coins'] === 'number'
        ? (snapshot.data()['coins'] as number)
        : 0;

      if (amountToSpend > currentCoins) {
        return {
          success: false,
          remainingCoins: currentCoins,
          message: 'You do not have enough coins.',
        };
      }

      const updatedCoins = currentCoins - amountToSpend;
      transaction.set(ref, { coins: updatedCoins });

      return {
        success: true,
        remainingCoins: updatedCoins,
        message: `${amountToSpend} coins were used.`,
      };
    });
  }

  private coinsRef() {
    return doc(this.firestore, GAME_COINS_COLLECTION, this.normalizeUsername());
  }

  private normalizeUsername(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.username.trim().toLowerCase() ?? 'guest';
  }
}
