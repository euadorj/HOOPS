import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BENEDICTREWARDSPage } from './benedict-rewards.page';

const routes: Routes = [
  {
    path: '',
    component: BENEDICTREWARDSPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BENEDICTREWARDSPageRoutingModule {}
