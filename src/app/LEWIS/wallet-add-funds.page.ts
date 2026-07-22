import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedWallet, SharedWalletService } from './shared-wallet.service';

@Component({
  selector: 'app-wallet-add-funds',
  templateUrl: 'wallet-add-funds.page.html',
  styleUrls: ['wallet-add-funds.page.scss'],
  standalone: false
})
export class WalletAddFundsPage implements OnInit {
  wallet: SharedWallet | null = null;
  amountInput = '';
  selectedPaymentMethod = 'NETS - DBS';
  errorMessage = '';
  submitting = false;

  readonly presetAmounts = [5000, 10000, 20000, 50000];
  readonly paymentMethods = [
    { id: 'dbs', name: 'NETS - DBS', subtitle: 'DBS ••1234', badge: 'DBS', color: '#ff6d8c' },
    { id: 'ocbc', name: 'NETS - OCBC', subtitle: 'OCBC ••5678', badge: 'OCBC', color: '#4c7cff' },
    { id: 'uob', name: 'NETS - UOB', subtitle: 'UOB ••9012', badge: 'UOB', color: '#4a90e2' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sharedWalletService: SharedWalletService
  ) {}

  ngOnInit(): void {
    this.loadWallet();
  }

  loadWallet(): void {
    const walletId = this.route.snapshot.paramMap.get('id');
    this.wallet = walletId ? this.sharedWalletService.getWalletById(walletId) : null;
    if (!this.wallet) {
      this.router.navigate(['/tabs/shared-wallets'], { queryParams: { accessDenied: 'true' } });
    }
  }

  sanitizeAmount(value: string): void {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1
      ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`
      : parts[0];
    this.amountInput = normalized;
  }

  setPreset(cents: number): void {
    this.amountInput = (cents / 100).toFixed(2);
    this.errorMessage = '';
  }

  selectPaymentMethod(methodName: string): void {
    this.selectedPaymentMethod = methodName;
  }

  submit(): void {
    if (!this.wallet || this.submitting) {
      return;
    }

    this.errorMessage = '';
    const amountCents = this.sharedWalletService.parseAmountToCents(this.amountInput);
    if (amountCents === null || amountCents <= 0) {
      this.errorMessage = 'Amount is required and must be greater than zero.';
      return;
    }

    if (amountCents > 100000000) {
      this.errorMessage = 'Amount exceeds the transaction limit.';
      return;
    }

    this.submitting = true;
    const result = this.sharedWalletService.addFunds({
      walletId: this.wallet.id,
      amountCents,
      paymentMethod: this.selectedPaymentMethod,
      description: 'Wallet contribution'
    });
    this.submitting = false;

    if (!result.success || !result.transaction) {
      this.errorMessage = result.message || 'Unable to add funds right now.';
      return;
    }

    this.router.navigate(['/tabs/shared-wallets/wallet', this.wallet.id, 'success', result.transaction.id]);
  }

  formatCurrency(cents: number): string {
    return this.sharedWalletService.formatCurrency(cents);
  }
}
