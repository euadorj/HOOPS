import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

interface CheckInDay {
  day: number;
  completed: boolean;
  reward: number;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.page.html',
  styleUrls: ['./game.page.scss'],
  standalone: false,
})
export class GamePage implements OnInit {
  checkInDays: CheckInDay[] = [];
  currentStreak: number = 0;
  totalCoins: number = 0;
  lastCheckInDate: string | null = null;
  hasCheckedInToday: boolean = false;
  showScratch: boolean = false;

  constructor(private alertCtrl: AlertController) {}

  ngOnInit() {
    this.loadCheckInData();
    this.initializeDays();
  }

  openScratch() {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('scratchLastReveal');
    if (saved === today) {
      this.alertCtrl
        .create({
          header: 'No scratch cards left',
          message: 'You have 0 scratch cards left today. Try again tomorrow.',
          buttons: ['OK'],
        })
        .then((a) => a.present());
      return;
    }

    this.showScratch = true;
  }

  closeScratch() {
    this.showScratch = false;
  }

  loadCheckInData() {
    const saved = localStorage.getItem('checkInData');
    if (saved) {
      const data = JSON.parse(saved);
      this.currentStreak = data.currentStreak || 0;
      this.totalCoins = data.totalCoins || 0;
      this.lastCheckInDate = data.lastCheckInDate || null;
      this.hasCheckedInToday = this.checkIfCheckedInToday();
    }
  }

  initializeDays() {
    const rewards = [50, 50, 100, 150, 200, 250, 300];
    this.checkInDays = rewards.map((reward, index) => ({
      day: index + 1,
      completed: index < this.currentStreak,
      reward: reward,
    }));
  }

  checkIfCheckedInToday(): boolean {
    const today = new Date().toISOString().split('T')[0];
    return this.lastCheckInDate === today;
  }

  checkIn() {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.hasCheckedInToday) {
      return; // Already checked in today
    }

    // Check if streak continues (checked in yesterday)
    if (this.lastCheckInDate) {
      const lastDate = new Date(this.lastCheckInDate);
      const currentDate = new Date();
      const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        // Streak broken, reset
        this.currentStreak = 0;
      }
    }

    // Increment streak and add reward
    if (this.currentStreak < this.checkInDays.length) {
      const reward = this.checkInDays[this.currentStreak].reward;
      this.totalCoins += reward;
      this.checkInDays[this.currentStreak].completed = true;
      this.currentStreak++;
    }

    this.lastCheckInDate = today;
    this.hasCheckedInToday = true;
    this.saveCheckInData();
  }

  saveCheckInData() {
    const data = {
      currentStreak: this.currentStreak,
      totalCoins: this.totalCoins,
      lastCheckInDate: this.lastCheckInDate,
    };
    localStorage.setItem('checkInData', JSON.stringify(data));
  }
}
