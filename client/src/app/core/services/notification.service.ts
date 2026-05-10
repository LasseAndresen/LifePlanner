import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notificationsSignal = signal<Notification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  private nextId = 0;

  show(message: string, type: 'error' | 'success' | 'info' = 'info') {
    const id = this.nextId++;
    const notification: Notification = { id, message, type };
    
    this.notificationsSignal.update(n => [...n, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => this.remove(id), 5000);
  }

  error(message: string) {
    this.show(message, 'error');
  }

  success(message: string) {
    this.show(message, 'success');
  }

  remove(id: number) {
    this.notificationsSignal.update(n => n.filter(x => x.id !== id));
  }
}
