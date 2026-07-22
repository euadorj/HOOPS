import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BillSessionService, BillSession, MenuCategory } from './bill-session.service';

@Component({
  selector: 'app-create-session',
  templateUrl: 'create-session.page.html',
  styleUrls: ['create-session.page.scss'],
  standalone: false
})
export class CreateSessionPage {
  sessionCode = '';
  sessionTitle = '';
  restaurantName = '';
  validationMessage = '';
  categories: MenuCategory[] = [
    {
      title: 'Appetizers',
      items: [
        { id: 'item-1', title: 'Caesar Salad', description: 'Romaine, parmesan, house dressing', price: 12.99 }
      ]
    }
  ];

  constructor(private router: Router, private billSessionService: BillSessionService) {}

  addCategory() {
    this.categories.push({ title: 'New Category', items: [] });
  }

  removeCategory(index: number) {
    this.categories.splice(index, 1);
  }

  addItem(category: MenuCategory) {
    category.items.push({ id: `item-${Date.now()}`, title: 'New item', description: '', price: 0 });
  }

  removeItem(category: MenuCategory, index: number) {
    category.items.splice(index, 1);
  }

  create() {
    const code = (this.sessionCode || '').trim();
    const errors: string[] = [];

    if (!code) {
      errors.push('Enter a session code.');
    } else if (!/^\d{6}$/.test(code)) {
      errors.push('Session code must be 6 digits.');
    } else if (this.billSessionService.hasSession(code)) {
      errors.push('That session code is already in use. Choose another one.');
    }

    if (!this.sessionTitle.trim()) {
      errors.push('Enter the session name.');
    }

    if (!this.restaurantName.trim()) {
      errors.push('Enter the restaurant\'s name.');
    }

    this.validationMessage = errors.join(' ');
    if (errors.length) {
      return;
    }

    const session: BillSession = {
      id: code,
      title: this.sessionTitle,
      restaurant: this.restaurantName,
      ownerId: '',
      memberIds: [],
      menuCategories: this.categories.map((category) => ({
        title: category.title,
        items: category.items.map((item) => ({ ...item }))
      }))
    };

    this.billSessionService.addSession(session);
    this.router.navigate([`/tabs/tab2/session/${code}`]);
  }
}
