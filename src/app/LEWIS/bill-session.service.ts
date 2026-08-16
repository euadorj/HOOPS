import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  arrayRemove
} from '@angular/fire/firestore';
import { AuthService } from '../auth/auth.service';

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  selected?: boolean;
}

export interface MenuCategory {
  title: string;
  items: MenuItem[];
}

export interface BillSession {
  id: string;
  title: string;
  restaurant: string;
  menuCategories: MenuCategory[];
  ownerId: string;
  memberIds: string[];
}

@Injectable({
  providedIn: 'root'
})
export class BillSessionService {
  private readonly collectionName = 'billSessions';

  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getSessions(): Promise<BillSession[]> {
    const userId = this.currentUserId();
    if (!userId) {
      return [];
    }

    const sessionsQuery = query(
      collection(this.firestore, this.collectionName),
      where('memberIds', 'array-contains', userId)
    );
    const snapshot = await getDocs(sessionsQuery);
    return snapshot.docs.map((docSnapshot) => this.toSession(docSnapshot.id, docSnapshot.data()));
  }

  async getSessionById(id: string): Promise<BillSession | null> {
    const snapshot = await getDoc(doc(this.firestore, this.collectionName, id));
    if (!snapshot.exists()) {
      return null;
    }

    const session = this.toSession(snapshot.id, snapshot.data());
    return session.memberIds.includes(this.currentUserId()) ? session : null;
  }

  async addSession(session: BillSession): Promise<boolean> {
    const userId = this.currentUserId();
    const sessionRef = doc(this.firestore, this.collectionName, session.id);

    return runTransaction(this.firestore, async (transaction) => {
      const existing = await transaction.get(sessionRef);
      if (existing.exists()) {
        return false;
      }

      transaction.set(sessionRef, {
        title: session.title,
        restaurant: session.restaurant,
        menuCategories: session.menuCategories,
        ownerId: userId,
        memberIds: [userId]
      });
      return true;
    });
  }

  async hasSession(id: string): Promise<boolean> {
    const snapshot = await getDoc(doc(this.firestore, this.collectionName, id));
    return snapshot.exists();
  }

  async joinSession(code: string): Promise<boolean> {
    const userId = this.currentUserId();
    const sessionRef = doc(this.firestore, this.collectionName, code);

    return runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists()) {
        return false;
      }

      const data = snapshot.data();
      const memberIds: string[] = Array.isArray(data['memberIds']) ? data['memberIds'] : [];
      if (!memberIds.includes(userId)) {
        transaction.update(sessionRef, { memberIds: [...memberIds, userId] });
      }
      return true;
    });
  }

  async canAccessSession(id: string): Promise<boolean> {
    return (await this.getSessionById(id)) !== null;
  }

  async leaveSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    const userId = this.currentUserId();
    const sessionRef = doc(this.firestore, this.collectionName, sessionId);

    const result = await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists()) {
        return { success: false, message: 'This session no longer exists.' };
      }

      const session = this.toSession(snapshot.id, snapshot.data());
      if (!session.memberIds.includes(userId)) {
        return { success: false, message: 'You are not a member of this session.' };
      }

      const hasUnpaidItems = session.menuCategories.some((category) => category.items.length > 0);
      const isCreator = session.ownerId === userId;
      const otherMembersRemain = session.memberIds.some((memberId) => memberId !== userId);

      if (isCreator && otherMembersRemain && hasUnpaidItems) {
        return { success: false, message: 'You created this session. There are still unpaid items!' };
      }

      if (!otherMembersRemain) {
        if (hasUnpaidItems) {
          return { success: false, message: 'There are still unpaid items in this session.' };
        }

        transaction.delete(sessionRef);
        return { success: true };
      }

      transaction.update(sessionRef, { memberIds: arrayRemove(userId) });
      return { success: true };
    });

    return result;
  }

  async removeSelectedItems(sessionId: string): Promise<void> {
    const sessionRef = doc(this.firestore, this.collectionName, sessionId);

    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists()) {
        return;
      }

      const session = this.toSession(snapshot.id, snapshot.data());
      const menuCategories = session.menuCategories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => !item.selected)
        }))
        .filter((category) => category.items.length > 0);

      transaction.update(sessionRef, { menuCategories });
    });
  }

  private currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  private toSession(id: string, data: Record<string, unknown>): BillSession {
    return {
      id,
      title: (data['title'] as string) || '',
      restaurant: (data['restaurant'] as string) || '',
      menuCategories: (data['menuCategories'] as MenuCategory[]) || [],
      ownerId: (data['ownerId'] as string) || '',
      memberIds: (data['memberIds'] as string[]) || []
    };
  }
}
