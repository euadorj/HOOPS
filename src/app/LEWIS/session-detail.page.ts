import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-session-detail',
  templateUrl: 'session-detail.page.html',
  styleUrls: ['session-detail.page.scss']
  ,standalone: false
})
export class SessionDetailPage implements OnInit {
  id: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id');
  }

}
