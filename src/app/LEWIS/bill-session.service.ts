import { Injectable } from '@angular/core';
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
  private readonly sessionsStorageKey = 'billSplittingSessions';
  private sessions: BillSession[] = [];

  constructor(private authService: AuthService) {
    this.sessions = this.readSessions();
    if (!this.sessions.length) {
      this.sessions = [
        {
          id: '123456',
          title: 'Dinner at Mario\'s',
          restaurant: 'Mario\'s Italian Restaurant',
          ownerId: this.currentUserId(),
          memberIds: [this.currentUserId()],
          menuCategories: [
        {
          title: 'Appetizers',
          items: [
            { id: 'caesar', title: 'Caesar Salad', description: 'Romaine, parmesan, house dressing', price: 12.99 },
            { id: 'garlic', title: 'Garlic Bread', description: 'Buttery garlic toast with herbs', price: 6.99 }
          ]
        },
        {
          title: 'Main Course',
          items: [
            { id: 'pizza', title: 'Margherita Pizza', description: 'Fresh basil, mozzarella, tomato', price: 18.5 },
            { id: 'steak', title: 'Steak Frites', description: 'Grilled steak with crispy fries', price: 28.9 }
          ]
        },
        {
          title: 'Desserts',
          items: [
            { id: 'lava-cake', title: 'Chocolate Lava Cake', description: 'Warm chocolate cake with ice cream', price: 9.5 },
            { id: 'latte', title: 'Iced Latte', description: 'Cold brew coffee with milk', price: 5.5 }
          ]
        }
          ]
        }
      ];
      this.saveSessions();
    }
  }

  getSessions() {
    return this.getVisibleSessions();
  }

  getSessionById(id: string) {
    return this.getVisibleSessions().find((session) => session.id === id);
  }

  addSession(session: BillSession) {
    const userId = this.currentUserId();
    session.ownerId = userId;
    session.memberIds = [userId];
    this.sessions.unshift(session);
    this.saveSessions();
  }

  hasSession(id: string) {
    return this.sessions.some((session) => session.id === id);
  }

  joinSession(code: string) {
    const session = this.sessions.find((entry) => entry.id === code);
    if (!session) {
      return false;
    }

    const userId = this.currentUserId();
    if (!session.memberIds.includes(userId)) {
      session.memberIds.push(userId);
      this.saveSessions();
    }
    return true;
  }

  canAccessSession(id: string) {
    return this.getVisibleSessions().some((session) => session.id === id);
  }

  leaveSession(sessionId: string): { success: boolean; message?: string } {
    const session = this.getSessionById(sessionId);
    const userId = this.currentUserId();
    if (!session || !session.memberIds.includes(userId)) {
      return { success: false, message: 'You are not a member of this session.' };
    }

    const hasUnpaidItems = session.menuCategories.some((category) => category.items.length > 0);
    const isCreator = session.ownerId === userId;
    const otherMembersRemain = session.memberIds.some((memberId) => memberId !== userId);

    if (isCreator && otherMembersRemain && hasUnpaidItems) {
      return { success: false, message: 'You created this session. There are still unpaid items!' };
    }

    session.memberIds = session.memberIds.filter((memberId) => memberId !== userId);
    this.saveSessions();
    return { success: true };
  }

  removeSelectedItems(sessionId: string) {
    const session = this.getSessionById(sessionId);
    if (!session) {
      return;
    }

    session.menuCategories = session.menuCategories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => !item.selected)
      }))
      .filter((category) => category.items.length > 0);

    this.clearSelection(sessionId);
  this.saveSessions();
  }

  clearSelection(sessionId: string) {
    const session = this.getSessionById(sessionId);
    if (!session) {
      return;
    }
    session.menuCategories.forEach((category) => category.items.forEach((item) => (item.selected = false)));
  }

  private getVisibleSessions() {
    const userId = this.currentUserId();
    return this.sessions.filter((session) => session.memberIds.includes(userId));
  }

  private currentUserId() {
    return this.authService.getCurrentUser()?.id || '';
  }

  private readSessions(): BillSession[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storedValue = window.localStorage.getItem(this.sessionsStorageKey);
      if (!storedValue) {
        return [];
      }
      const parsedValue = JSON.parse(storedValue);
      if (!Array.isArray(parsedValue)) {
        return [];
      }
      return parsedValue
        .map((session) => this.migrateSession(session))
        .filter((session): session is BillSession => this.isSession(session));
    } catch {
      return [];
    }
  }

  private saveSessions() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.sessionsStorageKey, JSON.stringify(this.sessions));
    }
  }

  private isSession(value: unknown): value is BillSession {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const session = value as Partial<BillSession>;
    return typeof session.id === 'string' &&
      /^\d{6}$/.test(session.id) &&
      typeof session.title === 'string' &&
      typeof session.restaurant === 'string' &&
      typeof session.ownerId === 'string' &&
      Array.isArray(session.memberIds) &&
      Array.isArray(session.menuCategories);
  }

  private migrateSession(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const legacySession = value as Partial<BillSession> & {
      ownerUsername?: string;
      memberUsernames?: string[];
    };
    if (Array.isArray(legacySession.memberIds) && typeof legacySession.ownerId === 'string') {
      return legacySession;
    }

    const memberIds = (legacySession.memberUsernames || [])
      .map((username) => this.authService.getAccountId(username))
      .filter((id): id is string => Boolean(id));
    const ownerId = legacySession.ownerUsername
      ? this.authService.getAccountId(legacySession.ownerUsername)
      : memberIds[0];

    if (!ownerId || !memberIds.length) {
      return value;
    }
    return { ...legacySession, ownerId, memberIds };
  }
}
