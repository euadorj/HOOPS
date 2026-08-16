import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BillSessionService, BillSession } from './bill-session.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  joinCode: string = '';
  sessions: BillSession[] = [];
  joinError = '';
  joining = false;
  loading = true;

  constructor(private router: Router, private billSessionService: BillSessionService) {}

  ionViewWillEnter() {
    this.refreshSessions();
  }

  async refreshSessions() {
    this.loading = true;
    this.sessions = await this.billSessionService.getSessions();
    this.loading = false;
  }

  async joinSession() {
    const code = (this.joinCode || '').trim();
    this.joinError = '';
    if (!/^\d{6}$/.test(code)) {
      this.joinError = 'Enter a valid 6-digit session code.';
      return;
    }

    this.joining = true;
    const joined = await this.billSessionService.joinSession(code);
    this.joining = false;

    if (!joined) {
      this.joinError = 'Session not found. Check the code and try again.';
      return;
    }

    await this.refreshSessions();
    this.router.navigate([`/tabs/tab2/session/${code}`]);
  }

  createSession() {
    this.router.navigate(['/tabs/tab2/create']);
  }

  openSession(id: string) {
    this.router.navigate([`/tabs/tab2/session/${id}`]);
  }
}
