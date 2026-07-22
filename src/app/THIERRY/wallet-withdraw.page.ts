import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedWallet, SharedWalletService } from './shared-wallet.service';

@Component({
  selector: 'app-wallet-withdraw',
  templateUrl: 'wallet-withdraw.page.html',
  styleUrls: ['wallet-withdraw.page.scss'],
  standalone: false
})
export class WalletWithdrawPage implements OnInit {
  wallet: SharedWallet | null = null;
  amountInput = '';
  selectedCategory = '';
  description = '';
  errorMessage = '';
  submitting = false;

  readonly categories = ['Food', 'Shopping', 'Transport', 'Home', 'Travel', 'Fun', 'Other'];

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
    this.errorMessage = '';
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.errorMessage = '';
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

    if (amountCents > this.wallet.balanceCents) {
      this.errorMessage = 'Insufficient wallet balance.';
      return;
    }

    if (!this.selectedCategory) {
      this.errorMessage = 'Select a category.';
      return;
    }

    if (!this.description.trim()) {
      this.errorMessage = 'Description is required.';
      return;
    }

    this.submitting = true;
    const result = this.sharedWalletService.withdrawFunds({
      walletId: this.wallet.id,
      amountCents,
      category: this.selectedCategory,
      description: this.description
    });
    this.submitting = false;

    if (!result.success || !result.transaction) {
      this.errorMessage = result.message === 'Amount cannot exceed the current wallet balance.'
        ? 'Insufficient wallet balance.'
        : (result.message || 'Unable to record this withdrawal.');
      this.loadWallet();
      return;
    }

    this.router.navigate(['/tabs/shared-wallets/wallet', this.wallet.id, 'success', result.transaction.id]);
  }

  formatCurrency(cents: number): string {
    return this.sharedWalletService.formatCurrency(cents);
  }

  get withdrawalAmountCents(): number | null {
    return this.sharedWalletService.parseAmountToCents(this.amountInput);
  }

  get hasValidWithdrawalAmount(): boolean {
    const amountCents = this.withdrawalAmountCents;
    return amountCents !== null && amountCents > 0;
  }

  get balanceAfterWithdrawalCents(): number | null {
    if (!this.wallet || !this.hasValidWithdrawalAmount) {
      return null;
    }

    const amountCents = this.withdrawalAmountCents as number;
    const remaining = this.wallet.balanceCents - amountCents;
    return remaining >= 0 ? remaining : null;
  }
}
