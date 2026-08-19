import { Component, OnInit } from '@angular/core';
import { ShopService, Shop } from './services/shop';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page implements OnInit {

  constructor(
    private shopService: ShopService,
    private router: Router,
    private authService: AuthService
  ) {}

  goBack() {
    this.router.navigate(['/tabs/tab1']);
  }

  userName = 'Guest';

  searchText = '';

  selectedCategory = 'All';


  categories = [
    { name: 'Food', icon: 'restaurant-outline', type: 'Food' },
    { name: 'Retail', icon: 'bag-handle-outline', type: 'Retail' },
    { name: 'Groceries', icon: 'cart-outline', type: 'Groceries' },
    { name: 'Fashion', icon: 'shirt-outline', type: 'Fashion' },
    { name: 'Health', icon: 'fitness-outline', type: 'Health' },
    { name: 'Travel', icon: 'airplane-outline', type: 'Travel' },
    { name: 'Technology', icon: 'hardware-chip-outline', type: 'Technology' },
    { name: 'Sports', icon: 'football-outline', type: 'Sports' }
  ];

shops: Shop[] = [];

async ngOnInit() {
  await this.authService.authReady;
  this.userName = this.authService.getCurrentUser()?.username ?? 'Guest';

  this.shopService.getShops().subscribe({
    next: (shops) => {
      this.shops = shops;
    },
    error: (error) => {
      console.error('Error loading shops:', error);
    }
  });
}

get filteredShops() {

  let filtered = this.shops;

  // Search
  if (this.searchText.trim()) {
    filtered = filtered.filter(shop =>
      shop.name.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }

  // Category
  if (this.selectedCategory !== 'All') {
    filtered = filtered.filter(shop =>
      shop.category === this.selectedCategory
    );
  }

  return filtered;

}


  selectCategory(category: string) {

  if (this.selectedCategory === category) {
    this.selectedCategory = 'All';
  } else {
    this.selectedCategory = category;
  }

}
openShop(shop: Shop) {
  if (shop.id) {
    this.router.navigate(['/shop-details', shop.id]);
  }
}

}
