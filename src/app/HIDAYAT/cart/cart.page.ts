import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../services/cart';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: false,
})
export class CartPage {

  constructor(
    public cartService: CartService,
    private router: Router
  ) {}

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

  if (this.items.length === 0) {
    return;
  }

  const shopId =
    this.items[0].product.shopId;

  const total =
    this.cartService.getTotal();

  console.log('Checkout shop:', shopId);
  console.log('Checkout total:', total);

  this.router.navigate(
    ['/tabs/pay'],
    {
      queryParams: {
        shopId: shopId,
        amount: total
      }
    }
  );
}
}