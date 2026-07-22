import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import {
  FinanceData,
  SavingsService,
} from '../../THIERRY/savings.service';
import { CoinService } from '../coin.service';

interface ChallengeState {
  active: boolean;
  targetAmount: number;
  depositedAmount: number;
  rewardClaimed: boolean;
  cooldownUntil: number | null;
}

@Component({
  selector: 'app-savings-challenge',
  templateUrl:
    './savings-challenge.component.html',
  styleUrls: [
    './savings-challenge.component.scss',
  ],
  standalone: false,
})
export class SavingsChallengeComponent
  implements OnInit, OnDestroy
{
  @Output() close = new EventEmitter<void>();
  @Output() rewardClaimed =
    new EventEmitter<void>();

  private readonly CHALLENGE_COOLDOWN_MS =
    30 * 1000;

  readonly challengeReward = 100;

  targetOptions = [50, 100, 200];
  selectedTarget = 50;

  financeData: FinanceData = {
    balance: 0,
    goals: [],
  };

  selectedGoalId = '';
  depositAmount = '';

  challengeState: ChallengeState = {
    active: false,
    targetAmount: 0,
    depositedAmount: 0,
    rewardClaimed: false,
    cooldownUntil: null,
  };

  successMessage = '';
  errorMessage = '';

  canStartChallenge = true;
  countdownText = 'Ready';

  private countdownTimer?: number;

  constructor(
    private authService: AuthService,
    private savingsService: SavingsService,
    private coinService: CoinService
  ) {}

  ngOnInit(): void {
    this.loadFinanceData();
    this.loadChallengeState();
    this.updateCooldown();

    this.countdownTimer = window.setInterval(() => {
      this.updateCooldown();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== undefined) {
      window.clearInterval(this.countdownTimer);
    }
  }

  get progressPercent(): number {
    if (this.challengeState.targetAmount <= 0) {
      return 0;
    }

    return Math.min(
      Math.round(
        (
          this.challengeState.depositedAmount /
          this.challengeState.targetAmount
        ) * 100
      ),
      100
    );
  }

  get remainingAmount(): number {
    return Math.max(
      this.challengeState.targetAmount -
        this.challengeState.depositedAmount,
      0
    );
  }

  get isChallengeComplete(): boolean {
    return (
      this.challengeState.active &&
      this.challengeState.depositedAmount >=
        this.challengeState.targetAmount
    );
  }

  selectTarget(amount: number): void {
    if (!this.challengeState.active) {
      this.selectedTarget = amount;
    }
  }

  startChallenge(): void {
    this.clearMessages();
    this.updateCooldown();

    if (!this.canStartChallenge) {
      return;
    }

    if (this.financeData.goals.length === 0) {
      this.errorMessage =
        'Create a savings goal before starting.';
      return;
    }

    this.challengeState = {
      active: true,
      targetAmount: this.selectedTarget,
      depositedAmount: 0,
      rewardClaimed: false,
      cooldownUntil: null,
    };

    this.selectedGoalId =
      this.financeData.goals[0].id;

    this.saveChallengeState();
  }

  selectGoal(event: Event): void {
    const customEvent = event as CustomEvent<{
      value?: string;
    }>;

    this.selectedGoalId =
      customEvent.detail?.value ?? '';
  }

  updateDepositAmount(event: Event): void {
    const customEvent = event as CustomEvent<{
      value?: string | null;
    }>;

    this.depositAmount =
      customEvent.detail?.value ?? '';
  }

  addToSavings(): void {
    this.clearMessages();

    if (!this.challengeState.active) {
      this.errorMessage =
        'Start the challenge first.';
      return;
    }

    if (!this.selectedGoalId) {
      this.errorMessage =
        'Select a savings goal.';
      return;
    }

    const amount = Number(this.depositAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      this.errorMessage =
        'Enter a valid amount.';
      return;
    }

    if (amount > this.remainingAmount) {
      this.errorMessage =
        `You only need $${this.remainingAmount.toFixed(
          2
        )} more to complete this challenge.`;
      return;
    }

    const result =
      this.savingsService.depositToGoal(
        this.selectedGoalId,
        amount
      );

    if (!result.success) {
      this.errorMessage = result.message;
      return;
    }

    this.challengeState.depositedAmount += amount;
    this.depositAmount = '';

    this.successMessage =
      `$${amount.toFixed(2)} was moved into savings.`;

    this.saveChallengeState();
    this.loadFinanceData();
  }

  claimReward(): void {
    if (
      !this.isChallengeComplete ||
      this.challengeState.rewardClaimed
    ) {
      return;
    }

    const newCoinBalance =
      this.coinService.addCoins(
        this.challengeReward
      );

    this.challengeState.rewardClaimed = true;
    this.challengeState.active = false;
    this.challengeState.cooldownUntil =
      Date.now() + this.CHALLENGE_COOLDOWN_MS;

    this.successMessage =
      `Challenge complete! You earned ` +
      `${this.challengeReward} coins. Your coin ` +
      `balance is now ${newCoinBalance}.`;

    this.saveChallengeState();
    this.rewardClaimed.emit();
    this.updateCooldown();
  }

  closeGame(): void {
    this.close.emit();
  }

  private loadFinanceData(): void {
    this.financeData =
      this.savingsService.getFinanceData();
  }

  private updateCooldown(): void {
    const cooldownUntil =
      this.challengeState.cooldownUntil;

    if (!cooldownUntil) {
      this.canStartChallenge =
        !this.challengeState.active;
      this.countdownText = 'Ready';
      return;
    }

    const remaining =
      cooldownUntil - Date.now();

    if (remaining <= 0) {
      this.challengeState = {
        active: false,
        targetAmount: 0,
        depositedAmount: 0,
        rewardClaimed: false,
        cooldownUntil: null,
      };

      this.canStartChallenge = true;
      this.countdownText = 'Ready';
      this.saveChallengeState();
      return;
    }

    this.canStartChallenge = false;
    this.countdownText =
      this.formatCountdown(remaining);
  }

  private loadChallengeState(): void {
    try {
      const savedValue = localStorage.getItem(
        this.getStorageKey()
      );

      if (!savedValue) {
        return;
      }

      const parsed =
        JSON.parse(savedValue) as ChallengeState;

      if (
        parsed &&
        typeof parsed.active === 'boolean' &&
        typeof parsed.targetAmount === 'number' &&
        typeof parsed.depositedAmount === 'number'
      ) {
        this.challengeState = parsed;
      }
    } catch (error) {
      console.warn(
        'Unable to load savings challenge:',
        error
      );
    }
  }

  private saveChallengeState(): void {
    localStorage.setItem(
      this.getStorageKey(),
      JSON.stringify(this.challengeState)
    );
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private formatCountdown(milliseconds: number): string {
    const totalSeconds = Math.max(
      0,
      Math.ceil(milliseconds / 1000)
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return (
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`
    );
  }

  private getStorageKey(): string {
    return (
      `savingsChallenge_` +
      this.getUsername()
    );
  }

  private getUsername(): string {
    return (
      this.authService
        .getCurrentUser()
        ?.username.trim()
        .toLowerCase() ?? 'guest'
    );
  }
}