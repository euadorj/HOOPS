import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { BenedictLoyaltyService } from './benedict-loyalty.service';
import {
  BENEDICT_MAX_POINTS,
  BENEDICT_TIERS,
  BenedictTier,
  resolveBenedictTierFromPoints,
} from '../benedict-tier.config';

type CalendarDay = {
  day: number;
  iso: string;
  isToday: boolean;
  isVisited: boolean;
};

@Component({
  selector: 'app-benedict-rewards',
  templateUrl: './benedict-rewards.page.html',
  styleUrls: ['./benedict-rewards.page.scss'],
  standalone: false,
})
export class BENEDICTREWARDSPage implements OnInit {
  name = 'Guest';
  loading = true;

  totalSavings = 0;
  points = 0;
  pointsGold = 0;

  tiers = BENEDICT_TIERS;
  tierPercent = 0;
  activeTier: BenedictTier = BENEDICT_TIERS[0];
  isCardShaking = false;

  // Telegram community link
  telegramUrl = 'https://t.me/euadorj';

  // Usage calendar
  monthLabel = '';
  weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  calendarLeadingBlanks: number[] = [];
  calendarDays: CalendarDay[] = [];

  private visitedDates: Set<string> = new Set();

  constructor(
    private router: Router,
    private authService: AuthService,
    private loyaltyService: BenedictLoyaltyService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.authService.authReady;
    this.name = this.authService.getCurrentUser()?.username ?? 'Guest';

    const data = await this.loyaltyService.getLoyaltyData();
    this.totalSavings = data.totalSavings;
    this.points = data.points;
    this.pointsGold = data.pointsGold;
    this.visitedDates = new Set(data.visitedDates);

    this.syncTierFromPoints();
    await this.recordTodayVisit();
    this.buildCalendar();
    this.loading = false;
  }

  async increasePoints(): Promise<void> {
    this.points += 5;
    this.syncTierFromPoints();
    await this.loyaltyService.savePoints(this.points);
  }

  async decreasePoints(): Promise<void> {
    this.points -= 5;
    this.syncTierFromPoints();
    await this.loyaltyService.savePoints(this.points);
  }

  get tier(): string {
    return this.activeTier.memberLabel;
  }

  get tierColorClass(): string {
    return this.activeTier.profileClass;
  }

  get nextTierLabel(): string {
    const activeIndex = this.tiers.findIndex(
      (tier) => tier.key === this.activeTier.key,
    );

    if (activeIndex < 0 || activeIndex === this.tiers.length - 1) {
      return this.activeTier.label;
    }

    return this.tiers[activeIndex + 1].label;
  }

  private syncTierFromPoints() {
    const clampedPoints = Math.max(0, Math.min(this.points, BENEDICT_MAX_POINTS));

    this.points = clampedPoints;
    this.tierPercent = (clampedPoints / BENEDICT_MAX_POINTS) * 100;
    this.activeTier = resolveBenedictTierFromPoints(clampedPoints);
  }

  openTiers() {
    if (this.isCardShaking) {
      return;
    }

    this.isCardShaking = true;

    setTimeout(() => {
      this.router.navigate(['/membership-tiers'], {
        queryParams: { tier: this.activeTier.key },
      });
      this.isCardShaking = false;
    }, 220);
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Logs today's date so its calendar cell stays circled from now on
  private async recordTodayVisit(): Promise<void> {
    const todayIso = this.toIsoDate(new Date());

    if (this.visitedDates.has(todayIso)) {
      return;
    }

    await this.loyaltyService.recordVisit(todayIso);
    this.visitedDates.add(todayIso);
  }

  private buildCalendar() {
    const today = new Date();

    this.monthLabel = today.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
    ).getDate();

    this.calendarLeadingBlanks = Array(firstOfMonth.getDay()).fill(0);

    this.calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      const iso = this.toIsoDate(date);

      return {
        day,
        iso,
        isToday: iso === this.toIsoDate(today),
        isVisited: this.visitedDates.has(iso),
      };
    });
  }
}
