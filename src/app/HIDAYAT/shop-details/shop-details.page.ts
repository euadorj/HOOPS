import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Shop, ShopService } from '../services/shop';
import { Product, ProductService } from '../services/product';
import { CartService } from '../services/cart';

@Component({
  selector: 'app-shop-details',
  templateUrl: './shop-details.page.html',
  styleUrls: ['./shop-details.page.scss'],
  standalone: false,
})
export class ShopDetailsPage implements OnInit {

  shop: Shop | undefined;
  products: Product[] = [];

  constructor(
    private route: ActivatedRoute,
    private shopService: ShopService,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit() {
  const shopId = this.route.snapshot.paramMap.get('id');

  if (shopId) {

    this.shopService.getShopById(shopId).subscribe({
      next: (shop) => {
        this.shop = shop;
      },
      error: (error) => {
        console.error('Error loading shop:', error);
      }
    });

    this.productService.getProductsByShop(shopId).subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
      }
    });

  }
}
addToCart(product: Product) {
  this.cartService.addToCart(product);
}
}