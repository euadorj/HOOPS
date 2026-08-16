import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SharedWalletService } from './shared-wallet.service';

@Component({
  selector: 'app-create-shared-wallet',
  templateUrl: 'create-shared-wallet.page.html',
  styleUrls: ['create-shared-wallet.page.scss'],
  standalone: false
})
export class CreateSharedWalletPage {
  walletName = '';
  walletCode = '';
  description = '';
  validationMessage = '';
  creationError = '';
  submitting = false;

  constructor(private router: Router, private sharedWalletService: SharedWalletService) {}

  async create(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.creationError = '';
    const name = this.walletName.trim();
    const code = this.walletCode.trim();
    const errors: string[] = [];

    if (!name) {
      errors.push('Enter a wallet name.');
    }
    if (!/^\d{6}$/.test(code)) {
      errors.push('Enter a valid six-digit wallet code.');
    } else if (await this.sharedWalletService.hasWalletCode(code)) {
      errors.push('That wallet code is already in use. Choose another one.');
    }

    this.validationMessage = errors.join(' ');
    if (errors.length) {
      return;
    }

    this.submitting = true;
    const wallet = await this.sharedWalletService.createWallet(name, code, this.description);
    this.submitting = false;

    if (!wallet) {
      this.creationError = 'That wallet code was just taken. Choose another one.';
      return;
    }
    this.router.navigate(['/tabs/shared-wallets/wallet', wallet.id]);
  }
}
