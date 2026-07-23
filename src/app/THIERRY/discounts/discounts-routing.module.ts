import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DiscountsPage } from './discounts.page';

const routes: Routes = [
  {
    path: '',
    component: DiscountsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DiscountsPageRoutingModule {}
