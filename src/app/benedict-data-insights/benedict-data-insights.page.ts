import { Component, OnInit } from '@angular/core';

type CategoryType = 'in' | 'out';

type CategoryEntry = {
  id: string;
  name: string;
  color: string;
  amount: number;
  type: CategoryType;
};

type TxItem = {
  title: string;
  subtitle: string;
  amount: number;
  color: string;
};

type BarSegment = {
  name: string;
  color: string;
  percent: number;
  percentText: string;
};

@Component({
  selector: 'app-benedict-data-insights',
  templateUrl: './benedict-data-insights.page.html',
  styleUrls: ['./benedict-data-insights.page.scss'],
  standalone: false,
})
export class BENEDICTDATAINSIGHTSPage implements OnInit {
  ngOnInit(): void {
    this.hydrateCategoryColorMap();
    this.applyCategoryColorsAcrossMonths();
    this.recalculateAllMonths();
  }

  name = 'John Smith';
  accountTitle = 'Amazon Protium';
  masked = '4758 •••• •••• 9018';
  balanceUSD = 3469.52;
  elderlyFriendlyMode = false;

  todayTransactions: TxItem[] = [
    { title: 'Water Bill', subtitle: 'Today', amount: -280, color: '#ef4444' },
    {
      title: 'Income: Salary October',
      subtitle: 'Today',
      amount: 1200,
      color: '#22c55e',
    },
    {
      title: 'Groceries - Family Mart',
      subtitle: 'Today',
      amount: -84,
      color: '#f59e0b',
    },
    {
      title: 'Ride Share Rebate',
      subtitle: 'Today',
      amount: 36,
      color: '#3b82f6',
    },
    {
      title: 'Mobile Plan Auto Debit',
      subtitle: 'Today',
      amount: -58,
      color: '#a855f7',
    },
  ];

  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  selectedToolTipMonthIndex: number | null = null;
  private tooltipClickTimer: ReturnType<typeof setTimeout> | null = null;
  selectedMonthIndex = 1;
  expandedMonthIndexOut: number | null = null;
  expandedMonthIndexIn: number | null = null;

  // Red bar = money out, Green bar = money in
  monthTotalsOut = [60, 68, 74, 78, 62, 70];
  monthTotalsIn = [48, 58, 54, 64, 50, 56];
  moneyInByMonth = [220, 320, 260, 340, 290, 310];
  moneyOutByMonth = [280, 450, 390, 500, 360, 430];

  categoriesByMonth: Record<number, CategoryEntry[]> = {
    0: [
      { id: 'jan-shopping', name: 'Shopping', color: '#f59e0b', amount: 90, type: 'out' },
      { id: 'jan-telemarket', name: 'Telemarket', color: '#ef4444', amount: 70, type: 'out' },
      { id: 'jan-groceries', name: 'Groceries', color: '#22c55e', amount: 120, type: 'in' },
      { id: 'jan-transport', name: 'Transport', color: '#3b82f6', amount: 100, type: 'in' },
    ],
    1: [
      { id: 'feb-shopping', name: 'Shopping', color: '#f59e0b', amount: 140, type: 'out' },
      { id: 'feb-telemarket', name: 'Telemarket', color: '#ef4444', amount: 180, type: 'out' },
      { id: 'feb-groceries', name: 'Groceries', color: '#22c55e', amount: 190, type: 'in' },
      { id: 'feb-transport', name: 'Transport', color: '#3b82f6', amount: 130, type: 'in' },
    ],
    2: [
      { id: 'mar-rent', name: 'Rent', color: '#a855f7', amount: 210, type: 'out' },
      { id: 'mar-shopping', name: 'Shopping', color: '#f59e0b', amount: 180, type: 'out' },
      { id: 'mar-salary', name: 'Salary', color: '#22c55e', amount: 260, type: 'in' },
      { id: 'mar-freelance', name: 'Freelance', color: '#10b981', amount: 80, type: 'in' },
    ],
    3: [
      { id: 'apr-food', name: 'Food', color: '#ef4444', amount: 220, type: 'out' },
      { id: 'apr-subs', name: 'Subscriptions', color: '#f97316', amount: 100, type: 'out' },
      { id: 'apr-salary', name: 'Salary', color: '#22c55e', amount: 290, type: 'in' },
      { id: 'apr-bonus', name: 'Bonus', color: '#3b82f6', amount: 50, type: 'in' },
    ],
    4: [
      { id: 'may-dining', name: 'Dining', color: '#ef4444', amount: 170, type: 'out' },
      { id: 'may-shopping', name: 'Shopping', color: '#f59e0b', amount: 190, type: 'out' },
      { id: 'may-salary', name: 'Salary', color: '#22c55e', amount: 210, type: 'in' },
      { id: 'may-refund', name: 'Refund', color: '#60a5fa', amount: 80, type: 'in' },
    ],
    5: [
      { id: 'jun-travel', name: 'Travel', color: '#f43f5e', amount: 240, type: 'out' },
      { id: 'jun-shopping', name: 'Shopping', color: '#f59e0b', amount: 190, type: 'out' },
      { id: 'jun-salary', name: 'Salary', color: '#22c55e', amount: 260, type: 'in' },
      { id: 'jun-cashback', name: 'Cashback', color: '#3b82f6', amount: 50, type: 'in' },
    ],
  };

