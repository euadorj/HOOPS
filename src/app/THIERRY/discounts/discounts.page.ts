import {
  Component,
  OnInit,
} from '@angular/core';

import { AlertController } from '@ionic/angular';

import { CoinService } from '../../game/coin.service';

import {
  RewardsService,
  UserVoucher,
  VoucherOption,
} from '../../game/rewards.service';

@Component({
  selector: 'app-discounts',
  templateUrl: './discounts.page.html',
  styleUrls: ['./discounts.page.scss'],
  standalone: false,
})
export class DiscountsPage implements OnInit {
  coinBalance = 0;

  voucherCatalog: VoucherOption[] = [];
  userVouchers: UserVoucher[] = [];

  successMessage = '';
  errorMessage = '';

  constructor(
    private coinService: CoinService,
    private rewardsService: RewardsService,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.loadPageData();
  }

  ionViewWillEnter(): void {
    this.loadPageData();
  }

  async confirmRedeem(
    voucher: VoucherOption
  ): Promise<void> {
    this.clearMessages();

    const alert = await this.alertController.create({
      header: 'Redeem Voucher?',
      message:
        `Redeem ${voucher.title} for ` +
        `${voucher.coinCost} coins?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Redeem',
          handler: () => {
            this.redeemVoucher(voucher.id);
          },
        },
      ],
    });

    await alert.present();
  }

  redeemVoucher(voucherId: string): void {
    const result =
      this.rewardsService.redeemVoucher(voucherId);

    if (!result.success) {
      this.errorMessage = result.message;
      this.successMessage = '';
      return;
    }

    this.successMessage = result.message;
    this.errorMessage = '';

    this.loadPageData();
  }

  isVoucherExpired(voucher: UserVoucher): boolean {
    return voucher.expiresAt <= Date.now();
  }

  getVoucherStatus(voucher: UserVoucher): string {
    if (voucher.usedAt !== null) {
      return 'Used';
    }

    if (this.isVoucherExpired(voucher)) {
      return 'Expired';
    }

    return 'Available';
  }

  trackByCatalogId(
    index: number,
    voucher: VoucherOption
  ): string {
    return voucher.id;
  }

  trackByVoucherId(
    index: number,
    voucher: UserVoucher
  ): string {
    return voucher.id;
  }

  private loadPageData(): void {
    this.coinBalance = this.coinService.getCoins();

    this.voucherCatalog =
      this.rewardsService.getVoucherCatalog();

    this.userVouchers =
      this.rewardsService.getUserVouchers();
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}