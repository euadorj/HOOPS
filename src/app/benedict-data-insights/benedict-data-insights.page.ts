import { Component, OnInit } from '@angular/core';
type Category = { key: string; color: string; value: number };

@Component({
  selector: 'app-benedict-data-insights',
  templateUrl: './benedict-data-insights.page.html',
  styleUrls: ['./benedict-data-insights.page.scss'],
  standalone: false,
})
export class BENEDICTDATAINSIGHTSPage implements OnInit {
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }

  name = 'John Smith';
  accountTitle = 'Amazon Protium';
  masked = '4758 •••• •••• 9018';
  balanceUSD = 3469.52;

  todayBadge = 'Water Bill';
  todayStatus = 'Unsuccessfully';
  todayAmount = -280;

  yesterdayTitle = 'Income: Salary Oct';
  yesterdayAmount = +1200;

  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  monthMoneyIn: number[] = [110,112,113,114,115];
  monthMoneyOut: number[] = [0,1,2,3,4,5,6];
  selectedToolTipMonthIndex: number | null = null; 
  private tooltipClickTimer: any | null;

  selectedMonthIndex = 3; // Apr
  expandedMonthIndexA: number | null = null;
  expandedMonthIndexB: number | null = null;

  // ===== Two bars (series A and B) =====
  monthTotalsA = [64, 58, 70, 92, 61, 88]; // first visible bar height
  monthTotalsB = [38, 52, 44, 60, 49, 57]; // second visible bar height
  moneyInByMonth = [200,430,300,400,350,350];
  moneyOutByMonth = [500,450,550,600,400,550];

  get selectedMonthLabel(): string {
    return this.months[this.selectedMonthIndex] ?? '';
  }

  get selectedMonthMoneyIn(): number {
    return this.moneyInByMonth[this.selectedMonthIndex] ?? 0;
  }

  get selectedMonthMoneyOut(): number {
    return this.moneyOutByMonth[this.selectedMonthIndex] ?? 0;
  }

  fmtMoneyIn(n: number) {
    return `$${Math.abs(n).toFixed(0)}`;
  }

  fmtMoneyOut(n: number) {
    // money out should be displayed negative, like "-$450"
    return `-$${Math.abs(n).toFixed(0)}`;
  }

  // Categories for expanded mode, for series A
  monthCategoriesA: Record<number, Category[]> = {
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

  // Categories for expanded mode, for series B
  monthCategoriesB: Record<number, Category[]> = {
    0: [
      { key: 'b1', color: '#3b82f6', value: 14 },
      { key: 'b2', color: '#60a5fa', value: 10 },
      { key: 'b3', color: '#a855f7', value: 8 },
      { key: 'b4', color: '#f59e0b', value: 6 },
    ],
    1: [
      { key: 'b1', color: '#3b82f6', value: 10 },
      { key: 'b2', color: '#60a5fa', value: 12 },
      { key: 'b3', color: '#a855f7', value: 10 },
      { key: 'b4', color: '#f59e0b', value: 20 },
    ],
    2: [
      { key: 'b1', color: '#3b82f6', value: 12 },
      { key: 'b2', color: '#60a5fa', value: 8 },
      { key: 'b3', color: '#a855f7', value: 16 },
      { key: 'b4', color: '#f59e0b', value: 8 },
    ],
    3: [
      { key: 'b1', color: '#3b82f6', value: 18 },
      { key: 'b2', color: '#60a5fa', value: 12 },
      { key: 'b3', color: '#a855f7', value: 14 },
      { key: 'b4', color: '#f59e0b', value: 16 },
    ],
    4: [
      { key: 'b1', color: '#3b82f6', value: 9 },
      { key: 'b2', color: '#60a5fa', value: 14 },
      { key: 'b3', color: '#a855f7', value: 10 },
      { key: 'b4', color: '#f59e0b', value: 16 },
    ],
    5: [
      { key: 'b1', color: '#3b82f6', value: 15 },
      { key: 'b2', color: '#60a5fa', value: 10 },
      { key: 'b3', color: '#a855f7', value: 12 },
      { key: 'b4', color: '#f59e0b', value: 20 },
    ],
  };

  onMonthClick(index: number, series: 'A' | 'B') {
    this.selectedMonthIndex = index;
    this.selectedToolTipMonthIndex = index

    if (series === 'A') {
      this.expandedMonthIndexA =
        this.expandedMonthIndexA === index ? null : index;
    } else {
      this.expandedMonthIndexB =
        this.expandedMonthIndexB === index ? null : index;
    }
  }
  isExpandedMonthA(i: number) {
    return this.expandedMonthIndexA === i;
  }
  isExpandedMonthB(i: number) {
    return this.expandedMonthIndexB === i;
  }
  getMonthOpacity(index: number) {
    return index === this.selectedMonthIndex ? 1 : 0.5;
  }

  // Convert categories into % segments scaled to each bar series
  getStackSegmentsA(index: number) {
    const total = this.monthTotalsA[index];
    const cats = this.monthCategoriesA[index] ?? [];
    const sum = cats.reduce((a, b) => a + b.value, 0) || 1;

    return cats
      .filter((c) => c.value > 0)
      .map((c) => ({
        color: c.color,
        percent: (c.value / sum) * 100,
      }));
  }

  getStackSegmentsB(index: number) {
    const total = this.monthTotalsB[index];
    const cats = this.monthCategoriesB[index] ?? [];
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
getNetProfitForMonth(i: number): number {
  const moneyIn = this.moneyInByMonth[i] ?? 0;
  const moneyOut = this.moneyOutByMonth[i] ?? 0;
  return moneyIn - moneyOut;
}

fmtMoneyInTooltip(n: number): string {
  // “Money in: $...”
  return `$${Math.abs(n).toFixed(0)}`;
}

fmtMoneyOutTooltip(n: number): string {
  // “Money out: $...”
  return `$${Math.abs(n).toFixed(0)}`;
}

fmtMoneyNetTooltip(n: number): string {
  // “Net profit: $...”
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}
isTooltipVisibleFor(i: number): boolean {
  return this.selectedToolTipMonthIndex === i;
}

getMoneyIn(i: number): number {
  return this.moneyInByMonth[i] ?? 0;
}

getMoneyOut(i: number): number {
  return this.moneyOutByMonth[i] ?? 0;
}

getNetProfitFor(i: number): number {
  const moneyIn = this.getMoneyIn(i);
  const moneyOut = this.getMoneyOut(i);
  return moneyIn - moneyOut;
}

fmtMoneyTooltipMoneyIn(n: number): string {
  return `$${Math.abs(n).toFixed(0)}`;
}

fmtMoneyTooltipMoneyOut(n: number): string {
  return `$${Math.abs(n).toFixed(0)}`; // “Money out: $..” (positive display as requested)
}

fmtMoneyTooltipNet(n: number): string {
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${Math.abs(n).toFixed(0)}`;
}

// Single click: show tooltip (but delay slightly so dblclick can cancel)
onMonthSingleClickTooltip(i: number): void {
  if (this.tooltipClickTimer) {
    clearTimeout(this.tooltipClickTimer);
  }

  this.tooltipClickTimer = setTimeout(() => {
    this.selectedToolTipMonthIndex = i;
    this.tooltipClickTimer = null;
  }, 250);
}

// Double click: hide tooltip and cancel pending single-click
onMonthDoubleClickTooltip(): void {
  if (this.tooltipClickTimer) {
    clearTimeout(this.tooltipClickTimer);
    this.tooltipClickTimer = null;
  }
  this.selectedToolTipMonthIndex = null;
}


}
