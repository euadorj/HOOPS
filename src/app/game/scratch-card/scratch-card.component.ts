import {
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { CoinService } from '../coin.service';

type ScratchRewardType =
  | 'coins'
  | 'cashback'
  | 'voucher';

interface ScratchReward {
  label: string;
  value: string;
  emoji: string;
  type: ScratchRewardType;
  amount: number;
}

interface RewardHistoryItem {
  label: string;
  value: string;
  emoji: string;
  type: ScratchRewardType;
  amount: number;
  status: string;
  wonAt: number;
}

@Component({
  selector: 'app-scratch-card',
  templateUrl: './scratch-card.component.html',
  styleUrls: ['./scratch-card.component.scss'],
  standalone: false,
})
export class ScratchCardComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  /*
   * Lets the Games page refresh its displayed
   * coin balance after a reward is claimed.
   */
  @Output() rewardClaimed = new EventEmitter<void>();

  /*
   * TEST MODE:
   * One new scratch card every 30 seconds.
   *
   * Change this to:
   * 24 * 60 * 60 * 1000
   *
   * when you want one scratch card every 24 hours.
   */
  private readonly SCRATCH_INTERVAL_MS =
    30 * 1000;

  rewards: ScratchReward[] = [
    {
      label: '50 Coins',
      value: '50_coins',
      emoji: '🪙',
      type: 'coins',
      amount: 50,
    },
    {
      label: '$1 Cashback',
      value: '1_cash',
      emoji: '💵',
      type: 'cashback',
      amount: 1,
    },
    {
      label: 'Voucher',
      value: 'voucher',
      emoji: '🎟️',
      type: 'voucher',
      amount: 1,
    },
  ];

  selectedReward: ScratchReward | null = null;

  revealed = false;
  availableNow = true;

  rewardAmountDisplay = '';
  rewardMessage = '';

  recentRewards: RewardHistoryItem[] = [];

  constructor(
    private authService: AuthService,
    private coinService: CoinService
  ) {}

  ngOnInit(): void {
    this.checkAvailability();
    this.loadRewardHistory();
  }

  pickRandomReward(): ScratchReward {
    const randomIndex = Math.floor(
      Math.random() * this.rewards.length
    );

    return this.rewards[randomIndex];
  }

  reveal(): void {
    this.checkAvailability();

    if (!this.availableNow || this.revealed) {
      return;
    }

    this.selectedReward = this.pickRandomReward();
    this.revealed = true;

    this.applyReward(this.selectedReward);

    const historyItem: RewardHistoryItem = {
      ...this.selectedReward,
      status: 'Won',
      wonAt: Date.now(),
    };

    this.recentRewards.unshift(historyItem);

    /*
     * Keep only the latest five rewards.
     */
    this.recentRewards =
      this.recentRewards.slice(0, 5);

    this.saveRewardHistory();

    localStorage.setItem(
      this.getLastRevealStorageKey(),
      String(Date.now())
    );

    this.availableNow = false;

    this.rewardClaimed.emit();
  }

  cancel(): void {
    this.close.emit();
  }

  done(): void {
    this.close.emit();
  }

  private applyReward(
    reward: ScratchReward
  ): void {
    switch (reward.type) {
      case 'coins': {
        const newCoinBalance =
          this.coinService.addCoins(
            reward.amount
          );

        this.rewardAmountDisplay =
          String(reward.amount);

        this.rewardMessage =
          `${reward.amount} coins were added. ` +
          `Your coin balance is now ${newCoinBalance}.`;

        break;
      }

      case 'cashback': {
        const currentCashback =
          this.getCashbackBalance();

        const newCashback =
          currentCashback + reward.amount;

        localStorage.setItem(
          this.getCashbackStorageKey(),
          String(newCashback)
        );

        this.rewardAmountDisplay =
          `$${reward.amount.toFixed(2)}`;

        this.rewardMessage =
          `$${reward.amount.toFixed(2)} cashback ` +
          'was added to your account.';

        break;
      }

      case 'voucher': {
        const voucherCount =
          this.getVoucherCount() + reward.amount;

        localStorage.setItem(
          this.getVoucherStorageKey(),
          String(voucherCount)
        );

        this.rewardAmountDisplay = '1';

        this.rewardMessage =
          'One voucher was added to your rewards.';

        break;
      }
    }
  }

  private checkAvailability(): void {
    try {
      const storedValue = localStorage.getItem(
        this.getLastRevealStorageKey()
      );

      if (!storedValue) {
        this.availableNow = true;
        return;
      }

      const lastRevealAt = Number(storedValue);

      if (!Number.isFinite(lastRevealAt)) {
        this.availableNow = true;
        return;
      }

      const elapsedTime =
        Date.now() - lastRevealAt;

      this.availableNow =
        elapsedTime >= this.SCRATCH_INTERVAL_MS;
    } catch (error) {
      console.warn(
        'Unable to check scratch-card availability:',
        error
      );

      this.availableNow = true;
    }
  }

  private loadRewardHistory(): void {
    try {
      const storedValue = localStorage.getItem(
        this.getRewardHistoryStorageKey()
      );

      if (!storedValue) {
        this.recentRewards = [];
        return;
      }

      const parsedValue: unknown =
        JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        this.recentRewards = [];
        return;
      }

      this.recentRewards =
        parsedValue.filter(
          (
            reward
          ): reward is RewardHistoryItem => {
            return Boolean(
              reward &&
              typeof reward === 'object' &&
              'label' in reward &&
              'value' in reward &&
              'type' in reward &&
              typeof reward.label === 'string' &&
              typeof reward.value === 'string' &&
              typeof reward.type === 'string'
            );
          }
        );
    } catch (error) {
      console.warn(
        'Unable to load reward history:',
        error
      );

      this.recentRewards = [];
    }
  }

  private saveRewardHistory(): void {
    try {
      localStorage.setItem(
        this.getRewardHistoryStorageKey(),
        JSON.stringify(this.recentRewards)
      );
    } catch (error) {
      console.warn(
        'Unable to save reward history:',
        error
      );
    }
  }

  private getCashbackBalance(): number {
    const storedValue = localStorage.getItem(
      this.getCashbackStorageKey()
    );

    const balance = Number(storedValue);

    return Number.isFinite(balance)
      ? balance
      : 0;
  }

  private getVoucherCount(): number {
    const storedValue = localStorage.getItem(
      this.getVoucherStorageKey()
    );

    const count = Number(storedValue);

    return Number.isFinite(count)
      ? count
      : 0;
  }

  private getCurrentUsername(): string {
    const currentUser =
      this.authService.getCurrentUser();

    return (
      currentUser?.username
        .trim()
        .toLowerCase() ?? 'guest'
    );
  }

  private getLastRevealStorageKey(): string {
    return (
      `scratchLastReveal_` +
      this.getCurrentUsername()
    );
  }

  private getRewardHistoryStorageKey(): string {
    return (
      `scratchRewardHistory_` +
      this.getCurrentUsername()
    );
  }

  private getCashbackStorageKey(): string {
    return (
      `cashbackBalance_` +
      this.getCurrentUsername()
    );
  }

  private getVoucherStorageKey(): string {
    return (
      `voucherCount_` +
      this.getCurrentUsername()
    );
  }
}