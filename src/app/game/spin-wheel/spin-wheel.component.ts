import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { AuthService } from '../../auth/auth.service';
import { CoinService } from '../coin.service';

@Component({
  selector: 'app-spin-wheel',
  templateUrl: './spin-wheel.component.html',
  styleUrls: ['./spin-wheel.component.scss'],
  standalone: false,
})
export class SpinWheelComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() rewardClaimed = new EventEmitter<void>();

  private readonly SPIN_COOLDOWN_MS = 30 * 1000;

  rewards: number[] = [10, 20, 50, 100, 30, 20];

  rotation = 0;
  spinning = false;
  canSpin = true;

  countdownText = 'Ready';
  resultMessage = '';

  private countdownTimer?: number;
  private spinTimer?: number;

  constructor(
    private authService: AuthService,
    private coinService: CoinService
  ) {}

  ngOnInit(): void {
    this.updateAvailability();

    this.countdownTimer = window.setInterval(() => {
      this.updateAvailability();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== undefined) {
      window.clearInterval(this.countdownTimer);
    }

    if (this.spinTimer !== undefined) {
      window.clearTimeout(this.spinTimer);
    }
  }

  spin(): void {
    this.updateAvailability();

    if (!this.canSpin || this.spinning) {
      return;
    }

    this.resultMessage = '';
    this.spinning = true;

    const selectedIndex = Math.floor(
      Math.random() * this.rewards.length
    );

    const segmentAngle = 360 / this.rewards.length;
    const selectedAngle =
      360 -
      (selectedIndex * segmentAngle + segmentAngle / 2);

    const currentAngle =
      ((this.rotation % 360) + 360) % 360;

    const additionalRotation =
      5 * 360 +
      ((selectedAngle - currentAngle + 360) % 360);

    this.rotation += additionalRotation;

    this.spinTimer = window.setTimeout(() => {
      const reward = this.rewards[selectedIndex];

      const newBalance =
        this.coinService.addCoins(reward);

      localStorage.setItem(
        this.getLastSpinStorageKey(),
        String(Date.now())
      );

      this.resultMessage =
        `You won ${reward} coins! ` +
        `Your balance is now ${newBalance} coins.`;

      this.spinning = false;
      this.canSpin = false;

      this.rewardClaimed.emit();
      this.updateAvailability();
    }, 2500);
  }

  closeGame(): void {
    if (!this.spinning) {
      this.close.emit();
    }
  }

  private updateAvailability(): void {
    const storedValue = localStorage.getItem(
      this.getLastSpinStorageKey()
    );

    if (!storedValue) {
      this.canSpin = true;
      this.countdownText = 'Ready';
      return;
    }

    const lastSpinAt = Number(storedValue);

    if (!Number.isFinite(lastSpinAt)) {
      this.canSpin = true;
      this.countdownText = 'Ready';
      return;
    }

    const remaining =
      this.SPIN_COOLDOWN_MS -
      (Date.now() - lastSpinAt);

    if (remaining <= 0) {
      this.canSpin = true;
      this.countdownText = 'Ready';
      return;
    }

    this.canSpin = false;
    this.countdownText =
      this.formatCountdown(remaining);
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

  private getLastSpinStorageKey(): string {
    return `lastSpin_${this.getUsername()}`;
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