import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedWallet, SharedWalletService, WalletTransaction } from './shared-wallet.service';

@Component({
  selector: 'app-wallet-transaction-success',
  templateUrl: 'wallet-transaction-success.page.html',
  styleUrls: ['wallet-transaction-success.page.scss'],
  standalone: false
})
export class WalletTransactionSuccessPage implements OnInit {
  wallet: SharedWallet | null = null;
  transaction: WalletTransaction | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sharedWalletService: SharedWalletService
  ) {}

  ngOnInit(): void {
    const walletId = this.route.snapshot.paramMap.get('id');
    const txId = this.route.snapshot.paramMap.get('txId');

    this.wallet = walletId ? this.sharedWalletService.getWalletById(walletId) : null;
    this.transaction = txId ? this.sharedWalletService.getWalletTransactionById(txId) : null;

    if (!this.wallet || !this.transaction || this.transaction.walletId !== this.wallet.id) {
      this.router.navigate(['/tabs/shared-wallets'], { queryParams: { accessDenied: 'true' } });
    }
  }

  get title(): string {
    return this.transaction?.type === 'deposit'
      ? 'Funds added successfully'
      : 'Withdrawal recorded successfully';
  }

  get amountLabel(): string {
    return this.transaction?.type === 'deposit' ? 'Amount Added' : 'Amount Withdrawn';
  }

  get detailLabel(): string {
    return this.transaction?.type === 'deposit' ? 'Payment Method' : 'Category';
  }

  get detailValue(): string {
    if (!this.transaction) {
      return '';
    }
    return this.transaction.type === 'deposit'
      ? this.transaction.paymentMethod || 'NETS'
      : this.transaction.category || 'Other';
  }

  backToWallet(): void {
    if (this.wallet) {
      this.router.navigate(['/tabs/shared-wallets/wallet', this.wallet.id]);
    }
  }

  formatCurrency(cents: number): string {
    return this.sharedWalletService.formatCurrency(cents);
  }
}
