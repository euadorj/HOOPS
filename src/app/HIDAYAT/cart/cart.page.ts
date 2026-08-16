import { Component } from '@angular/core';
import { CartService, CartItem } from '../services/cart';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
})
export class CartPage {

  constructor(public cartService: CartService) {}

  get items(): CartItem[] {
    return this.cartService.getItems();
  }

  get total(): number {
    return this.cartService.getTotal();
  }

  increaseItem(productId?: string) {
    this.cartService.increaseQuantity(productId);
  }

  decreaseItem(productId?: string) {
    this.cartService.decreaseQuantity(productId);
  }

  removeItem(productId?: string) {
    if (productId) {
      this.cartService.removeFromCart(productId);
    }
  }

  checkout() {
    console.log('Checkout:', this.items);
    console.log('Total:', this.total);
  }
}