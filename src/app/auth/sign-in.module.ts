import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SignInPage } from './sign-in.page';
import { SignInPageRoutingModule } from './sign-in-routing.module';


@NgModule({
  declarations: [SignInPage],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule, SignInPageRoutingModule],
})
export class SignInPageModule {}
