import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where
} from '@angular/fire/firestore';

import { AuthService } from '../auth/auth.service';
import { GAME_COINS_COLLECTION } from './coin.service';


export interface VoucherOption {
  id: string;
  title: string;
  merchantName: string;
  description: string;
  coinCost: number;
  discountAmount: number;
  minimumSpend: number;
  validityDays: number;
  emoji: string;
}


export interface UserVoucher {
  id: string;
  voucherId: string;
  title: string;
  merchantName: string;
  description: string;
  discountAmount: number;
  minimumSpend: number;
  code: string;
  redeemedAt: number;
  expiresAt: number;
  usedAt: number | null;
}


export interface VoucherResult {
  success: boolean;
  message: string;
  voucher?: UserVoucher;
}


@Injectable({
  providedIn: 'root',
})
export class RewardsService {
  private readonly vouchersCollection = 'userVouchers';

  private readonly voucherCatalog: VoucherOption[] = [

    {
      id: 'ntuc-5',
      title: '$5 NTUC Voucher',
      merchantName: 'NTUC FairPrice',
      description:
        '$5 off groceries with a minimum spend of $30.',
      coinCost: 200,
      discountAmount: 5,
      minimumSpend: 30,
      validityDays: 30,
      emoji: '🛒',
    },

    {
      id: 'grab-3',
      title: '$3 Grab Voucher',
      merchantName: 'Grab',
      description:
        '$3 off a Grab payment with a minimum spend of $15.',
      coinCost: 150,
      discountAmount: 3,
      minimumSpend: 15,
      validityDays: 30,
      emoji: '🚗',
    },

    {
      id: 'shopee-8',
      title: '$8 Shopee Voucher',
      merchantName: 'Shopee',
      description:
        '$8 off shopping with a minimum spend of $50.',
      coinCost: 300,
      discountAmount: 8,
      minimumSpend: 50,
      validityDays: 30,
      emoji: '🛍️',
    },

    {
      id: 'mcdonalds-2',
      title: '$2 McDonald’s Voucher',
      merchantName: "McDonald's",
      description:
        '$2 off food with a minimum spend of $10.',
      coinCost: 100,
      discountAmount: 2,
      minimumSpend: 10,
      validityDays: 30,
      emoji: '🍔',
    },

    {
      id: 'popular-5',
      title: '$5 Popular Voucher',
      merchantName: 'Popular Bookstore',
      description:
        '$5 off books and stationery with a minimum spend of $25.',
      coinCost: 180,
      discountAmount: 5,
      minimumSpend: 25,
      validityDays: 30,
      emoji: '📚',
    },

    {
      id: 'starbucks-2',
      title: '$2 Starbucks Voucher',
      merchantName: 'Starbucks',
      description:
        '$2 off drinks with a minimum spend of $12.',
      coinCost: 120,
      discountAmount: 2,
      minimumSpend: 12,
      validityDays: 30,
      emoji: '☕',
    },

  ];


  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {}


  /*
   * =====================================
   * CATALOG
   * =====================================
   */
  getVoucherCatalog(): VoucherOption[] {
    return this.voucherCatalog.map((voucher) => ({ ...voucher }));
  }


  /*
   * =====================================
   * ALL USER VOUCHERS
   * =====================================
   */
  async getUserVouchers(): Promise<UserVoucher[]> {
    const vouchersQuery = query(
      collection(this.firestore, this.vouchersCollection),
      where('username', '==', this.currentUsername())
    );
    const snapshot = await getDocs(vouchersQuery);
    return snapshot.docs.map((docSnapshot) => this.toUserVoucher(docSnapshot.id, docSnapshot.data()));
  }


  /*
   * =====================================
   * ACTIVE VOUCHERS
   * =====================================
   * Active means: not used, not expired.
   */
  async getActiveVouchers(): Promise<UserVoucher[]> {
    const currentTime = Date.now();
    const vouchers = await this.getUserVouchers();
    return vouchers.filter((voucher) => voucher.usedAt === null && voucher.expiresAt > currentTime);
  }


  /*
   * =====================================
   * ALL ACTIVE VOUCHERS FOR MERCHANT
   * =====================================
   * IMPORTANT: this does NOT check minimum spend, so the Pay page can
   * still show vouchers the user hasn't met the minimum spend for yet.
   */
  async getMerchantVouchers(merchantName: string): Promise<UserVoucher[]> {
    const normalizedMerchant = merchantName.trim().toLowerCase();

    if (!normalizedMerchant) {
      return [];
    }

    const activeVouchers = await this.getActiveVouchers();
    return activeVouchers.filter(
      (voucher) => voucher.merchantName.trim().toLowerCase() === normalizedMerchant
    );
  }


  /*
   * =====================================
   * ELIGIBLE VOUCHERS
   * =====================================
   */
  async getApplicableVouchers(merchantName: string, purchaseAmount: number): Promise<UserVoucher[]> {
    const merchantVouchers = await this.getMerchantVouchers(merchantName);
    return merchantVouchers.filter((voucher) => purchaseAmount >= voucher.minimumSpend);
  }


