import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SignUpPage } from './sign-up.page';
import { SignUpPageRoutingModule } from './sign-up-routing.module';

@NgModule({
  declarations: [SignUpPage],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SignUpPageRoutingModule],
})
export class SignUpPageModule {}