  categoryForm = {
    id: '',
    monthIndex: 1,
    name: '',
    color: '#f59e0b',
    amount: 0,
    type: 'out' as CategoryType,
  };

  private categoryColorByKey: Record<string, string> = {};

  get selectedMonthCategories(): CategoryEntry[] {
    return this.categoriesByMonth[this.selectedMonthIndex] ?? [];
  }

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

  toggleElderlyFriendlyMode(): void {
    this.elderlyFriendlyMode = !this.elderlyFriendlyMode;
  }

  fmtMoneyOut(n: number) {
    // money out should be displayed negative, like "-$450"
    return `-$${Math.abs(n).toFixed(0)}`;
  }

  onMonthClick(index: number) {
    this.selectedMonthIndex = index;
    this.selectedToolTipMonthIndex = index;
    this.categoryForm.monthIndex = index;
  }

  onBarDoubleClick(index: number, type: CategoryType): void {
    this.selectedMonthIndex = index;

    if (type === 'out') {
      this.expandedMonthIndexOut =
        this.expandedMonthIndexOut === index ? null : index;
      return;
    }

    this.expandedMonthIndexIn =
      this.expandedMonthIndexIn === index ? null : index;
  }

  isBarExpanded(index: number, type: CategoryType): boolean {
    return type === 'out'
      ? this.expandedMonthIndexOut === index
      : this.expandedMonthIndexIn === index;
  }

  getBarSegments(index: number, type: CategoryType): BarSegment[] {
    const categories = this.getCategoriesForMonth(index).filter(
      (category) => category.type === type && category.amount > 0,
    );
    const total = categories.reduce((sum, category) => sum + category.amount, 0);

    if (!total) {
      return [];
    }

    return categories.map((category) => {
      const percent = (category.amount / total) * 100;
      return {
        name: category.name,
        color: category.color,
        percent,
        percentText: `${Math.round(percent)}%`,
      };
    });
  }

  getMonthOpacity(index: number) {
    return index === this.selectedMonthIndex ? 1 : 0.5;
  }

  fmtMoney(n: number) {
    const sign = n < 0 ? '-' : '+';
    const abs = Math.abs(n);
    return `${sign}$${abs.toFixed(2)}`;
  }

  fmtCurrency(n: number): string {
    return `$${Math.abs(n).toFixed(2)}`;
  }