  /*
   * =====================================
   * REDEEM USING COINS
   * =====================================
   * Spending the coins and creating the voucher happen as one Firestore
   * transaction, so a redemption can never charge coins without granting
   * the voucher (or vice versa).
   */
  async redeemVoucher(voucherId: string): Promise<VoucherResult> {
    const catalogVoucher = this.voucherCatalog.find((voucher) => voucher.id === voucherId);

    if (!catalogVoucher) {
      return { success: false, message: 'Voucher could not be found.' };
    }

    const username = this.currentUsername();
    const coinsRef = doc(this.firestore, GAME_COINS_COLLECTION, username);
    const voucherRef = doc(collection(this.firestore, this.vouchersCollection));
    const userVoucher = this.createUserVoucher(catalogVoucher, voucherRef.id);

    return runTransaction(this.firestore, async (transaction) => {
      const coinsSnapshot = await transaction.get(coinsRef);
      const currentCoins = coinsSnapshot.exists() && typeof coinsSnapshot.data()['coins'] === 'number'
        ? (coinsSnapshot.data()['coins'] as number)
        : 0;

      if (catalogVoucher.coinCost > currentCoins) {
        return { success: false, message: 'You do not have enough coins.' };
      }

      transaction.set(coinsRef, { coins: currentCoins - catalogVoucher.coinCost });
      transaction.set(voucherRef, { ...userVoucher, username });

      return {
        success: true,
        message: `${catalogVoucher.title} was redeemed for ${catalogVoucher.coinCost} coins.`,
        voucher: userVoucher,
      };
    });
  }


  /*
   * =====================================
   * FREE RANDOM SCRATCH-CARD VOUCHER
   * =====================================
   * No coins are deducted.
   */
  async awardRandomVoucher(): Promise<VoucherResult> {
    if (this.voucherCatalog.length === 0) {
      return { success: false, message: 'No vouchers are currently available.' };
    }

    const randomIndex = Math.floor(Math.random() * this.voucherCatalog.length);
    return this.awardVoucher(this.voucherCatalog[randomIndex].id);
  }


  /*
   * =====================================
   * FREE SPECIFIC VOUCHER
   * =====================================
   */
  async awardVoucher(voucherId: string): Promise<VoucherResult> {
    const catalogVoucher = this.voucherCatalog.find((voucher) => voucher.id === voucherId);

    if (!catalogVoucher) {
      return { success: false, message: 'Voucher could not be found.' };
    }

    const voucherRef = doc(collection(this.firestore, this.vouchersCollection));
    const userVoucher = this.createUserVoucher(catalogVoucher, voucherRef.id);

    await setDoc(voucherRef, { ...userVoucher, username: this.currentUsername() });

    return {
      success: true,
      message: `You won ${catalogVoucher.title}! It has been added to your vouchers.`,
      voucher: userVoucher,
    };
  }


  /*
   * =====================================
   * MARK VOUCHER USED
   * =====================================
   */
  async markVoucherUsed(userVoucherId: string): Promise<VoucherResult> {
    const ref = doc(this.firestore, this.vouchersCollection, userVoucherId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      return { success: false, message: 'Voucher could not be found.' };
    }

    const voucher = this.toUserVoucher(snapshot.id, snapshot.data());

    if (voucher.usedAt !== null) {
      return { success: false, message: 'This voucher has already been used.' };
    }

    if (voucher.expiresAt <= Date.now()) {
      return { success: false, message: 'This voucher has expired.' };
    }

    const usedAt = Date.now();
    await updateDoc(ref, { usedAt });
    voucher.usedAt = usedAt;

    return { success: true, message: 'Voucher used successfully.', voucher };
  }


  private createUserVoucher(catalogVoucher: VoucherOption, id: string): UserVoucher {
    const redeemedAt = Date.now();

    return {
      id,
      voucherId: catalogVoucher.id,
      title: catalogVoucher.title,
      merchantName: catalogVoucher.merchantName,
      description: catalogVoucher.description,
      discountAmount: catalogVoucher.discountAmount,
      minimumSpend: catalogVoucher.minimumSpend,
      code: this.generateVoucherCode(),
      redeemedAt,
      expiresAt: redeemedAt + (catalogVoucher.validityDays * 24 * 60 * 60 * 1000),
      usedAt: null,
    };
  }


  private toUserVoucher(id: string, data: Record<string, unknown>): UserVoucher {
    return {
      id,
      voucherId: (data['voucherId'] as string) || '',
      title: (data['title'] as string) || '',
      merchantName: (data['merchantName'] as string) || '',
      description: (data['description'] as string) || '',
      discountAmount: (data['discountAmount'] as number) || 0,
      minimumSpend: (data['minimumSpend'] as number) || 0,
      code: (data['code'] as string) || '',
      redeemedAt: (data['redeemedAt'] as number) || 0,
      expiresAt: (data['expiresAt'] as number) || 0,
      usedAt: (data['usedAt'] as number | null) ?? null,
    };
  }


  private generateVoucherCode(): string {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HOOPS-${randomPart}`;
  }


  private currentUsername(): string {
    return this.authService.getCurrentUser()?.username.trim().toLowerCase() ?? 'guest';
  }
}
