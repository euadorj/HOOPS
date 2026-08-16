import {
  NgModule,
} from '@angular/core';

import {
  Routes,
  RouterModule,
} from '@angular/router';

import {
  InvestingPage,
} from './investing.page';


const routes: Routes = [
  {
    path: '',
    component:
      InvestingPage,
  },
];


@NgModule({
  imports: [
    RouterModule.forChild(
      routes
    ),
  ],

  exports: [
    RouterModule,
  ],
})


export class InvestingPageRoutingModule {}