  fmtNetProfit(n: number): string {
    const sign = n < 0 ? '-' : '+';
    return `${sign}$${Math.abs(n).toFixed(2)}`;
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

  getCategoriesForMonth(index: number): CategoryEntry[] {
    return this.categoriesByMonth[index] ?? [];
  }

  getCategoryTotalForMonth(index: number, type: CategoryType): number {
    return this.getCategoriesForMonth(index)
      .filter((category) => category.type === type)
      .reduce((sum, category) => sum + category.amount, 0);
  }

  saveCategory(): void {
    const name = this.categoryForm.name.trim();
    const amount = Number(this.categoryForm.amount);

    if (!name || Number.isNaN(amount) || amount < 0) {
      return;
    }

    const monthIndex = this.categoryForm.monthIndex;
    const monthCategories = [...(this.categoriesByMonth[monthIndex] ?? [])];

    if (this.categoryForm.id) {
      const targetIndex = monthCategories.findIndex(
        (category) => category.id === this.categoryForm.id,
      );

      if (targetIndex >= 0) {
        monthCategories[targetIndex] = {
          id: this.categoryForm.id,
          name,
          color: this.categoryForm.color,
          amount,
          type: this.categoryForm.type,
        };
      }
    } else {
      monthCategories.push({
        id: `cat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name,
        color: this.categoryForm.color,
        amount,
        type: this.categoryForm.type,
      });
    }

    this.categoriesByMonth[monthIndex] = monthCategories;
    this.applyCategoryColorForName(name, this.categoryForm.type, this.categoryForm.color);
    this.resetCategoryForm(monthIndex);
    this.recalculateAllMonths();
  }

  editCategory(monthIndex: number, category: CategoryEntry): void {
    this.selectedMonthIndex = monthIndex;
    this.categoryForm = {
      id: category.id,
      monthIndex,
      name: category.name,
      color: category.color,
      amount: category.amount,
      type: category.type,
    };
  }

  deleteCategory(monthIndex: number, categoryId: string): void {
    const monthCategories = this.categoriesByMonth[monthIndex] ?? [];
    this.categoriesByMonth[monthIndex] = monthCategories.filter(
      (category) => category.id !== categoryId,
    );

    if (this.categoryForm.id === categoryId) {
      this.resetCategoryForm(monthIndex);
    }

    this.recalculateAllMonths();
  }

  private resetCategoryForm(monthIndex: number): void {
    this.categoryForm = {
      id: '',
      monthIndex,
      name: '',
      color: '#f59e0b',
      amount: 0,
      type: 'out',
    };
  }

  private buildCategoryKey(name: string, type: CategoryType): string {
    return `${type}:${name.trim().toLowerCase()}`;
  }

  private hydrateCategoryColorMap(): void {
    this.categoryColorByKey = {};

    for (const monthKey of Object.keys(this.categoriesByMonth)) {
      const monthIndex = Number(monthKey);
      const categories = this.categoriesByMonth[monthIndex] ?? [];

      for (const category of categories) {
        const key = this.buildCategoryKey(category.name, category.type);
        if (!this.categoryColorByKey[key]) {
          this.categoryColorByKey[key] = category.color;
        }
      }
    }
  }

  private applyCategoryColorForName(
    name: string,
    type: CategoryType,
    color: string,
  ): void {
    const key = this.buildCategoryKey(name, type);
    this.categoryColorByKey[key] = color;

    for (const monthKey of Object.keys(this.categoriesByMonth)) {
      const monthIndex = Number(monthKey);
      const categories = this.categoriesByMonth[monthIndex] ?? [];
      this.categoriesByMonth[monthIndex] = categories.map((category) => {
        const categoryKey = this.buildCategoryKey(category.name, category.type);
        if (categoryKey !== key) {
          return category;
        }

        return {
          ...category,
          color,
        };
      });
    }
  }

  private applyCategoryColorsAcrossMonths(): void {
    for (const monthKey of Object.keys(this.categoriesByMonth)) {
      const monthIndex = Number(monthKey);
      const categories = this.categoriesByMonth[monthIndex] ?? [];

      this.categoriesByMonth[monthIndex] = categories.map((category) => {
        const key = this.buildCategoryKey(category.name, category.type);
        const mappedColor = this.categoryColorByKey[key] ?? category.color;
        return {
          ...category,
          color: mappedColor,
        };
      });
    }
  }

  private recalculateAllMonths(): void {
    for (let index = 0; index < this.months.length; index += 1) {
      this.moneyInByMonth[index] = this.getCategoryTotalForMonth(index, 'in');
      this.moneyOutByMonth[index] = this.getCategoryTotalForMonth(index, 'out');
    }

    const maxIn = Math.max(...this.moneyInByMonth, 1);
    const maxOut = Math.max(...this.moneyOutByMonth, 1);

    this.monthTotalsIn = this.moneyInByMonth.map((value) =>
      this.toBarHeightPercent(value, maxIn),
    );
    this.monthTotalsOut = this.moneyOutByMonth.map((value) =>
      this.toBarHeightPercent(value, maxOut),
    );

    this.selectedMonthIndex = Math.min(this.selectedMonthIndex, this.months.length - 1);
  }

  private toBarHeightPercent(value: number, max: number): number {
    if (max <= 0) {
      return 0;
    }

    const scaled = (value / max) * 100;
    return Math.max(12, Math.min(100, scaled));
  }

}
