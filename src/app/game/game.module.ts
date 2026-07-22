import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { GamePageRoutingModule } from './game-routing.module';
import { GamePage } from './game.page';

import {
  ScratchCardComponent
} from './scratch-card/scratch-card.component';

import {
  SpinWheelComponent
} from './spin-wheel/spin-wheel.component';

import {
  SavingsChallengeComponent
} from './savings-challenge/savings-challenge.component';

import {
  FinanceQuizComponent
} from './finance-quiz/finance-quiz.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GamePageRoutingModule,
  ],
  declarations: [
    GamePage,
    ScratchCardComponent,
    SpinWheelComponent,
    SavingsChallengeComponent,
    FinanceQuizComponent,
  ],
})
export class GamePageModule {}