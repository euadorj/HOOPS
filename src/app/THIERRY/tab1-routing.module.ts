import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Tab1Page } from './tab1.page';

const routes: Routes = [
  {
    path: '',
    component: Tab1Page,
  },
  {
    path: 'savings',
    loadChildren: () => import('../THIERRY/savings/savings.module').then( m => m.SavingsPageModule)
  },
  {
    path: 'transfer',
    loadChildren: () => import('../THIERRY/transfer/transfer.module').then( m => m.TransferPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class Tab1PageRoutingModule {}
