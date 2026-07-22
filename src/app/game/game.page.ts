import {
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { CoinService } from './coin.service';

interface CheckInDay {
  day: number;
  completed: boolean;
  reward: number;
}

interface SavedCheckInData {
  currentStreak: number;
  lastCheckInAt: number | null;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  standalone: false,
})
export class GamePage implements OnInit, OnDestroy {
  /*
   * TEST MODE:
   * A new daily check-in becomes available every 30 seconds.
   *
   * Change this to:
   * 24 * 60 * 60 * 1000
   *
   * when you want the real 24-hour version.
   */
  private readonly CHECK_IN_INTERVAL_MS = 30 * 1000;

  /*
   * The streak resets if the user waits longer than
   * two check-in intervals.
   *
   * In test mode:
   * 30 seconds = next reward available
   * More than 60 seconds = streak resets
   */
  private readonly STREAK_BREAK_MS =
    this.CHECK_IN_INTERVAL_MS * 2;

  private readonly rewards: number[] = [
    50,
    50,
    100,
    150,
    200,
    250,
    300,
  ];

  checkInDays: CheckInDay[] = [];

  currentStreak = 0;
  totalCoins = 0;

  lastCheckInAt: number | null = null;

  canCheckIn = true;
  countdownText = 'Ready';

  rewardMessage = '';

  /*
   * Controls whether each game popup is displayed.
   */
  showScratch = false;
  showSpinWheel = false;
  showSavingsChallenge = false;
  showFinanceQuiz = false;

  private countdownTimer?: number;

  constructor(
    private authService: AuthService,
    private coinService: CoinService
  ) {}

  ngOnInit(): void {
    this.loadPageData();
    this.startCountdownTimer();
  }

