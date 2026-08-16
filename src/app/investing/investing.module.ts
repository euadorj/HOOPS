import {
  NgModule,
} from '@angular/core';

import {
  CommonModule,
} from '@angular/common';

import {
  FormsModule,
} from '@angular/forms';

import {
  IonicModule,
} from '@ionic/angular';

import {
  InvestingPageRoutingModule,
} from './investing-routing.module';

import {
  InvestingPage,
} from './investing.page';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    InvestingPageRoutingModule,
  ],

  declarations: [
    InvestingPage,
  ],
})


export class InvestingPageModule {}