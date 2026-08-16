import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ShopDetailsPageRoutingModule } from './shop-details-routing.module';

import { ShopDetailsPage } from './shop-details.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ShopDetailsPageRoutingModule
  ],
  declarations: [ShopDetailsPage]
})
export class ShopDetailsPageModule {}
