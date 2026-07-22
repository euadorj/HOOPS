import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class CoinService {
  private readonly coinSubject = new BehaviorSubject<number>(0);

  readonly coins$ = this.coinSubject.asObservable();

  constructor(private authService: AuthService) {
    this.refreshCoins();
  }

  getCoins(): number {
    const coins = this.readCoins();
    this.coinSubject.next(coins);

    return coins;
  }

  addCoins(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      return this.getCoins();
    }

    const currentCoins = this.readCoins();
    const updatedCoins = currentCoins + Math.floor(amount);

    this.saveCoins(updatedCoins);
    this.coinSubject.next(updatedCoins);

    return updatedCoins;
  }

  spendCoins(amount: number): {
    success: boolean;
    remainingCoins: number;
    message: string;
  } {
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        remainingCoins: this.getCoins(),
        message: 'Enter a valid coin amount.',
      };
    }

    const currentCoins = this.readCoins();
    const amountToSpend = Math.floor(amount);

    if (amountToSpend > currentCoins) {
      return {
        success: false,
        remainingCoins: currentCoins,
        message: 'You do not have enough coins.',
      };
    }

    const updatedCoins = currentCoins - amountToSpend;

    this.saveCoins(updatedCoins);
    this.coinSubject.next(updatedCoins);

    return {
      success: true,
      remainingCoins: updatedCoins,
      message: `${amountToSpend} coins were used.`,
    };
  }

  refreshCoins(): void {
    this.coinSubject.next(this.readCoins());
  }

  private readCoins(): number {
    if (typeof window === 'undefined') {
      return 0;
    }

    try {
      const storedValue = localStorage.getItem(
        this.getCoinStorageKey()
      );

      if (!storedValue) {
        return 0;
      }

      const parsedCoins = Number(storedValue);

      if (!Number.isFinite(parsedCoins) || parsedCoins < 0) {
        return 0;
      }

      return Math.floor(parsedCoins);
    } catch (error) {
      console.warn('Unable to read user coins:', error);
      return 0;
    }
  }

  private saveCoins(coins: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(
        this.getCoinStorageKey(),
        String(Math.max(0, Math.floor(coins)))
      );
    } catch (error) {
      console.warn('Unable to save user coins:', error);
    }
  }

  private getCoinStorageKey(): string {
    const currentUser = this.authService.getCurrentUser();

    const username =
      currentUser?.username.trim().toLowerCase() ?? 'guest';

    return `gameCoins_${username}`;
  }
}