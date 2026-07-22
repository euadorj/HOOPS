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
  FinanceData,
  SavingsService,
} from '../savings.service';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.page.html',
  styleUrls: ['./transfer.page.scss'],
  standalone: false,
})
export class TransferPage implements OnInit {
  transferForm!: FormGroup;

  financeData: FinanceData = {
    balance: 0,
    goals: [],
  };

  submitted = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private savingsService: SavingsService
  ) {}

  ngOnInit(): void {
    this.transferForm =
      this.formBuilder.group({
        recipientUsername: [
          '',
          [
            Validators.required,
            Validators.maxLength(40),
          ],
        ],

        amount: [
          null,
          [
            Validators.required,
            Validators.min(0.01),
          ],
        ],
      });

    this.loadBalance();
  }

  ionViewWillEnter(): void {
    this.loadBalance();
  }

  transferMoney(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      return;
    }

    const recipientUsername =
      String(
        this.transferForm.get(
          'recipientUsername'
        )?.value ?? ''
      ).trim();

    const amount =
      Number(
        this.transferForm.get('amount')?.value
      );

    const result =
      this.savingsService.transferMoney(
        recipientUsername,
        amount
      );

    if (!result.success) {
      this.errorMessage = result.message;
      return;
    }

    this.successMessage = result.message;

    this.transferForm.reset({
      recipientUsername: '',
      amount: null,
    });

    this.submitted = false;
    this.loadBalance();
  }

  get recipientControl() {
    return this.transferForm.get(
      'recipientUsername'
    );
  }

  get amountControl() {
    return this.transferForm.get('amount');
  }

  private loadBalance(): void {
    this.financeData =
      this.savingsService.getFinanceData();
  }
}