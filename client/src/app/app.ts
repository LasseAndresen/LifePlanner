import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificationsComponent } from './features/notifications/notifications.component';
import { SeoService } from './core/services/seo.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Schedulist');
  private readonly seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.init();
  }
}
