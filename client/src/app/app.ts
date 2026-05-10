import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificationsComponent } from './features/notifications/notifications.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('LifePlanner');
}
