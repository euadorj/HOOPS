import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GamePage } from './game.page';
import { ScratchCardComponent } from './scratch-card/scratch-card.component';
import { GamePageRoutingModule } from './game-routing.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    GamePageRoutingModule
  ],
  declarations: [GamePage, ScratchCardComponent]
})
export class GamePageModule {}
