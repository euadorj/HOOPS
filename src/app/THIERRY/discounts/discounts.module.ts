import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import {
  DiscountsPageRoutingModule
} from './discounts-routing.module';

import { DiscountsPage } from './discounts.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DiscountsPageRoutingModule,
  ],
  declarations: [
    DiscountsPage
  ],
})
export class DiscountsPageModule {}