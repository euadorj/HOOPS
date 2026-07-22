import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SharedWallet, SharedWalletService } from './shared-wallet.service';

@Component({
  selector: 'app-shared-wallets',
  templateUrl: 'shared-wallets.page.html',
  styleUrls: ['shared-wallets.page.scss'],
  standalone: false,
})
export class SharedWalletsPage implements OnInit {
  wallets: SharedWallet[] = [];
  walletCode = '';
  loading = true;
  joinError = '';
  joinMessage = '';
  accessMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sharedWalletService: SharedWalletService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.accessMessage = params['accessDenied'] === 'true'
        ? 'You do not have access to this wallet.'
        : '';
    });
    this.refreshWallets();
  }

  ionViewWillEnter(): void {
    this.refreshWallets();
  }

  refreshWallets(): void {
    this.loading = true;
    this.wallets = this.sharedWalletService.getWalletsForCurrentUser();
    this.loading = false;
  }

  joinWallet(): void {
    const code = this.walletCode.trim();
    this.joinError = '';
    this.joinMessage = '';

    if (!/^\d{6}$/.test(code)) {
      this.joinError = 'Enter a valid wallet code.';
      return;
    }

    const result = this.sharedWalletService.joinWallet(code);
    if (!result.wallet) {
      this.joinError = result.message || 'No wallet was found with that code.';
      return;
    }

    if (result.message) {
      this.joinMessage = result.message;
      this.router.navigate(['/tabs/shared-wallets/wallet', result.wallet.id]);
      return;
    }

    this.joinMessage = 'Wallet joined successfully.';
    this.refreshWallets();
    this.router.navigate(['/tabs/shared-wallets/wallet', result.wallet.id]);
  }

  createWallet(): void {
    this.router.navigate(['/tabs/shared-wallets/create']);
  }

  openWallet(wallet: SharedWallet): void {
    this.router.navigate(['/tabs/shared-wallets/wallet', wallet.id]);
  }

  formatBalance(balanceCents: number): string {
    return `$${(balanceCents / 100).toFixed(2)}`;
  }
}
