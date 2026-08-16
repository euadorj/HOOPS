import { Injectable } from '@angular/core';
import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private items: CartItem[] = [];

  addToCart(product: Product) {

    const existingItem = this.items.find(
      item => item.product.id === product.id
    );

    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.items.push({
        product: product,
        quantity: 1
      });
    }

    console.log('Cart:', this.items);
  }

  getItems(): CartItem[] {
    return this.items;
  }

  getTotal(): number {
    return this.items.reduce(
      (total, item) =>
        total + (item.product.price * item.quantity),
      0
    );
  }

  getItemCount(): number {
    return this.items.reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  increaseQuantity(productId?: string) {
  const item = this.items.find(
    item => item.product.id === productId
  );

  if (item) {
    item.quantity++;
  }
}

decreaseQuantity(productId?: string) {
  const item = this.items.find(
    item => item.product.id === productId
  );

  if (item) {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      this.removeFromCart(productId);
    }
  }
}

  removeFromCart(productId: string) {
    this.items = this.items.filter(
      item => item.product.id !== productId
    );
  }

  clearCart() {
    this.items = [];
  }
}