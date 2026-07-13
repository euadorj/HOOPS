import { Component, EventEmitter, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-scratch-card',
  templateUrl: './scratch-card.component.html',
  styleUrls: ['./scratch-card.component.scss'],
  standalone: false,
})
export class ScratchCardComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  rewards = [
    { label: '50 Coins', value: '50_coins', emoji: '🪙' },
    { label: '$1 Cashback', value: '1_cash', emoji: '💵' },
    { label: 'Voucher', value: 'voucher', emoji: '🎟️' },
  ];

  selectedReward: any = null;
  revealed = false;
  availableToday = true;
  recentRewards: Array<{ label: string; value: string; emoji?: string; status?: string }> = [];
  rewardAmountDisplay: string = '';

  ngOnInit() {
    const saved = localStorage.getItem('scratchLastReveal');
    const today = new Date().toISOString().split('T')[0];
    if (saved === today) {
      this.availableToday = false;
    }
  }

  pickRandomReward() {
    const i = Math.floor(Math.random() * this.rewards.length);
    return this.rewards[i];
  }

  reveal() {
    if (!this.availableToday) return;
    if (this.revealed) return;
    this.selectedReward = this.pickRandomReward();
    this.revealed = true;
    // add to recent rewards list
    this.recentRewards.unshift({
      label: this.selectedReward.label,
      value: this.selectedReward.value,
      emoji: this.selectedReward.emoji,
      status: 'Won',
    });
    // compute numeric display (e.g., '50' from '50 Coins')
    const m = (this.selectedReward.label || '').match(/(\d+)/);
    this.rewardAmountDisplay = m ? m[1] : '1';
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('scratchLastReveal', today);
  }

  cancel() {
    this.close.emit();
  }

  done() {
    this.close.emit();
  }
}
