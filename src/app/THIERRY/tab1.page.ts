import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { DashboardSelectorModalComponent } from './dashboard-selector-modal.component';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  userName = 'Thierry';
  userInitial = 'T';

  totalSaved = 1500;
  netWorth = 1000000;
  balance = 900000;

  savingGoals = [
    { name: 'Emergency Fund', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'success' },
    { name: 'Vacation', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'warning' },
    { name: 'New Laptop', amount: '$500 / $2,000', value: 0.25, percent: 25, color: 'tertiary' },
  ];

  actions = [
    { icon: 'card-outline', title: 'Pay', route: '/tabs/tab1' },
    { icon: 'swap-horizontal-outline', title: 'Transfer', route: '/tabs/tab1' },
    { icon: 'game-controller-outline', title: 'Games', route: '/game' },
    { icon: 'receipt-outline', title: 'Bill Split', route: '/tabs/tab2' },
    { icon: 'wallet-outline', title: 'Shared Wallets', route: '/tabs/shared-wallets' },
    { icon: 'pricetag-outline', title: 'Discounts', route: '/tabs/tab1' },
  ];

  selectedDashboardItems: string[] = [];

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.loadDashboardSettings();
  }

  loadDashboardSettings() {
    const saved = localStorage.getItem('dashboardItems');
    if (saved) {
      this.selectedDashboardItems = JSON.parse(saved);
      console.log('Loaded dashboard items:', this.selectedDashboardItems);
    } else {
      // Default to showing Savings Goals and Investment Tracking
      this.selectedDashboardItems = ['savings-goals', 'investment-tracking'];
    }
  }

  isDashboardItemSelected(itemId: string): boolean {
    return this.selectedDashboardItems.includes(itemId);
  }

  async openDashboardSelector() {
    const modal = await this.modalController.create({
      component: DashboardSelectorModalComponent,
      cssClass: 'dashboard-selector-modal',
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();
    console.log('Modal dismissed with data:', data, 'role:', role);
    
    if (data && data.saved) {
      console.log('Saving dashboard items:', data.data);
      localStorage.setItem('dashboardItems', JSON.stringify(data.data));
      this.loadDashboardSettings();
    } else {
      console.log('Modal was cancelled or no data returned');
    }
  }
}
