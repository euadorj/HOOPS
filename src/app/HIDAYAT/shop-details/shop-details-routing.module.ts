import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShopDetailsPage } from './shop-details.page';

const routes: Routes = [
  {
    path: '',
    component: ShopDetailsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShopDetailsPageRoutingModule {}
