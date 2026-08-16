import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Product {
  id?: string;
  name: string;
  shopId: string;
  category: string;
  price: number;
  image: string;
  description: string;
  available: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  constructor(private firestore: Firestore) {}

  getProductsByShop(shopId: string): Observable<Product[]> {

    const productsCollection = collection(
      this.firestore,
      'products'
    );

    const productsQuery = query(
      productsCollection,
      where('shopId', '==', shopId)
    );

    return collectionData(productsQuery, {
      idField: 'id'
    }) as Observable<Product[]>;
  }
}