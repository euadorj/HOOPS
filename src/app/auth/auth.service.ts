import { Injectable } from '@angular/core';

export interface User {
  id?: string;
  username: string;
  password: string;
  countryCode?: string;
  phoneNumber?: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  countryCode?: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly hardcodedAccounts: User[] = [
    { id: 'account-thierry', username: 'Thierry', password: '123456' },
    { id: 'account-user', username: 'user', password: '123456' },
  ];

  private readonly registeredUsersStorageKey = 'registeredUsers';
  private readonly currentUserStorageKey = 'currentUser';

  login(username: string, password: string): { success: boolean; message?: string; user?: CurrentUser } {
    const normalizedUsername = this.normalizeUsername(username);
    const account = this.getAllAccounts().find((entry) => this.normalizeUsername(entry.username) === normalizedUsername);

    if (!account) {
      return { success: false, message: 'Incorrect username or password' };
    }

    if (account.password !== password) {
      return { success: false, message: 'Incorrect username or password' };
    }

    const currentUser: CurrentUser = {
      id: this.getUserId(account),
      username: account.username,
      countryCode: account.countryCode,
      phoneNumber: account.phoneNumber,
    };

    this.saveCurrentUser(currentUser);
    return { success: true, user: currentUser };
  }

  register(user: User): { success: boolean; message?: string } {
    const normalizedUsername = this.normalizeUsername(user.username);
    const existingUser = this.getAllAccounts().find((entry) => this.normalizeUsername(entry.username) === normalizedUsername);

    if (existingUser) {
      return { success: false, message: 'Username already exists' };
    }

    const registeredUsers = this.readRegisteredUsers();
    registeredUsers.push({
      id: `account-${this.normalizeUsername(user.username)}`,
      username: user.username.trim(),
      password: user.password,
      countryCode: user.countryCode,
      phoneNumber: user.phoneNumber,
    });

    this.saveRegisteredUsers(registeredUsers);
    return { success: true };
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  getCurrentUser(): CurrentUser | null {
    const storedUser = this.readCurrentUser();
    return storedUser;
  }

  getAccountDisplayName(username: string): string {
    const normalizedUsername = this.normalizeUsername(username);
    const account = this.getAllAccounts().find(
      (entry) => this.normalizeUsername(entry.username) === normalizedUsername
    );
    return account?.username ?? username;
  }

  getAccountId(username: string): string | null {
    const normalizedUsername = this.normalizeUsername(username);
    const account = this.getAllAccounts().find(
      (entry) => this.normalizeUsername(entry.username) === normalizedUsername
    );
    return account ? this.getUserId(account) : null;
  }

  

  logout(): void {
    this.clearCurrentUser();
  }

  private getAllAccounts(): User[] {
    return [...this.hardcodedAccounts, ...this.readRegisteredUsers()];
  }

  private readRegisteredUsers(): User[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storedValue = window.localStorage.getItem(this.registeredUsersStorageKey);
      if (!storedValue) {
        return [];
      }

      const parsedValue = JSON.parse(storedValue);
      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue.filter((entry): entry is User => this.isUser(entry));
    } catch (error) {
      console.warn('Unable to read registered users from localStorage', error);
      return [];
    }
  }

  private saveRegisteredUsers(users: User[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.registeredUsersStorageKey, JSON.stringify(users));
  }

  private readCurrentUser(): CurrentUser | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const storedValue = window.localStorage.getItem(this.currentUserStorageKey);
      if (!storedValue) {
        return null;
      }

      const parsedValue = JSON.parse(storedValue);
      if (!this.isCurrentUser(parsedValue)) {
        return null;
      }

      return {
        ...parsedValue,
        id: parsedValue.id || this.getAccountId(parsedValue.username) || `account-${this.normalizeUsername(parsedValue.username)}`
      };
    } catch (error) {
      console.warn('Unable to read current user from localStorage', error);
      return null;
    }
  }

  private saveCurrentUser(user: CurrentUser): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.currentUserStorageKey, JSON.stringify(user));
  }

  private clearCurrentUser(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(this.currentUserStorageKey);
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private getUserId(user: User): string {
    return user.id || `account-${this.normalizeUsername(user.username)}`;
  }

  private isUser(value: unknown): value is User {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'username' in value &&
        'password' in value &&
        typeof (value as User).username === 'string' &&
        typeof (value as User).password === 'string'
    );
  }

  private isCurrentUser(value: unknown): value is CurrentUser {
    return Boolean(
      value &&
        typeof value === 'object' &&
        'username' in value &&
        typeof (value as CurrentUser).username === 'string'
    );
  }
  accountExists(username: string): boolean {
  return this.getAccountUsername(username) !== null;
}

getAccountUsername(username: string): string | null {
  const normalizedUsername =
    this.normalizeUsername(username);

  const account = this.getAllAccounts().find(
    (entry) =>
      this.normalizeUsername(entry.username) ===
      normalizedUsername
  );

  return account?.username ?? null;
}
}
