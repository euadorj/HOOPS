import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MembershipTiersPageRoutingModule } from './membership-tiers-routing.module';

import { MembershipTiersPage } from './membership-tiers.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MembershipTiersPageRoutingModule
  ],
  declarations: [MembershipTiersPage]
})
export class MembershipTiersPageModule {}