  /*
   * This runs whenever the user returns to the Games page.
   * It refreshes the user's coins and check-in progress.
   */
  ionViewWillEnter(): void {
    this.loadPageData();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== undefined) {
      window.clearInterval(this.countdownTimer);
    }
  }

  /*
   * Shows the next daily check-in reward on the button.
   */
  get nextReward(): number {
    const rewardIndex =
      this.currentStreak >= this.rewards.length
        ? 0
        : this.currentStreak;

    return this.rewards[rewardIndex];
  }

  /*
   * Daily check-in
   */
  checkIn(): void {
    this.rewardMessage = '';

    this.updateCheckInAvailability();

    if (!this.canCheckIn) {
      return;
    }

    const currentTime = Date.now();

    /*
     * Check whether the user's streak should reset.
     */
    if (this.lastCheckInAt !== null) {
      const elapsedTime =
        currentTime - this.lastCheckInAt;

      if (elapsedTime > this.STREAK_BREAK_MS) {
        this.currentStreak = 0;
      }
    }

    /*
     * After finishing Day 7, begin again from Day 1.
     */
    if (this.currentStreak >= this.rewards.length) {
      this.currentStreak = 0;
    }

    const reward =
      this.rewards[this.currentStreak];

    /*
     * CoinService saves the coins under the currently
     * logged-in user's individual account.
     */
    this.totalCoins =
      this.coinService.addCoins(reward);

    this.currentStreak++;
    this.lastCheckInAt = currentTime;

    this.rewardMessage =
      `You claimed ${reward} coins. ` +
      `Your coin balance is now ${this.totalCoins}.`;

    this.saveCheckInData();
    this.initializeDays();
    this.updateCheckInAvailability();
  }

  /*
   * Identifies which daily reward is currently available.
   */
  isCurrentDay(day: CheckInDay): boolean {
    const nextDay =
      this.currentStreak >= this.rewards.length
        ? 1
        : this.currentStreak + 1;

    return day.day === nextDay;
  }

  /*
   * Refreshes the displayed coin balance after a game
   * awards coins.
   */
  refreshCoinBalance(): void {
    this.totalCoins =
      this.coinService.getCoins();
  }

  /*
   * Scratch Card controls
   */
  openScratch(): void {
    this.showScratch = true;
  }

  closeScratch(): void {
    this.showScratch = false;
    this.refreshCoinBalance();
  }

  /*
   * Spin & Win controls
   */
  openSpinWheel(): void {
    this.showSpinWheel = true;
  }

  closeSpinWheel(): void {
    this.showSpinWheel = false;
    this.refreshCoinBalance();
  }

  /*
   * Savings Challenge controls
   */
  openSavingsChallenge(): void {
    this.showSavingsChallenge = true;
  }

  closeSavingsChallenge(): void {
    this.showSavingsChallenge = false;
    this.refreshCoinBalance();
  }

  /*
   * Finance Quiz controls
   */
  openFinanceQuiz(): void {
    this.showFinanceQuiz = true;
  }

  closeFinanceQuiz(): void {
    this.showFinanceQuiz = false;
    this.refreshCoinBalance();
  }

  /*
   * Loads all information needed by the Games page.
   */
  private loadPageData(): void {
    this.coinService.refreshCoins();

    this.totalCoins =
      this.coinService.getCoins();

    this.loadCheckInData();
    this.initializeDays();
    this.updateCheckInAvailability();
  }

  /*
   * Creates the seven daily reward cards.
   */
  private initializeDays(): void {
    this.checkInDays =
      this.rewards.map((reward, index) => ({
        day: index + 1,
        completed: index < this.currentStreak,
        reward,
      }));
  }

  /*
   * Checks whether the next reward can be collected.
   */
  private updateCheckInAvailability(): void {
    if (this.lastCheckInAt === null) {
      this.canCheckIn = true;
      this.countdownText = 'Ready';
      return;
    }

    const elapsedTime =
      Date.now() - this.lastCheckInAt;

    const remainingTime =
      this.CHECK_IN_INTERVAL_MS - elapsedTime;

    if (remainingTime <= 0) {
      this.canCheckIn = true;
      this.countdownText = 'Ready';
      return;
    }

    this.canCheckIn = false;

    this.countdownText =
      this.formatCountdown(remainingTime);
  }

  /*
   * Updates the countdown every second.
   */
  private startCountdownTimer(): void {
    if (this.countdownTimer !== undefined) {
      window.clearInterval(this.countdownTimer);
    }

    this.countdownTimer =
      window.setInterval(() => {
        this.updateCheckInAvailability();
      }, 1000);
  }

  /*
   * Loads the logged-in user's check-in progress.
   */
  private loadCheckInData(): void {
    try {
      const savedValue =
        localStorage.getItem(
          this.getCheckInStorageKey()
        );

      if (!savedValue) {
        this.currentStreak = 0;
        this.lastCheckInAt = null;
        return;
      }

      const parsedValue: unknown =
        JSON.parse(savedValue);

      if (
        !parsedValue ||
        typeof parsedValue !== 'object'
      ) {
        this.currentStreak = 0;
        this.lastCheckInAt = null;
        return;
      }

      const savedData =
        parsedValue as Partial<SavedCheckInData>;

      if (
        typeof savedData.currentStreak === 'number'
      ) {
        this.currentStreak = Math.max(
          0,
          Math.min(
            Math.floor(savedData.currentStreak),
            this.rewards.length
          )
        );
      } else {
        this.currentStreak = 0;
      }

      this.lastCheckInAt =
        typeof savedData.lastCheckInAt === 'number'
          ? savedData.lastCheckInAt
          : null;
    } catch (error) {
      console.warn(
        'Unable to load check-in data:',
        error
      );

      this.currentStreak = 0;
      this.lastCheckInAt = null;
    }
  }

  /*
   * Saves check-in progress separately for every user.
   */
  private saveCheckInData(): void {
    const savedData: SavedCheckInData = {
      currentStreak: this.currentStreak,
      lastCheckInAt: this.lastCheckInAt,
    };

    try {
      localStorage.setItem(
        this.getCheckInStorageKey(),
        JSON.stringify(savedData)
      );
    } catch (error) {
      console.warn(
        'Unable to save check-in data:',
        error
      );
    }
  }

  /*
   * Converts milliseconds into MM:SS.
   */
  private formatCountdown(
    remainingMilliseconds: number
  ): string {
    const totalSeconds = Math.max(
      0,
      Math.ceil(
        remainingMilliseconds / 1000
      )
    );

    const minutes =
      Math.floor(totalSeconds / 60);

    const seconds =
      totalSeconds % 60;

    return (
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`
    );
  }

  /*
   * Creates a different storage key for each user.
   *
   * Examples:
   * checkInData_thierry
   * checkInData_user
   */
  private getCheckInStorageKey(): string {
    return (
      `checkInData_` +
      this.getCurrentUsername()
    );
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
}