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

  submitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private savingsService: SavingsService,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.paymentForm =
      this.formBuilder.group({
        merchantName: [
          '',
          Validators.required,
        ],

        amount: [
          null,
          [
            Validators.required,
            Validators.min(0.01),
          ],
        ],
      });

    this.loadPageData();
  }

  ionViewWillEnter(): void {
    this.loadPageData();
  }

  selectMerchant(
    merchant: MerchantOption
  ): void {
    this.selectedMerchant = merchant;

    this.paymentForm.patchValue({
      merchantName: merchant.name,
    });

    this.paymentForm
      .get('merchantName')
      ?.markAsTouched();

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

    const merchantName =
      String(
        this.paymentForm.get(
          'merchantName'
        )?.value ?? ''
      ).trim();

    const amount =
      Number(
        this.paymentForm.get('amount')?.value
      );

    const alert =
      await this.alertController.create({
        header: 'Confirm Payment',
        message:
          `Pay $${amount.toFixed(2)} ` +
          `to ${merchantName}?`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Pay',
            handler: () => {
              this.completePayment(
                merchantName,
                amount
              );
            },
          },
        ],
      });

    await alert.present();
  }

  get merchantControl() {
    return this.paymentForm.get(
      'merchantName'
    );
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

  private completePayment(
    merchantName: string,
    amount: number
  ): void {
    const result =
      this.savingsService.payMerchant(
        merchantName,
        amount
      );

    if (!result.success) {
      this.errorMessage = result.message;
      this.successMessage = '';
      return;
    }

    this.successMessage = result.message;
    this.errorMessage = '';

    this.paymentForm.reset({
      merchantName: '',
      amount: null,
    });

    this.selectedMerchant = null;
    this.submitted = false;

    this.loadPageData();
  }

  private loadPageData(): void {
    this.financeData =
      this.savingsService.getFinanceData();

    this.paymentHistory =
      this.savingsService.getPaymentHistory();
  }
}