import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-session',
  templateUrl: 'create-session.page.html',
  styleUrls: ['create-session.page.scss']
  ,standalone: false
})
export class CreateSessionPage {
  constructor(private router: Router) {}

  create() {
    // In a real app, create session on backend and navigate to it
    this.router.navigate(['/tabs/tab2/session/new-session']);
  }
}
