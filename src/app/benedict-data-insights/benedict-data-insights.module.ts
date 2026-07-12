import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BENEDICTDATAINSIGHTSPageRoutingModule } from './benedict-data-insights-routing.module';

import { BENEDICTDATAINSIGHTSPage } from './benedict-data-insights.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BENEDICTDATAINSIGHTSPageRoutingModule
  ],
  declarations: [BENEDICTDATAINSIGHTSPage]
})
export class BENEDICTDATAINSIGHTSPageModule {}
