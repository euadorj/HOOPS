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
  writeBatch
} from '@angular/fire/firestore';
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
  private readonly walletsCollection = 'sharedWallets';
  private readonly txCollection = 'walletTransactions';

  constructor(private authService: AuthService, private firestore: Firestore) {}

  async getWalletsForCurrentUser(): Promise<SharedWallet[]> {
    const userId = this.currentUserId();
    if (!userId) {
      return [];
    }

    const walletsQuery = query(
      collection(this.firestore, this.walletsCollection),
      where('memberIds', 'array-contains', userId)
    );
    const snapshot = await getDocs(walletsQuery);
    return snapshot.docs.map((docSnapshot) => this.toWallet(docSnapshot.id, docSnapshot.data()));
  }

  async getWalletById(id: string): Promise<SharedWallet | null> {
    const snapshot = await getDoc(doc(this.firestore, this.walletsCollection, id));
    if (!snapshot.exists()) {
      return null;
    }

    const wallet = this.toWallet(snapshot.id, snapshot.data());
    return wallet.memberIds.includes(this.currentUserId()) ? wallet : null;
  }

  async getWalletTransactionById(txId: string): Promise<WalletTransaction | null> {
    const snapshot = await getDoc(doc(this.firestore, this.txCollection, txId));
    if (!snapshot.exists()) {
      return null;
    }

    const tx = this.toTransaction(snapshot.id, snapshot.data());
    const wallet = await this.getWalletById(tx.walletId);
    return wallet ? tx : null;
  }

  async getRecentCompletedTransactions(walletId: string, limit = 3): Promise<WalletTransaction[]> {
    const transactions = await this.getTransactionsForWallet(walletId);
    return transactions
      .filter((tx) => tx.status === 'completed')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  async getContributorSummaries(walletId: string): Promise<ContributorSummary[]> {
    const wallet = await this.getWalletById(walletId);
    if (!wallet) {
      return [];
    }

    const currentUserId = this.currentUserId();
    const totalIn = wallet.totalInCents;

    return Promise.all(wallet.memberIds.map(async (memberId) => {
      const displayName = await this.getDisplayNameForUser(memberId);
      const amountAddedCents = wallet.contributionCentsByUser[memberId] || 0;
      const percentageOfTotalIn = totalIn > 0 ? (amountAddedCents / totalIn) * 100 : 0;
      return {
        userId: memberId,
        displayName,
        amountAddedCents,
        percentageOfTotalIn,
        isCurrentUser: memberId === currentUserId
      };
    }));
  }

  async hasWalletCode(code: string): Promise<boolean> {
    const walletsQuery = query(collection(this.firestore, this.walletsCollection), where('code', '==', code));
    const snapshot = await getDocs(walletsQuery);
    return !snapshot.empty;
  }

  async createWallet(name: string, code: string, description: string): Promise<SharedWallet | null> {
    const userId = this.currentUserId();
    const id = this.createWalletId();
    const walletRef = doc(this.firestore, this.walletsCollection, id);

    const created = await runTransaction(this.firestore, async (transaction) => {
      const codeQuery = query(collection(this.firestore, this.walletsCollection), where('code', '==', code));
      const existing = await getDocs(codeQuery);
      if (!existing.empty) {
        return false;
      }

      transaction.set(walletRef, {
        code,
        name: name.trim(),
        description: description.trim(),
        balanceCents: 0,
        totalInCents: 0,
        totalOutCents: 0,
        createdBy: userId,
        memberIds: [userId],
        contributionCentsByUser: { [userId]: 0 }
      });
      return true;
    });

    if (!created) {
      return null;
    }

    return this.getWalletById(id);
  }

  async joinWallet(code: string): Promise<{ wallet?: SharedWallet; message?: string; joined?: boolean }> {
    const walletsQuery = query(collection(this.firestore, this.walletsCollection), where('code', '==', code));
    const snapshot = await getDocs(walletsQuery);
    if (snapshot.empty) {
      return { message: 'No wallet was found with that code.' };
    }

    const walletDoc = snapshot.docs[0];
    const userId = this.currentUserId();
    const walletRef = doc(this.firestore, this.walletsCollection, walletDoc.id);

    const result = await runTransaction(this.firestore, async (transaction) => {
      const current = await transaction.get(walletRef);
      const wallet = this.toWallet(current.id, current.data() || {});

      if (wallet.memberIds.includes(userId)) {
        return { wallet, joined: false };
      }

      transaction.update(walletRef, {
        memberIds: [...wallet.memberIds, userId],
        [`contributionCentsByUser.${userId}`]: wallet.contributionCentsByUser[userId] || 0
      });
      return { wallet: { ...wallet, memberIds: [...wallet.memberIds, userId] }, joined: true };
    });

    if (!result.joined) {
      return { wallet: result.wallet, message: 'You are already a member of this wallet.', joined: false };
    }
    return { wallet: result.wallet, joined: true };
  }

  async leaveWallet(walletId: string): Promise<{ success: boolean; message?: string }> {
    const userId = this.currentUserId();
    const walletRef = doc(this.firestore, this.walletsCollection, walletId);

    const result = await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(walletRef);
      if (!snapshot.exists()) {
        return { success: false, message: 'This wallet no longer exists.' };
      }

      const wallet = this.toWallet(snapshot.id, snapshot.data());
      if (!wallet.memberIds.includes(userId)) {
        return { success: false, message: 'You do not have access to this wallet.' };
      }

      const isCreator = wallet.createdBy === userId;
      const otherMembersRemain = wallet.memberIds.some((memberId) => memberId !== userId);

      if (isCreator && otherMembersRemain) {
        return { success: false, message: 'You created this wallet.' };
      }

      if (isCreator && !otherMembersRemain) {
        if (wallet.balanceCents !== 0) {
          return {
            success: false,
            message: 'You created this wallet. Withdraw remaining funds before leaving.'
          };
        }

        transaction.delete(walletRef);
        return { success: true, deleted: true };
      }

      transaction.update(walletRef, {
        memberIds: wallet.memberIds.filter((memberId) => memberId !== userId)
      });
      return { success: true, deleted: false };
    });

    if (result.success && result.deleted) {
      await this.deleteTransactionsForWallet(walletId);
    }

    return { success: result.success, message: result.message };
  }

  async addFunds(input: {
    walletId: string;
    amountCents: number;
    paymentMethod: string;
    description: string;
  }): Promise<{ success: boolean; message?: string; transaction?: WalletTransaction }> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { success: false, message: 'Enter a valid amount greater than zero.' };
    }

    const userId = this.currentUserId();
    const walletRef = doc(this.firestore, this.walletsCollection, input.walletId);
    const txId = this.createTransactionId();
    const txRef = doc(this.firestore, this.txCollection, txId);

    return runTransaction(this.firestore, async (dbTransaction) => {
      const snapshot = await dbTransaction.get(walletRef);
      if (!snapshot.exists()) {
        return { success: false, message: 'You do not have access to this wallet.' };
      }

      const wallet = this.toWallet(snapshot.id, snapshot.data());
      if (!wallet.memberIds.includes(userId)) {
        return { success: false, message: 'You do not have access to this wallet.' };
      }

      const tx: WalletTransaction = {
        id: txId,
        walletId: wallet.id,
        type: 'deposit',
        amountCents: input.amountCents,
        userId,
        description: input.description.trim() || 'Funds added',
        paymentMethod: input.paymentMethod,
        status: 'completed',
        createdAt: Date.now()
      };

      dbTransaction.set(txRef, tx);
      dbTransaction.update(walletRef, {
        balanceCents: wallet.balanceCents + input.amountCents,
        totalInCents: wallet.totalInCents + input.amountCents,
        [`contributionCentsByUser.${userId}`]: (wallet.contributionCentsByUser[userId] || 0) + input.amountCents
      });

      return { success: true, transaction: tx };
    });
  }

  async withdrawFunds(input: {
    walletId: string;
    amountCents: number;
    category: string;
    description: string;
  }): Promise<{ success: boolean; message?: string; transaction?: WalletTransaction }> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return { success: false, message: 'Enter a valid amount greater than zero.' };
    }

    if (!input.category.trim()) {
      return { success: false, message: 'Select a category.' };
    }

    if (!input.description.trim()) {
      return { success: false, message: 'Enter a description for this expense.' };
    }

    const userId = this.currentUserId();
    const walletRef = doc(this.firestore, this.walletsCollection, input.walletId);
    const txId = this.createTransactionId();
    const txRef = doc(this.firestore, this.txCollection, txId);

    return runTransaction(this.firestore, async (dbTransaction) => {
      const snapshot = await dbTransaction.get(walletRef);
      if (!snapshot.exists()) {
        return { success: false, message: 'You do not have access to this wallet.' };
      }

      const wallet = this.toWallet(snapshot.id, snapshot.data());
      if (!wallet.memberIds.includes(userId)) {
        return { success: false, message: 'You do not have access to this wallet.' };
      }

      if (wallet.balanceCents < input.amountCents) {
        return { success: false, message: 'Amount cannot exceed the current wallet balance.' };
      }

      const tx: WalletTransaction = {
        id: txId,
        walletId: wallet.id,
        type: 'withdrawal',
        amountCents: input.amountCents,
        userId,
        description: input.description.trim(),
        category: input.category,
        status: 'completed',
        createdAt: Date.now()
      };

      dbTransaction.set(txRef, tx);
      dbTransaction.update(walletRef, {
        balanceCents: wallet.balanceCents - input.amountCents,
        totalOutCents: wallet.totalOutCents + input.amountCents
      });

      return { success: true, transaction: tx };
    });
  }

  async getDisplayNameForUser(userId: string): Promise<string> {
    const username = await this.authService.getUsernameById(userId);
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

  private async getTransactionsForWallet(walletId: string): Promise<WalletTransaction[]> {
    const txQuery = query(collection(this.firestore, this.txCollection), where('walletId', '==', walletId));
    const snapshot = await getDocs(txQuery);
    return snapshot.docs.map((docSnapshot) => this.toTransaction(docSnapshot.id, docSnapshot.data()));
  }

  private async deleteTransactionsForWallet(walletId: string): Promise<void> {
    const txQuery = query(collection(this.firestore, this.txCollection), where('walletId', '==', walletId));
    const snapshot = await getDocs(txQuery);
    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(this.firestore);
    snapshot.docs.forEach((docSnapshot) => batch.delete(docSnapshot.ref));
    await batch.commit();
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

  private toWallet(id: string, data: Record<string, unknown>): SharedWallet {
    return {
      id,
      code: (data['code'] as string) || '',
      name: (data['name'] as string) || '',
      description: (data['description'] as string) || '',
      balanceCents: (data['balanceCents'] as number) || 0,
      totalInCents: (data['totalInCents'] as number) || 0,
      totalOutCents: (data['totalOutCents'] as number) || 0,
      createdBy: (data['createdBy'] as string) || '',
      memberIds: (data['memberIds'] as string[]) || [],
      contributionCentsByUser: (data['contributionCentsByUser'] as Record<string, number>) || {}
    };
  }

  private toTransaction(id: string, data: Record<string, unknown>): WalletTransaction {
    return {
      id,
      walletId: (data['walletId'] as string) || '',
      type: (data['type'] as WalletTransactionType) || 'deposit',
      amountCents: (data['amountCents'] as number) || 0,
      userId: (data['userId'] as string) || '',
      description: (data['description'] as string) || '',
      category: data['category'] as string | undefined,
      paymentMethod: data['paymentMethod'] as string | undefined,
      status: (data['status'] as WalletTransactionStatus) || 'completed',
      createdAt: (data['createdAt'] as number) || Date.now()
    };
  }
}
