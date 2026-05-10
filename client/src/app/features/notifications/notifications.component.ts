import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      @for (n of notificationService.notifications(); track n.id) {
        <div class="notification" [class]="n.type" (click)="notificationService.remove(n.id)">
          <div class="icon">
            @if (n.type === 'error') { ⚠️ }
            @else if (n.type === 'success') { ✅ }
            @else { ℹ️ }
          </div>
          <p class="message">{{ n.message }}</p>
          <button class="close">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      width: calc(100% - 48px);
    }

    .notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      background: rgba(18, 18, 26, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border-glass);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      cursor: pointer;
      animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transition: transform 0.15s, opacity 0.15s;
    }

    .notification:hover {
      transform: scale(1.02);
      border-color: var(--border-glass-strong);
    }

    .notification.error {
      border-left: 4px solid #ef4444;
    }
    .notification.success {
      border-left: 4px solid #10b981;
    }
    .notification.info {
      border-left: 4px solid var(--accent-primary);
    }

    .icon { font-size: 1.1rem; flex-shrink: 0; }
    .message { font-size: 0.9rem; font-weight: 500; color: var(--text-primary); flex: 1; }
    .close { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.8rem; }

    @keyframes slideIn {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class NotificationsComponent {
  notificationService = inject(NotificationService);
}
