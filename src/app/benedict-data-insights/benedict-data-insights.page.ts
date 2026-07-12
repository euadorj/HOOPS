import { Component, OnInit } from '@angular/core';
type Category = {key : string, color: string; value: number} ;

@Component({
  selector: 'app-benedict-data-insights',
  templateUrl: './benedict-data-insights.page.html',
  styleUrls: ['./benedict-data-insights.page.scss'],
  standalone: false
})
export class BENEDICTDATAINSIGHTSPage implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  name = 'John Smith';
  accountTitle = 'Amazon Protium';
  masked = '4758 •••• •••• 9018';
  balanceUSD = 3469.52;

  // Transaction report list (matches the “Today/Yesterday” style in your screenshot)
  todayBadge = 'Water Bill';
  todayStatus = 'Unsuccessfully';
  todayAmount = -280;

  yesterdayTitle = 'Income: Salary Oct';
  yesterdayAmount = +1200;

  // Month UI logic
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  // “April has higher opacity because the user has selected April”
  selectedMonthIndex = 3; // Apr
  expandedMonthIndex: number | null = null; // when user clicks bars again (to split categories)

  // Totals used for bar heights (single-color mode)
  monthTotals = [64, 58, 70, 92, 61, 88];

  // Category breakdown (used only when expanded)
  // You can replace these values with your real data.
  monthCategories: Record<number, Category[]> = {
    0: [
      { key: 'c1', color: '#22c55e', value: 18 },
      { key: 'c2', color: '#a3e635', value: 16 },
      { key: 'c3', color: '#ef4444', value: 12 },
      { key: 'c4', color: '#f59e0b', value: 18 },
      { key: 'c5', color: '#60a5fa', value: 0 },
    ],
    1: [
      { key: 'c1', color: '#22c55e', value: 16 },
      { key: 'c2', color: '#a3e635', value: 14 },
      { key: 'c3', color: '#ef4444', value: 10 },
      { key: 'c4', color: '#f59e0b', value: 18 },
      { key: 'c5', color: '#60a5fa', value: 0 },
    ],
    2: [
      { key: 'c1', color: '#22c55e', value: 20 },
      { key: 'c2', color: '#a3e635', value: 12 },
      { key: 'c3', color: '#ef4444', value: 16 },
      { key: 'c4', color: '#f59e0b', value: 22 },
      { key: 'c5', color: '#60a5fa', value: 0 },
    ],
    3: [
      { key: 'c1', color: '#22c55e', value: 24 },
      { key: 'c2', color: '#a3e635', value: 18 },
      { key: 'c3', color: '#ef4444', value: 20 },
      { key: 'c4', color: '#f59e0b', value: 22 },
      { key: 'c5', color: '#60a5fa', value: 8 },
    ],
    4: [
      { key: 'c1', color: '#22c55e', value: 16 },
      { key: 'c2', color: '#a3e635', value: 20 },
      { key: 'c3', color: '#ef4444', value: 10 },
      { key: 'c4', color: '#f59e0b', value: 15 },
      { key: 'c5', color: '#60a5fa', value: 0 },
    ],
    5: [
      { key: 'c1', color: '#22c55e', value: 18 },
      { key: 'c2', color: '#a3e635', value: 22 },
      { key: 'c3', color: '#ef4444', value: 14 },
      { key: 'c4', color: '#f59e0b', value: 16 },
      { key: 'c5', color: '#60a5fa', value: 8 },
    ],
  };

  onMonthClick(index: number) {
    // Selecting a month: April starts selected; selecting others reduces rest opacity by 50%
    this.selectedMonthIndex = index;

    // “the image on the right shows what happens when the user clicks on the bars on the months again”
    // If user clicks the same selected month again, toggle split view.
    if (this.expandedMonthIndex === index) {
      this.expandedMonthIndex = null; // collapse back to single color bars
    } else {
      this.expandedMonthIndex = index; // expand split categories for that month
    }
  }

  getMonthOpacity(index: number) {
    // selected month full opacity, others reduced by 50%
    return index === this.selectedMonthIndex ? 1 : 0.5;
  }

  // Convert stacked categories into % segments for consistent bar height.
  // We scale categories to the month total so the bar top stays consistent.
  getStackSegments(index: number) {
    const total = this.monthTotals[index];
    const cats = this.monthCategories[index] ?? [];
    const sum = cats.reduce((a, b) => a + b.value, 0) || 1;

    return cats
      .filter((c) => c.value > 0)
      .map((c) => ({
        color: c.color,
        percent: (c.value / sum) * 100,
      }));
  }

  fmtMoney(n: number) {
    const sign = n < 0 ? '-' : '+';
    const abs = Math.abs(n);
    return `${sign}$${abs.toFixed(2)}`;
  }

  fmtInt(n: number) {
    const sign = n < 0 ? '-' : '+';
    const abs = Math.abs(n);
    return `${sign}$${abs}`;
  }

  isExpandedMonth(i: number) {
    return this.expandedMonthIndex === i;
  }
}
