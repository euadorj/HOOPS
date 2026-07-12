import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BENEDICTDATAINSIGHTSPage } from './benedict-data-insights.page';

const routes: Routes = [
  {
    path: '',
    component: BENEDICTDATAINSIGHTSPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BENEDICTDATAINSIGHTSPageRoutingModule {}
