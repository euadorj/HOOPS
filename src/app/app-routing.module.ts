import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/sign-in',
    pathMatch: 'full'
  },
  {
    path: 'sign-in',
    loadChildren: () => import('./auth/sign-in.module').then(m => m.SignInPageModule)
  },
  {
    path: 'sign-up',
    loadChildren: () => import('./auth/sign-up.module').then(m => m.SignUpPageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'game',
    loadChildren: () => import('./game/game.module').then(m => m.GamePageModule)
  },
  {
    path: 'benedict-data-insights',
    loadChildren: () => import('./benedict-data-insights/benedict-data-insights.module').then( m => m.BENEDICTDATAINSIGHTSPageModule)
  },
  {
    path: 'benedict-rewards',
    loadChildren: () => import('./benedict-rewards/benedict-rewards.module').then( m => m.BENEDICTREWARDSPageModule)
  },
  {
    path: 'membership-tiers',
    loadChildren: () => import('./benedict-membership-tiers/membership-tiers.module').then( m => m.MembershipTiersPageModule)
  },
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
