import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BENEDICTREWARDSPageRoutingModule } from './benedict-rewards-routing.module';

import { BENEDICTREWARDSPage } from './benedict-rewards.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BENEDICTREWARDSPageRoutingModule
  ],
  declarations: [BENEDICTREWARDSPage]
})
export class BENEDICTREWARDSPageModule {}
