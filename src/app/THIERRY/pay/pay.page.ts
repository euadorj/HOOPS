import {
  Component,
  OnInit,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import { AlertController } from '@ionic/angular';

import {
  FinanceData,
  MerchantPayment,
  SavingsService,
} from '../savings.service';

import {
  RewardsService,
  UserVoucher,
} from '../../game/rewards.service';

interface MerchantOption {
  name: string;
  category: string;
  icon: string;
}

@Component({
  selector: 'app-pay',
  templateUrl: './pay.page.html',
  styleUrls: ['./pay.page.scss'],
  standalone: false,
})
export class PayPage implements OnInit {
  paymentForm!: FormGroup;

  financeData: FinanceData = {
    balance: 0,
    goals: [],
  };

  merchants: MerchantOption[] = [
    {
      name: 'NTUC FairPrice',
      category: 'Groceries',
      icon: 'cart-outline',
    },
    {
      name: 'Grab',
      category: 'Transport',
      icon: 'car-outline',
    },
    {
      name: 'Shopee',
      category: 'Shopping',
      icon: 'bag-handle-outline',
    },
    {
      name: "McDonald's",
      category: 'Food',
      icon: 'fast-food-outline',
    },
    {
      name: 'Popular Bookstore',
      category: 'Books and stationery',
      icon: 'book-outline',
    },
    {
      name: 'Starbucks',
      category: 'Food and drinks',
      icon: 'cafe-outline',
    },
  ];

  selectedMerchant: MerchantOption | null = null;

  paymentHistory: MerchantPayment[] = [];
  applicableVouchers: UserVoucher[] = [];

  submitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private savingsService: SavingsService,
    private rewardsService: RewardsService,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.paymentForm = this.formBuilder.group({
      merchantName: ['', Validators.required],

      amount: [
        null,
        [
          Validators.required,
          Validators.min(0.01),
        ],
      ],

      voucherId: [''],
    });

    this.paymentForm
      .get('amount')
      ?.valueChanges.subscribe(() => {
        this.refreshApplicableVouchers();
      });

    this.loadPageData();
  }

  ionViewWillEnter(): void {
    this.loadPageData();
    this.refreshApplicableVouchers();
  }

  get selectedVoucher(): UserVoucher | null {
    const voucherId =
      String(
        this.paymentForm?.get('voucherId')?.value ?? ''
      );

    return (
      this.applicableVouchers.find(
        (voucher) => voucher.id === voucherId
      ) ?? null
    );
  }

  get originalAmount(): number {
    const amount = Number(
      this.paymentForm?.get('amount')?.value
    );

    return Number.isFinite(amount) && amount > 0
      ? amount
      : 0;
  }

  get discountAmount(): number {
    if (!this.selectedVoucher) {
      return 0;
    }

    return Math.min(
      this.selectedVoucher.discountAmount,
      this.originalAmount
    );
  }

  get finalAmount(): number {
    return Math.max(
      this.originalAmount - this.discountAmount,
      0
    );
  }

  selectMerchant(
    merchant: MerchantOption
  ): void {
    this.selectedMerchant = merchant;

    this.paymentForm.patchValue({
      merchantName: merchant.name,
      voucherId: '',
    });

    this.refreshApplicableVouchers();

    this.successMessage = '';
    this.errorMessage = '';
  }

  async confirmPayment(): Promise<void> {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const merchantName = String(
      this.paymentForm.get('merchantName')?.value ??
        ''
    ).trim();

    const voucherText = this.selectedVoucher
      ? `<br><br>Voucher: ${this.selectedVoucher.title}` +
        `<br>Discount: $${this.discountAmount.toFixed(2)}`
      : '';

    const alert =
      await this.alertController.create({
        header: 'Confirm Payment',
        message:
          `Original amount: $${this.originalAmount.toFixed(
            2
          )}` +
          voucherText +
          `<br><br>Final payment: $${this.finalAmount.toFixed(
            2
          )}`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Pay',
            handler: () => {
              this.completePayment(merchantName);
            },
          },
        ],
      });

    await alert.present();
  }

  get merchantControl() {
    return this.paymentForm.get('merchantName');
  }

  get amountControl() {
    return this.paymentForm.get('amount');
  }

  trackByPaymentId(
    index: number,
    payment: MerchantPayment
  ): string {
    return payment.id;
  }

  trackByVoucherId(
    index: number,
    voucher: UserVoucher
  ): string {
    return voucher.id;
  }

  private completePayment(
    merchantName: string
  ): void {
    const voucher = this.selectedVoucher;

    const result =
      this.savingsService.payMerchant(
        merchantName,
        this.finalAmount
      );

    if (!result.success) {
      this.errorMessage = result.message;
      this.successMessage = '';
      return;
    }

    if (voucher) {
      const voucherResult =
        this.rewardsService.markVoucherUsed(
          voucher.id
        );

      if (!voucherResult.success) {
        this.errorMessage =
          voucherResult.message;
        return;
      }
    }

    this.successMessage = voucher
      ? `$${this.finalAmount.toFixed(
          2
        )} was paid to ${merchantName}. ` +
        `You saved $${this.discountAmount.toFixed(
          2
        )} using ${voucher.title}.`
      : result.message;

    this.paymentForm.reset({
      merchantName: '',
      amount: null,
      voucherId: '',
    });

    this.selectedMerchant = null;
    this.submitted = false;

    this.loadPageData();
  }

  private refreshApplicableVouchers(): void {
    const merchantName = String(
      this.paymentForm?.get('merchantName')?.value ??
        ''
    );

    this.applicableVouchers =
      this.rewardsService.getApplicableVouchers(
        merchantName,
        this.originalAmount
      );

    const selectedVoucherId = String(
      this.paymentForm?.get('voucherId')?.value ??
        ''
    );

    const selectedStillValid =
      this.applicableVouchers.some(
        (voucher) =>
          voucher.id === selectedVoucherId
      );

    if (!selectedStillValid) {
      this.paymentForm
        ?.get('voucherId')
        ?.setValue('', {
          emitEvent: false,
        });
    }
  }

  private loadPageData(): void {
    this.financeData =
      this.savingsService.getFinanceData();

    this.paymentHistory =
      this.savingsService.getPaymentHistory();

    this.refreshApplicableVouchers();
  }
}