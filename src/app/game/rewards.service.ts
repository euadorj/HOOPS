import { Injectable } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { CoinService } from './coin.service';


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
    private coinService: CoinService
  ) {}


  /*
   * =====================================
   * CATALOG
   * =====================================
   */

  getVoucherCatalog(): VoucherOption[] {

    return this.voucherCatalog.map(
      (voucher) => ({
        ...voucher,
      })
    );
  }


  /*
   * =====================================
   * ALL USER VOUCHERS
   * =====================================
   */

  getUserVouchers(): UserVoucher[] {

    try {

      const storedValue =
        localStorage.getItem(
          this.getVoucherStorageKey()
        );


      if (!storedValue) {
        return [];
      }


      const parsedValue: unknown =
        JSON.parse(
          storedValue
        );


      if (!Array.isArray(parsedValue)) {
        return [];
      }


      return parsedValue.filter(
        (
          item
        ): item is UserVoucher =>
          this.isUserVoucher(
            item
          )
      );

    } catch (error) {

      console.warn(
        'Unable to load user vouchers:',
        error
      );


      return [];
    }
  }


  /*
   * =====================================
   * ACTIVE VOUCHERS
   * =====================================
   *
   * Active means:
   *
   * - not used
   * - not expired
   */

  getActiveVouchers(): UserVoucher[] {

    const currentTime =
      Date.now();


    return this
      .getUserVouchers()
      .filter(
        (voucher) =>
          voucher.usedAt === null &&
          voucher.expiresAt >
            currentTime
      );
  }


  /*
   * =====================================
   * ALL ACTIVE VOUCHERS FOR MERCHANT
   * =====================================
   *
   * IMPORTANT:
   *
   * This DOES NOT check minimum spend.
   *
   * The Pay page uses this so vouchers
   * still appear even when the user has
   * not met the minimum spend yet.
   */

  getMerchantVouchers(
    merchantName: string
  ): UserVoucher[] {

    const normalizedMerchant =
      merchantName
        .trim()
        .toLowerCase();


    if (!normalizedMerchant) {
      return [];
    }


    return this
      .getActiveVouchers()
      .filter(
        (voucher) =>
          voucher
            .merchantName
            .trim()
            .toLowerCase() ===
          normalizedMerchant
      );
  }


  /*
   * =====================================
   * ELIGIBLE VOUCHERS
   * =====================================
   *
   * Keep this because other parts of
   * your app may already use it.
   */

  getApplicableVouchers(
    merchantName: string,
    purchaseAmount: number
  ): UserVoucher[] {

    return this
      .getMerchantVouchers(
        merchantName
      )
      .filter(
        (voucher) =>
          purchaseAmount >=
          voucher.minimumSpend
      );
  }


  /*
   * =====================================
   * REDEEM USING COINS
   * =====================================
   */

  redeemVoucher(
    voucherId: string
  ): VoucherResult {

    const catalogVoucher =
      this.voucherCatalog.find(
        (voucher) =>
          voucher.id ===
          voucherId
      );


    if (!catalogVoucher) {

      return {
        success: false,
        message:
          'Voucher could not be found.',
      };
    }


    const spendResult =
      this.coinService.spendCoins(
        catalogVoucher.coinCost
      );


    if (!spendResult.success) {

      return {
        success: false,
        message:
          spendResult.message,
      };
    }


    const userVoucher =
      this.createUserVoucher(
        catalogVoucher
      );


    this.addVoucherToWallet(
      userVoucher
    );


    return {
      success: true,

      message:
        `${catalogVoucher.title} was redeemed for ` +
        `${catalogVoucher.coinCost} coins.`,

      voucher:
        userVoucher,
    };
  }


  /*
   * =====================================
   * FREE RANDOM SCRATCH-CARD VOUCHER
   * =====================================
   *
   * No coins are deducted.
   */

  awardRandomVoucher(): VoucherResult {

    if (
      this.voucherCatalog.length === 0
    ) {

      return {
        success: false,
        message:
          'No vouchers are currently available.',
      };
    }


    const randomIndex =
      Math.floor(
        Math.random() *
        this.voucherCatalog.length
      );


    const catalogVoucher =
      this.voucherCatalog[
        randomIndex
      ];


    const userVoucher =
      this.createUserVoucher(
        catalogVoucher
      );


    this.addVoucherToWallet(
      userVoucher
    );


    return {
      success: true,

      message:
        `You won ${catalogVoucher.title}! ` +
        'It has been added to your vouchers.',

      voucher:
        userVoucher,
    };
  }


  /*
   * =====================================
   * FREE SPECIFIC VOUCHER
   * =====================================
   */

  awardVoucher(
    voucherId: string
  ): VoucherResult {

    const catalogVoucher =
      this.voucherCatalog.find(
        (voucher) =>
          voucher.id ===
          voucherId
      );


    if (!catalogVoucher) {

      return {
        success: false,
        message:
          'Voucher could not be found.',
      };
    }


    const userVoucher =
      this.createUserVoucher(
        catalogVoucher
      );


    this.addVoucherToWallet(
      userVoucher
    );


    return {
      success: true,

      message:
        `You won ${catalogVoucher.title}! ` +
        'It has been added to your vouchers.',

      voucher:
        userVoucher,
    };
  }


  /*
   * =====================================
   * MARK VOUCHER USED
   * =====================================
   */

  markVoucherUsed(
    userVoucherId: string
  ): VoucherResult {

    const userVouchers =
      this.getUserVouchers();


    const voucher =
      userVouchers.find(
        (item) =>
          item.id ===
          userVoucherId
      );


    if (!voucher) {

      return {
        success: false,
        message:
          'Voucher could not be found.',
      };
    }


    if (
      voucher.usedAt !== null
    ) {

      return {
        success: false,
        message:
          'This voucher has already been used.',
      };
    }


    if (
      voucher.expiresAt <=
      Date.now()
    ) {

      return {
        success: false,
        message:
          'This voucher has expired.',
      };
    }


    voucher.usedAt =
      Date.now();


    this.saveUserVouchers(
      userVouchers
    );


    return {
      success: true,
      message:
        'Voucher used successfully.',
      voucher,
    };
  }


  /*
   * =====================================
   * CREATE USER VOUCHER
   * =====================================
   */

  private createUserVoucher(
    catalogVoucher: VoucherOption
  ): UserVoucher {

    const redeemedAt =
      Date.now();


    return {

      id:
        `user-voucher-${redeemedAt}-` +
        `${Math.floor(
          Math.random() *
          100000
        )}`,

      voucherId:
        catalogVoucher.id,

      title:
        catalogVoucher.title,

      merchantName:
        catalogVoucher.merchantName,

      description:
        catalogVoucher.description,

      discountAmount:
        catalogVoucher.discountAmount,

      minimumSpend:
        catalogVoucher.minimumSpend,

      code:
        this.generateVoucherCode(),

      redeemedAt,

      expiresAt:
        redeemedAt +
        (
          catalogVoucher.validityDays *
          24 *
          60 *
          60 *
          1000
        ),

      usedAt:
        null,
    };
  }


  /*
   * =====================================
   * ADD TO WALLET
   * =====================================
   */

  private addVoucherToWallet(
    voucher: UserVoucher
  ): void {

    const vouchers =
      this.getUserVouchers();


    vouchers.unshift(
      voucher
    );


    this.saveUserVouchers(
      vouchers
    );
  }


  /*
   * =====================================
   * SAVE
   * =====================================
   */

  private saveUserVouchers(
    vouchers: UserVoucher[]
  ): void {

    try {

      localStorage.setItem(
        this.getVoucherStorageKey(),
        JSON.stringify(
          vouchers
        )
      );

    } catch (error) {

      console.warn(
        'Unable to save vouchers:',
        error
      );
    }
  }


  /*
   * =====================================
   * STORAGE KEY
   * =====================================
   */

  private getVoucherStorageKey(): string {

    return (
      `userVouchers_${this.getCurrentUsername()}`
    );
  }


  private getCurrentUsername(): string {

    return (
      this.authService
        .getCurrentUser()
        ?.username
        .trim()
        .toLowerCase()
      ??
      'guest'
    );
  }


  /*
   * =====================================
   * CODE GENERATION
   * =====================================
   */

  private generateVoucherCode(): string {

    const randomPart =
      Math.random()
        .toString(36)
        .substring(
          2,
          8
        )
        .toUpperCase();


    return (
      `HOOPS-${randomPart}`
    );
  }


  /*
   * =====================================
   * VALIDATE STORED DATA
   * =====================================
   */

  private isUserVoucher(
    value: unknown
  ): value is UserVoucher {

    if (
      !value ||
      typeof value !== 'object'
    ) {

      return false;
    }


    const voucher =
      value as
        Partial<UserVoucher>;


    return (

      typeof voucher.id ===
        'string'

      &&

      typeof voucher.voucherId ===
        'string'

      &&

      typeof voucher.title ===
        'string'

      &&

      typeof voucher.merchantName ===
        'string'

      &&

      typeof voucher.description ===
        'string'

      &&

      typeof voucher.discountAmount ===
        'number'

      &&

      typeof voucher.minimumSpend ===
        'number'

      &&

      typeof voucher.code ===
        'string'

      &&

      typeof voucher.redeemedAt ===
        'number'

      &&

      typeof voucher.expiresAt ===
        'number'

      &&

      (
        typeof voucher.usedAt ===
          'number'

        ||

        voucher.usedAt ===
          null
      )
    );
  }
}