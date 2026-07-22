import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SavingsPage } from './savings.page';

const routes: Routes = [
  {
    path: '',
    component: SavingsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SavingsPageRoutingModule {}
