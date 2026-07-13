import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-shared-wallets',
  templateUrl: 'shared-wallets.page.html',
  styleUrls: ['shared-wallets.page.scss'],
  standalone: false,
})
export class SharedWalletsPage {
  wallets = [
    { name: 'Group Trip 2026', members: 4, amount: 1245.5 }
  ];

  constructor(private router: Router) {}

  openWallet(w:any){
    // navigate to detail in future
  }
}
