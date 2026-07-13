import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page {
  joinCode: string = '';

  constructor(private router: Router) {}

  joinSession() {
    const code = (this.joinCode || '').trim();
    if (!code) {
      return;
    }
    this.router.navigate([`/tabs/tab2/session/${code}`]);
  }

  createSession() {
    this.router.navigate(['/tabs/tab2/create']);
  }

  openSession(id: string) {
    this.router.navigate([`/tabs/tab2/session/${id}`]);
  }

}
