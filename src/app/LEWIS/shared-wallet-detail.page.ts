import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import {
  ContributorSummary,
  SharedWallet,
  SharedWalletService,
  WalletTransaction
} from './shared-wallet.service';

@Component({
  selector: 'app-shared-wallet-detail',
  templateUrl: 'shared-wallet-detail.page.html',
  styleUrls: ['shared-wallet-detail.page.scss'],
  standalone: false
})
export class SharedWalletDetailPage implements OnInit {
  wallet: SharedWallet | null = null;
  contributors: ContributorSummary[] = [];
  recentActivity: WalletTransaction[] = [];
  loading = true;
  leaveError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private sharedWalletService: SharedWalletService
  ) {}

  ngOnInit(): void {
    this.loadWallet();
  }

  ionViewWillEnter(): void {
    this.loadWallet();
  }

  loadWallet(): void {
    this.loading = true;
    const id = this.route.snapshot.paramMap.get('id');
    this.wallet = id ? this.sharedWalletService.getWalletById(id) : null;

    if (!this.wallet) {
      this.loading = false;
      this.router.navigate(['/tabs/shared-wallets'], { queryParams: { accessDenied: 'true' } });
      return;
    }

    this.contributors = this.sharedWalletService.getContributorSummaries(this.wallet.id);
    this.recentActivity = this.sharedWalletService.getRecentCompletedTransactions(this.wallet.id, 3);
    this.loading = false;
  }

  async copyWalletCode(): Promise<void> {
    if (!this.wallet) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.wallet.code);
      }
    } catch {
      // Clipboard support can vary by runtime.
    }
  }

  goToAddFunds(): void {
    if (this.wallet) {
      this.router.navigate(['/tabs/shared-wallets/wallet', this.wallet.id, 'add-funds']);
    }
  }

  goToWithdraw(): void {
    if (this.wallet) {
      this.router.navigate(['/tabs/shared-wallets/wallet', this.wallet.id, 'withdraw']);
    }
  }

  async confirmLeaveWallet(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Leave Wallet?',
      message: 'Are you sure you want to leave this shared wallet? You will need the wallet code to join again.',
      buttons: [
        {
          text: 'No, Stay',
          role: 'cancel'
        },
        {
          text: 'Yes, Leave Wallet',
          role: 'destructive',
          handler: () => this.leaveWallet()
        }
      ]
    });

    await alert.present();
  }

  async leaveWallet(): Promise<void> {
    if (!this.wallet) {
      return;
    }

    const result = this.sharedWalletService.leaveWallet(this.wallet.id);
    if (!result.success) {
      this.leaveError = result.message || 'Unable to leave wallet.';
      return;
    }

    this.leaveError = '';
    await this.router.navigate(['/tabs/shared-wallets']);
  }

  formatCurrency(cents: number): string {
    return this.sharedWalletService.formatCurrency(cents);
  }

  formatActivityAmount(tx: WalletTransaction): string {
    const value = this.formatCurrency(tx.amountCents);
    return tx.type === 'deposit' ? `+${value}` : `-${value}`;
  }

  formatActivityMeta(tx: WalletTransaction): string {
    const name = this.sharedWalletService.getDisplayNameForUser(tx.userId);
    const typeLabel = tx.type === 'deposit' ? 'Deposit' : 'Withdrawal';
    return `${typeLabel} · ${name} · ${new Date(tx.createdAt).toLocaleString()}`;
  }
}
