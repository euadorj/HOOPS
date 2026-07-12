import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
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
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
