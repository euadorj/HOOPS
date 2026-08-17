import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

const VISITED_DATES_KEY = 'benedict-rewards-visited-dates';

@Component({
  selector: 'app-benedict-rewards',
  templateUrl: './benedict-rewards.page.html',
  styleUrls: ['./benedict-rewards.page.scss'],
  standalone: false,
})
export class BENEDICTREWARDSPage implements OnInit {
  name = 'Thierry';

  totalSavings = 110.54;
  points = 84.06;
  pointsGold = 5.94;

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

  constructor(private router: Router) {}

  ngOnInit() {
    this.syncTierFromPoints();
    this.recordTodayVisit();
    this.buildCalendar();
  }

  increasePoints() {
    this.points += 5;
    this.syncTierFromPoints();
  }

  decreasePoints() {
    this.points -= 5;
    this.syncTierFromPoints();
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

  private getVisitedDates(): Set<string> {
    try {
      const raw = localStorage.getItem(VISITED_DATES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  }

  // Logs today's date so its calendar cell stays circled from now on
  private recordTodayVisit() {
    const visited = this.getVisitedDates();
    visited.add(this.toIsoDate(new Date()));

    try {
      localStorage.setItem(VISITED_DATES_KEY, JSON.stringify([...visited]));
    } catch {
      // storage unavailable (e.g. private browsing) - visited days won't persist across sessions
    }
  }

  private buildCalendar() {
    const today = new Date();
    const visited = this.getVisitedDates();

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
        isVisited: visited.has(iso),
      };
    });
  }
}
