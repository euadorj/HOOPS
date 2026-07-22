import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SharedWalletsPage } from './shared-wallets.page';
import { CreateSharedWalletPage } from './create-shared-wallet.page';
import { SharedWalletDetailPage } from './shared-wallet-detail.page';
import { WalletAddFundsPage } from './wallet-add-funds.page';
import { WalletWithdrawPage } from './wallet-withdraw.page';
import { WalletTransactionSuccessPage } from './wallet-transaction-success.page';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: SharedWalletsPage },
      { path: 'create', component: CreateSharedWalletPage },
      { path: 'wallet/:id', component: SharedWalletDetailPage },
      { path: 'wallet/:id/add-funds', component: WalletAddFundsPage },
      { path: 'wallet/:id/withdraw', component: WalletWithdrawPage },
      { path: 'wallet/:id/success/:txId', component: WalletTransactionSuccessPage }
    ])
  ],
  declarations: [
    SharedWalletsPage,
    CreateSharedWalletPage,
    SharedWalletDetailPage,
    WalletAddFundsPage,
    WalletWithdrawPage,
    WalletTransactionSuccessPage
  ]
})
export class SharedWalletsPageModule {}
