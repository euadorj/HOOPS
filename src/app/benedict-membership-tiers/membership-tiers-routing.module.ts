import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MembershipTiersPage } from './membership-tiers.page';

const routes: Routes = [
  {
    path: '',
    component: MembershipTiersPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MembershipTiersPageRoutingModule {}
