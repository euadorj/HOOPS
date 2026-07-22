import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export type WalletTransactionType = 'deposit' | 'withdrawal';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed';

export interface SharedWallet {
  id: string;
  code: string;
  name: string;
  description: string;
  balanceCents: number;
  totalInCents: number;
  totalOutCents: number;
  createdBy: string;
  memberIds: string[];
  contributionCentsByUser: Record<string, number>;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amountCents: number;
  userId: string;
  description: string;
  category?: string;
  paymentMethod?: string;
  status: WalletTransactionStatus;
  createdAt: number;
}

export interface ContributorSummary {
  userId: string;
  displayName: string;
  amountAddedCents: number;
  percentageOfTotalIn: number;
  isCurrentUser: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SharedWalletService {
  private readonly walletStorageKey = 'sharedWallets';
  private readonly txStorageKey = 'sharedWalletTransactions';
  private wallets: SharedWallet[] = [];
  private transactions: WalletTransaction[] = [];

  constructor(private authService: AuthService) {
    this.wallets = this.readWallets();
    this.transactions = this.readTransactions();
  }

  getWalletsForCurrentUser(): SharedWallet[] {
    const userId = this.currentUserId();
    return this.wallets.filter((wallet) => wallet.memberIds.includes(userId));
  }

  getWalletById(id: string): SharedWallet | null {
    const wallet = this.wallets.find((entry) => entry.id === id);
    if (!wallet || !wallet.memberIds.includes(this.currentUserId())) {
      return null;
    }
    return wallet;
  }

  getWalletTransactionById(txId: string): WalletTransaction | null {
    const tx = this.transactions.find((entry) => entry.id === txId);
    if (!tx) {
      return null;
    }

    const wallet = this.getWalletById(tx.walletId);
    return wallet ? tx : null;
  }

  getRecentCompletedTransactions(walletId: string, limit = 3): WalletTransaction[] {
    return this.getCompletedTransactions(walletId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  getContributorSummaries(walletId: string): ContributorSummary[] {
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      return [];
    }

    const currentUserId = this.currentUserId();
    const totalIn = wallet.totalInCents;

    return wallet.memberIds.map((memberId) => {
      const displayName = this.getDisplayNameForUser(memberId);
      const amountAddedCents = wallet.contributionCentsByUser[memberId] || 0;
      const percentageOfTotalIn = totalIn > 0 ? (amountAddedCents / totalIn) * 100 : 0;
      return {
        userId: memberId,
        displayName,
        amountAddedCents,
        percentageOfTotalIn,
        isCurrentUser: memberId === currentUserId
      };
    });
  }

  hasWalletCode(code: string): boolean {
    return this.wallets.some((wallet) => wallet.code === code);
  }

  createWallet(name: string, code: string, description: string): SharedWallet {
    const userId = this.currentUserId();
    const wallet: SharedWallet = {
      id: this.createWalletId(),
      code,
      name: name.trim(),
      description: description.trim(),
      balanceCents: 0,
      totalInCents: 0,
      totalOutCents: 0,
      createdBy: userId,
      memberIds: [userId],
      contributionCentsByUser: {
        [userId]: 0
      }
    };

    this.wallets.unshift(wallet);
    this.saveAll();
    return wallet;
  }

  joinWallet(code: string): { wallet?: SharedWallet; message?: string; joined?: boolean } {
    const wallet = this.wallets.find((entry) => entry.code === code);
    if (!wallet) {
      return { message: 'No wallet was found with that code.' };
    }

    const userId = this.currentUserId();
    if (wallet.memberIds.includes(userId)) {
      return { wallet, message: 'You are already a member of this wallet.', joined: false };
    }

    wallet.memberIds.push(userId);
    wallet.contributionCentsByUser[userId] = wallet.contributionCentsByUser[userId] || 0;
    this.saveAll();
    return { wallet, joined: true };
  }

  leaveWallet(walletId: string): { success: boolean; message?: string } {
    const wallet = this.getWalletById(walletId);
    const userId = this.currentUserId();
    if (!wallet || !wallet.memberIds.includes(userId)) {
      return { success: false, message: 'You do not have access to this wallet.' };
    }

    const isCreator = wallet.createdBy === userId;
    const otherMembersRemain = wallet.memberIds.some((memberId) => memberId !== userId);

    if (isCreator && otherMembersRemain) {
      return { success: false, message: 'You created this wallet.' };
    }

    if (isCreator && !otherMembersRemain) {
      if (wallet.balanceCents === 0) {
        this.wallets = this.wallets.filter((entry) => entry.id !== walletId);
        this.transactions = this.transactions.filter((entry) => entry.walletId !== walletId);
        this.saveAll();
        return { success: true };
      }

      return {
        success: false,
        message: 'You created this wallet. Withdraw remaining funds before leaving.'
      };
    }

    wallet.memberIds = wallet.memberIds.filter((memberId) => memberId !== userId);
    this.saveAll();
    return { success: true };
  }

  addFunds(input: {
    walletId: string;
    amountCents: number;
    paymentMethod: string;
    description: string;
  }): { success: boolean; message?: string; transaction?: WalletTransaction } {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { success: false, message: 'Enter a valid amount greater than zero.' };
    }

    return this.runAtomicWalletUpdate(input.walletId, (wallet) => {
      const userId = this.currentUserId();
      const tx: WalletTransaction = {
        id: this.createTransactionId(),
        walletId: wallet.id,
        type: 'deposit',
        amountCents: input.amountCents,
        userId,
        description: input.description.trim() || 'Funds added',
        paymentMethod: input.paymentMethod,
        status: 'completed',
        createdAt: Date.now()
      };

      wallet.balanceCents += input.amountCents;
      wallet.totalInCents += input.amountCents;
      wallet.contributionCentsByUser[userId] = (wallet.contributionCentsByUser[userId] || 0) + input.amountCents;
      this.transactions.push(tx);
      return { success: true, transaction: tx };
    });
  }

  withdrawFunds(input: {
    walletId: string;
    amountCents: number;
    category: string;
    description: string;
  }): { success: boolean; message?: string; transaction?: WalletTransaction } {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { success: false, message: 'Enter a valid amount greater than zero.' };
    }

    if (!input.category.trim()) {
      return { success: false, message: 'Select a category.' };
    }

    if (!input.description.trim()) {
      return { success: false, message: 'Enter a description for this expense.' };
    }

    return this.runAtomicWalletUpdate(input.walletId, (wallet) => {
      if (wallet.balanceCents < input.amountCents) {
        return { success: false, message: 'Amount cannot exceed the current wallet balance.' };
      }

      const tx: WalletTransaction = {
        id: this.createTransactionId(),
        walletId: wallet.id,
        type: 'withdrawal',
        amountCents: input.amountCents,
        userId: this.currentUserId(),
        description: input.description.trim(),
        category: input.category,
        status: 'completed',
        createdAt: Date.now()
      };

      wallet.balanceCents -= input.amountCents;
      wallet.totalOutCents += input.amountCents;
      this.transactions.push(tx);
      return { success: true, transaction: tx };
    });
  }

  getDisplayNameForUser(userId: string): string {
    const username = this.authService.getAccountUsername(userId);
    return username || 'Member';
  }

  formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  parseAmountToCents(value: string): number | null {
    const normalized = value.trim();
    if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
      return null;
    }

    const [wholePart, decimalPart = ''] = normalized.split('.');
    const cents = Number.parseInt(wholePart, 10) * 100 + Number.parseInt((decimalPart + '00').slice(0, 2), 10);
    return Number.isNaN(cents) ? null : cents;
  }

  private getCompletedTransactions(walletId: string): WalletTransaction[] {
    return this.transactions.filter(
      (tx) => tx.walletId === walletId && tx.status === 'completed'
    );
  }

  private currentUserId(): string {
    return this.authService.getCurrentUser()?.id || '';
  }

  private createWalletId(): string {
    return `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private createTransactionId(): string {
    return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private runAtomicWalletUpdate(
    walletId: string,
    mutation: (wallet: SharedWallet) => { success: boolean; message?: string; transaction?: WalletTransaction }
  ): { success: boolean; message?: string; transaction?: WalletTransaction } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      return { success: false, message: 'You do not have access to this wallet.' };
    }

    const walletSnapshot = JSON.stringify(this.wallets);
    const transactionSnapshot = JSON.stringify(this.transactions);

    try {
      const result = mutation(wallet);
      if (!result.success) {
        this.wallets = JSON.parse(walletSnapshot) as SharedWallet[];
        this.transactions = JSON.parse(transactionSnapshot) as WalletTransaction[];
        return result;
      }

      this.saveAll();
      return result;
    } catch {
      this.wallets = JSON.parse(walletSnapshot) as SharedWallet[];
      this.transactions = JSON.parse(transactionSnapshot) as WalletTransaction[];
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  }

  private readWallets(): SharedWallet[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const value = window.localStorage.getItem(this.walletStorageKey);
      if (!value) {
        return [];
      }
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map((wallet) => this.migrateWallet(wallet))
        .filter((wallet): wallet is SharedWallet => this.isWallet(wallet));
    } catch {
      return [];
    }
  }

  private readTransactions(): WalletTransaction[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const value = window.localStorage.getItem(this.txStorageKey);
      if (!value) {
        return [];
      }
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((tx): tx is WalletTransaction => this.isTransaction(tx));
    } catch {
      return [];
    }
  }

  private saveAll(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.walletStorageKey, JSON.stringify(this.wallets));
      window.localStorage.setItem(this.txStorageKey, JSON.stringify(this.transactions));
    }
  }

  private isWallet(value: unknown): value is SharedWallet {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const wallet = value as Partial<SharedWallet>;
    return typeof wallet.id === 'string' &&
      /^\d{6}$/.test(wallet.code || '') &&
      typeof wallet.name === 'string' &&
      typeof wallet.description === 'string' &&
      Number.isInteger(wallet.balanceCents) &&
      Number.isInteger(wallet.totalInCents) &&
      Number.isInteger(wallet.totalOutCents) &&
      typeof wallet.createdBy === 'string' &&
      Array.isArray(wallet.memberIds) &&
      Boolean(wallet.contributionCentsByUser && typeof wallet.contributionCentsByUser === 'object');
  }

  private isTransaction(value: unknown): value is WalletTransaction {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const tx = value as Partial<WalletTransaction>;
    return typeof tx.id === 'string' &&
      typeof tx.walletId === 'string' &&
      (tx.type === 'deposit' || tx.type === 'withdrawal') &&
      Number.isInteger(tx.amountCents) &&
      typeof tx.userId === 'string' &&
      typeof tx.description === 'string' &&
      (tx.status === 'pending' || tx.status === 'completed' || tx.status === 'failed') &&
      Number.isInteger(tx.createdAt);
  }

  private migrateWallet(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const wallet = value as Partial<SharedWallet>;
    if (
      Number.isInteger(wallet.totalInCents) &&
      Number.isInteger(wallet.totalOutCents) &&
      wallet.contributionCentsByUser &&
      typeof wallet.contributionCentsByUser === 'object'
    ) {
      return wallet;
    }

    const balance = Number.isInteger(wallet.balanceCents) ? wallet.balanceCents : 0;
    const memberIds = Array.isArray(wallet.memberIds) ? wallet.memberIds : [];
    const createdBy = typeof wallet.createdBy === 'string' ? wallet.createdBy : memberIds[0] || '';

    return {
      ...wallet,
      balanceCents: balance,
      totalInCents: balance,
      totalOutCents: 0,
      createdBy,
      memberIds,
      contributionCentsByUser: {
        [createdBy]: balance
      }
    };
  }
}
