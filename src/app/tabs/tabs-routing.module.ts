import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes
} from '@angular/router';
import { AuthGuard } from '../auth/auth.guard';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('../THIERRY/tab1.module')
            .then((m) => m.Tab1PageModule)
      },
      {
        path: 'savings',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('../THIERRY/savings/savings.module')
            .then((m) => m.SavingsPageModule)
      },
      {
        path: 'tab2',
        loadChildren: () =>
          import('../LEWIS/tab2.module')
            .then((m) => m.Tab2PageModule)
      },
      {
        path: 'tab3',
        loadChildren: () =>
          import('../HIDAYAT/tab3.module')
            .then((m) => m.Tab3PageModule)
      },
      {
        path: 'tab4',
        loadChildren: () =>
          import('../BENEDICT/tab4.module')
            .then((m) => m.Tab4PageModule)
      },
      {
        path: 'shared-wallets',
        canActivate: [AuthGuard],
        loadChildren: () =>
          import('../LEWIS/shared-wallets.module')
            .then((m) => m.SharedWalletsPageModule)
      },
      {
  path: 'transfer',
  canActivate: [AuthGuard],
  loadChildren: () =>
    import('../THIERRY/transfer/transfer.module')
      .then((m) => m.TransferPageModule)
},
{
  path: 'pay',
  canActivate: [AuthGuard],
  loadChildren: () =>
    import('../THIERRY/pay/pay.module')
      .then((m) => m.PayPageModule)
},
      {
        path: '',
        redirectTo: 'tab1',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class TabsPageRoutingModule { }