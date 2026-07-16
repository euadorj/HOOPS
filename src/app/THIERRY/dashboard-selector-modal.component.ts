import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-dashboard-selector-modal',
  templateUrl: 'dashboard-selector-modal.component.html',
  styleUrls: ['dashboard-selector-modal.component.scss'],
  standalone: false,
})
export class DashboardSelectorModalComponent implements OnInit {
  dashboardItems = [
    { id: 'savings-goals', label: 'Savings Goals', selected: true },
    { id: 'investment-tracking', label: 'Investment Tracking', selected: false },
    { id: 'spending-summary', label: 'Spending Summary', selected: false },
    { id: 'monthly-budget', label: 'Monthly Budget', selected: false },
    { id: 'rewards-cashback', label: 'Rewards & Cashback', selected: false },
    { id: 'upcoming-bills', label: 'Upcoming Bills', selected: false },
    { id: 'recent-transactions', label: 'Recent Transactions', selected: false },
    { id: 'financial-tips', label: 'Financial Tips', selected: false },
  ];

  selectedCount = 1;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.loadSavedSelections();
    this.countSelected();
  }

  loadSavedSelections() {
    const saved = localStorage.getItem('dashboardItems');
    if (saved) {
      try {
        const savedItems = JSON.parse(saved);
        // Update the selected state based on saved items
        this.dashboardItems.forEach(item => {
          item.selected = savedItems.includes(item.id);
        });
        console.log('Loaded saved selections:', savedItems);
      } catch (e) {
        console.error('Error loading saved selections:', e);
      }
    }
  }

  countSelected() {
    this.selectedCount = this.dashboardItems.filter(item => item.selected).length;
    console.log('Selected count:', this.selectedCount);
  }

  onCheckboxChange(item: any, event: any) {
    // Explicitly set the selected value from the event
    item.selected = event.detail.checked;
    console.log('Checkbox changed:', item.label, 'to:', item.selected);
    
    const newCount = this.dashboardItems.filter(d => d.selected).length;
    console.log('New count after change:', newCount);

    // If now more than 2 are selected, revert the change
    if (newCount > 2) {
      console.log('More than 2 selected, reverting');
      item.selected = false;
      this.countSelected();
      return;
    }

    this.countSelected();
  }

  isSaveDisabled(): boolean {
    const isDisabled = this.selectedCount < 1 || this.selectedCount > 2;
    console.log('Save disabled:', isDisabled, 'count:', this.selectedCount);
    return isDisabled;
  }

  async saveSettings() {
    console.log('Saving settings. Count:', this.selectedCount);
    
    if (this.isSaveDisabled()) {
      console.log('Save is disabled, returning');
      return;
    }

    const selected = this.dashboardItems
      .filter(item => item.selected)
      .map(item => item.id);

    console.log('Selected items:', selected);

    await this.modalCtrl.dismiss({
      data: selected,
      saved: true,
    });
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }
}
