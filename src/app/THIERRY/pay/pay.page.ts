import {
  Component,
  OnInit,
} from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import {
  AlertController,
} from '@ionic/angular';

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
export class PayPage
  implements OnInit {

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


  selectedMerchant:
    MerchantOption | null = null;


  paymentHistory:
    MerchantPayment[] = [];


  /*
   * IMPORTANT:
   *
   * This now contains ALL active vouchers
   * for the selected merchant.
   *
   * This includes vouchers that do not
   * currently meet minimum spend.
   */
  merchantVouchers:
    UserVoucher[] = [];


  submitted = false;

  successMessage = '';

  errorMessage = '';


  constructor(
    private formBuilder:
      FormBuilder,

    private savingsService:
      SavingsService,

    private rewardsService:
      RewardsService,

    private alertController:
      AlertController
  ) {}


  /*
   * =====================================
   * INITIALISE
   * =====================================
   */

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
            Validators.min(
              0.01
            ),
          ],
        ],

        voucherId: [
          '',
        ],

      });


    /*
     * Every time payment amount changes,
     * re-check voucher eligibility.
     */
    this.paymentForm
      .get('amount')
      ?.valueChanges
      .subscribe(
        () => {

          this.refreshMerchantVouchers();

        }
      );


    this.loadPageData();
  }


  /*
   * Every time user returns to
   * Pay page, reload vouchers.
   *
   * This means a newly won Scratch
   * Card voucher appears automatically.
   */
  ionViewWillEnter(): void {

    this.loadPageData();

    this.refreshMerchantVouchers();
  }


  /*
   * =====================================
   * SELECTED VOUCHER
   * =====================================
   */

  get selectedVoucher():
    UserVoucher | null {

    const voucherId =
      String(
        this.paymentForm
          ?.get('voucherId')
          ?.value
        ??
        ''
      );


    const voucher =
      this.merchantVouchers.find(
        (item) =>
          item.id ===
          voucherId
      );


    /*
     * Extra safety:
     *
     * Even if someone somehow modifies
     * the select value manually,
     * an ineligible voucher is not used.
     */
    if (
      !voucher ||
      !this.isVoucherEligible(
        voucher
      )
    ) {

      return null;
    }


    return voucher;
  }


  /*
   * =====================================
   * PAYMENT AMOUNT
   * =====================================
   */

  get originalAmount(): number {

    const amount =
      Number(
        this.paymentForm
          ?.get('amount')
          ?.value
      );


    return (
      Number.isFinite(
        amount
      ) &&
      amount > 0
        ? amount
        : 0
    );
  }


  /*
   * =====================================
   * DISCOUNT
   * =====================================
   */

  get discountAmount(): number {

    if (
      !this.selectedVoucher
    ) {

      return 0;
    }


    return Math.min(
      this.selectedVoucher
        .discountAmount,

      this.originalAmount
    );
  }


  /*
   * =====================================
   * FINAL PAYMENT
   * =====================================
   */

  get finalAmount(): number {

    return Math.max(
      this.originalAmount -
      this.discountAmount,
      0
    );
  }


  /*
   * =====================================
   * VOUCHER ELIGIBILITY
   * =====================================
   */

  isVoucherEligible(
    voucher: UserVoucher
  ): boolean {

    return (
      this.originalAmount >=
      voucher.minimumSpend
    );
  }


  /*
   * =====================================
   * AMOUNT STILL NEEDED
   * =====================================
   */

  getAmountNeededForVoucher(
    voucher: UserVoucher
  ): number {

    return Math.max(
      voucher.minimumSpend -
      this.originalAmount,
      0
    );
  }


  /*
   * =====================================
   * VOUCHER DISPLAY TEXT
   * =====================================
   */

  getVoucherOptionText(
    voucher: UserVoucher
  ): string {

    if (
      this.isVoucherEligible(
        voucher
      )
    ) {

      return (
        `${voucher.title} — ` +
        `Save $${voucher.discountAmount.toFixed(2)} — ` +
        'Available'
      );
    }


    const amountNeeded =
      this.getAmountNeededForVoucher(
        voucher
      );


    return (
      `${voucher.title} — ` +
      `Save $${voucher.discountAmount.toFixed(2)} — ` +
      `Min. spend $${voucher.minimumSpend.toFixed(2)} — ` +
      `Spend $${amountNeeded.toFixed(2)} more`
    );
  }


  /*
   * =====================================
   * MERCHANT SELECTION
   * =====================================
   */

  selectMerchant(
    merchant: MerchantOption
  ): void {

    this.selectedMerchant =
      merchant;


    this.paymentForm.patchValue({

      merchantName:
        merchant.name,

      voucherId:
        '',

    });


    this.refreshMerchantVouchers();


    this.successMessage =
      '';


    this.errorMessage =
      '';
  }


  /*
   * =====================================
   * CONFIRM PAYMENT
   * =====================================
   */

  async confirmPayment():
    Promise<void> {

    this.submitted =
      true;


    this.successMessage =
      '';


    this.errorMessage =
      '';


    if (
      this.paymentForm.invalid
    ) {

      this.paymentForm
        .markAllAsTouched();


      return;
    }


    const merchantName =
      String(
        this.paymentForm
          .get('merchantName')
          ?.value
        ??
        ''
      )
        .trim();


    /*
     * Extra check:
     *
     * If voucher ID exists but voucher
     * is no longer eligible, stop.
     */
    const selectedVoucherId =
      String(
        this.paymentForm
          .get('voucherId')
          ?.value
        ??
        ''
      );


    if (
      selectedVoucherId
    ) {

      const rawVoucher =
        this.merchantVouchers.find(
          (voucher) =>
            voucher.id ===
            selectedVoucherId
        );


      if (
        rawVoucher &&
        !this.isVoucherEligible(
          rawVoucher
        )
      ) {

        this.errorMessage =
          `This voucher requires a minimum spend of ` +
          `$${rawVoucher.minimumSpend.toFixed(2)}.`;


        return;
      }
    }


    /*
     * Balance check before confirmation.
     */
    if (
      this.finalAmount >
      this.financeData.balance
    ) {

      this.errorMessage =
        'You do not have enough available balance.';


      return;
    }


    const voucherText =
      this.selectedVoucher
        ?
          `<br><br>` +
          `Voucher: ${this.selectedVoucher.title}` +
          `<br>` +
          `Discount: $${this.discountAmount.toFixed(2)}`
        :
          '';


    const alert =
      await this
        .alertController
        .create({

          header:
            'Confirm Payment',

          message:
            `Merchant: ${merchantName}` +
            `<br>` +
            `Original amount: $${this.originalAmount.toFixed(2)}` +
            voucherText +
            `<br><br>` +
            `<strong>Final payment: $${this.finalAmount.toFixed(2)}</strong>`,

          buttons: [

            {
              text:
                'Cancel',

              role:
                'cancel',
            },

            {
              text:
                'Pay',

              handler:
                () => {

                  this.completePayment(
                    merchantName
                  );

                },
            },

          ],
        });


    await alert.present();
  }


  /*
   * =====================================
   * FORM GETTERS
   * =====================================
   */

  get merchantControl() {

    return this.paymentForm
      .get(
        'merchantName'
      );
  }


  get amountControl() {

    return this.paymentForm
      .get(
        'amount'
      );
  }


  /*
   * =====================================
   * TRACK BY
   * =====================================
   */

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


  /*
   * =====================================
   * COMPLETE PAYMENT
   * =====================================
   */

  private completePayment(
    merchantName: string
  ): void {

    const voucher =
      this.selectedVoucher;


    /*
     * Re-check voucher before payment.
     */
    if (
      voucher &&
      !this.isVoucherEligible(
        voucher
      )
    ) {

      this.errorMessage =
        `You need to spend at least ` +
        `$${voucher.minimumSpend.toFixed(2)} ` +
        `to use ${voucher.title}.`;


      return;
    }


    /*
     * Pay final discounted amount.
     */
    const result =
      this.savingsService
        .payMerchant(
          merchantName,
          this.finalAmount
        );


    if (
      !result.success
    ) {

      this.errorMessage =
        result.message;


      this.successMessage =
        '';


      return;
    }


    /*
     * If voucher was selected,
     * mark it as used.
     */
    if (voucher) {

      const voucherResult =
        this.rewardsService
          .markVoucherUsed(
            voucher.id
          );


      if (
        !voucherResult.success
      ) {

        this.errorMessage =
          voucherResult.message;


        /*
         * Payment was completed,
         * so refresh all values.
         */
        this.loadPageData();


        return;
      }
    }


    /*
     * Success message.
     */
    this.successMessage =
      voucher
        ?
          `$${this.finalAmount.toFixed(2)} was paid to ` +
          `${merchantName}. You saved ` +
          `$${this.discountAmount.toFixed(2)} using ` +
          `${voucher.title}.`
        :
          result.message;


    this.errorMessage =
      '';


    /*
     * Reset form.
     */
    this.paymentForm.reset({

      merchantName:
        '',

      amount:
        null,

      voucherId:
        '',

    });


    this.selectedMerchant =
      null;


    this.submitted =
      false;


    /*
     * Refresh balance, payment history
     * and voucher wallet.
     */
    this.loadPageData();


    /*
     * Tell homepage rewards count
     * may have changed.
     */
    window.dispatchEvent(
      new CustomEvent(
        'rewards-updated'
      )
    );
  }


  /*
   * =====================================
   * LOAD VOUCHERS FOR MERCHANT
   * =====================================
   */

  private refreshMerchantVouchers():
    void {

    if (
      !this.paymentForm
    ) {

      return;
    }


    const merchantName =
      String(
        this.paymentForm
          .get('merchantName')
          ?.value
        ??
        ''
      );


    /*
     * IMPORTANT CHANGE:
     *
     * We get ALL active vouchers
     * for the merchant.
     *
     * Minimum spend does NOT hide them.
     */
    this.merchantVouchers =
      this.rewardsService
        .getMerchantVouchers(
          merchantName
        );


    const selectedVoucherId =
      String(
        this.paymentForm
          .get('voucherId')
          ?.value
        ??
        ''
      );


    if (
      !selectedVoucherId
    ) {

      return;
    }


    const selectedVoucher =
      this.merchantVouchers.find(
        (voucher) =>
          voucher.id ===
          selectedVoucherId
      );


    /*
     * Clear selection when:
     *
     * - voucher disappeared
     * - expired
     * - used
     * - amount dropped below min spend
     */
    if (
      !selectedVoucher ||
      !this.isVoucherEligible(
        selectedVoucher
      )
    ) {

      this.paymentForm
        .get('voucherId')
        ?.setValue(
          '',
          {
            emitEvent:
              false,
          }
        );
    }
  }


  /*
   * =====================================
   * LOAD PAGE
   * =====================================
   */

  private loadPageData():
    void {

    this.financeData =
      this.savingsService
        .getFinanceData();


    this.paymentHistory =
      this.savingsService
        .getPaymentHistory();


    this.refreshMerchantVouchers();
  }
}