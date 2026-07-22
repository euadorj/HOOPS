import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SavingsPageRoutingModule } from './savings-routing.module';
import { SavingsPage } from './savings.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SavingsPageRoutingModule,
  ],
  declarations: [SavingsPage],
})
export class SavingsPageModule {}