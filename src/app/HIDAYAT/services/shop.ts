import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Shop {
  id?: string;
  name: string;
  category: string;
  rating: number;
  cashback: string;
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShopService {

  constructor(private firestore: Firestore) {}

  getShops(): Observable<Shop[]> {
    const shopsCollection = collection(this.firestore, 'shops');

    return collectionData(shopsCollection, {
      idField: 'id'
    }) as Observable<Shop[]>;
  }
   getShopById(id: string): Observable<Shop | undefined> {
    const shopDoc = doc(this.firestore, 'shops', id);

    return docData(shopDoc, {
      idField: 'id'
    }) as Observable<Shop | undefined>;
  }
}