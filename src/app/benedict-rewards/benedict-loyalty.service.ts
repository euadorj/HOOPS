import { Injectable } from '@angular/core';
import { Firestore, arrayUnion, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

export interface LoyaltyData {
  totalSavings: number;
  points: number;
  pointsGold: number;
  visitedDates: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BenedictLoyaltyService {
  private readonly collectionName = 'benedictRewards';

  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getLoyaltyData(): Promise<LoyaltyData> {
    const ref = this.docRef();
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const defaultData = this.createDefaultData();
      await setDoc(ref, defaultData);
      return defaultData;
    }

    return this.toLoyaltyData(snapshot.data());
  }

  async savePoints(points: number): Promise<void> {
    await setDoc(this.docRef(), { points }, { merge: true });
  }

  async saveTotalSavings(totalSavings: number): Promise<void> {
    await setDoc(this.docRef(), { totalSavings }, { merge: true });
  }

  async savePointsGold(pointsGold: number): Promise<void> {
    await setDoc(this.docRef(), { pointsGold }, { merge: true });
  }

  async recordVisit(isoDate: string): Promise<void> {
    await setDoc(this.docRef(), { visitedDates: arrayUnion(isoDate) }, { merge: true });
  }

  private docRef() {
    return doc(this.firestore, this.collectionName, this.normalizedUsername());
  }

  private normalizedUsername(): string {
    return this.authService.getCurrentUser()?.username.trim().toLowerCase() ?? 'guest';
  }

  private toLoyaltyData(data: Record<string, unknown> | undefined): LoyaltyData {
    if (!data) {
      return this.createDefaultData();
    }

    return {
      totalSavings: typeof data['totalSavings'] === 'number' ? (data['totalSavings'] as number) : 0,
      points: typeof data['points'] === 'number' ? (data['points'] as number) : 0,
      pointsGold: typeof data['pointsGold'] === 'number' ? (data['pointsGold'] as number) : 0,
      visitedDates: Array.isArray(data['visitedDates']) ? (data['visitedDates'] as string[]) : [],
    };
  }

  private createDefaultData(): LoyaltyData {
    return {
      totalSavings: 110.54,
      points: 84.06,
      pointsGold: 5.94,
      visitedDates: [],
    };
  }
}
