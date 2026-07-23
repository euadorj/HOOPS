import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import {
  PayPageRoutingModule
} from './pay-routing.module';

import { PayPage } from './pay.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    PayPageRoutingModule,
  ],
  declarations: [
    PayPage
  ],
})
export class PayPageModule {}