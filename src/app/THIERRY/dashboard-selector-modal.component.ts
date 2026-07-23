import {
  Component,
  OnInit,
} from '@angular/core';

import {
  ModalController
} from '@ionic/angular';

import {
  DashboardItemId,
  DashboardService,
} from './dashboard.service';

interface DashboardSelectorItem {
  id: DashboardItemId;
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-dashboard-selector-modal',
  templateUrl:
    'dashboard-selector-modal.component.html',
  styleUrls: [
    'dashboard-selector-modal.component.scss',
  ],
  standalone: false,
})
export class DashboardSelectorModalComponent
  implements OnInit {
  dashboardItems: DashboardSelectorItem[] = [
    {
      id: 'savings-goals',
      label: 'Savings Goals',
      selected: false,
    },
    {
      id: 'investment-tracking',
      label: 'Investment Tracking',
      selected: false,
    },
    {
      id: 'spending-summary',
      label: 'Spending Summary',
      selected: false,
    },
    {
      id: 'monthly-budget',
      label: 'Monthly Budget',
      selected: false,
    },
    {
      id: 'rewards-cashback',
      label: 'Rewards & Cashback',
      selected: false,
    },
    {
      id: 'upcoming-bills',
      label: 'Upcoming Bills',
      selected: false,
    },
    {
      id: 'recent-transactions',
      label: 'Recent Transactions',
      selected: false,
    },
    {
      id: 'financial-tips',
      label: 'Financial Tips',
      selected: false,
    },
  ];

  selectedCount = 0;

  constructor(
    private modalCtrl: ModalController,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.loadSavedSelections();
  }

  loadSavedSelections(): void {
    const savedItems =
      this.dashboardService.getSelectedItems();

    this.dashboardItems.forEach((item) => {
      item.selected =
        savedItems.includes(item.id);
    });

    this.countSelected();
  }

  countSelected(): void {
    this.selectedCount =
      this.dashboardItems.filter(
        (item) => item.selected
      ).length;
  }

  onCheckboxChange(
    item: DashboardSelectorItem,
    event: CustomEvent<{
      checked: boolean;
    }>
  ): void {
    const checked =
      event.detail.checked;

    if (
      checked &&
      !item.selected &&
      this.selectedCount >= 2
    ) {
      item.selected = false;
      this.countSelected();
      return;
    }

    item.selected = checked;
    this.countSelected();
  }

  isSaveDisabled(): boolean {
    return (
      this.selectedCount < 1 ||
      this.selectedCount > 2
    );
  }

  async saveSettings(): Promise<void> {
    if (this.isSaveDisabled()) {
      return;
    }

    const selectedItems =
      this.dashboardItems
        .filter((item) => item.selected)
        .map((item) => item.id);

    const savedItems =
      this.dashboardService.saveSelectedItems(
        selectedItems
      );

    await this.modalCtrl.dismiss({
      data: savedItems,
      saved: true,
    });
  }

  closeModal(): void {
    this.modalCtrl.dismiss({
      saved: false,
    });
  }
}