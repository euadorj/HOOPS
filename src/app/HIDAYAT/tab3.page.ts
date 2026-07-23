import { Component } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {

  constructor() {}

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

  shops = [
  {
    name: 'Starbucks',
    category: 'Food',
    rating: 4.8,
    cashback: '10% Cashback',
    image: 'assets/shops/starbucks.png'
  },
  {
    name: 'FairPrice',
    category: 'Groceries',
    rating: 4.7,
    cashback: '5% Cashback',
    image: 'assets/shops/fairprice.png'
  },
  {
    name: 'Courts',
    category: 'Technology',
    rating: 4.6,
    cashback: '15% Cashback',
    image: 'assets/shops/courts.png'
  }
];

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

}
