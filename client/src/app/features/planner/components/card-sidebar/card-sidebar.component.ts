import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, DragDropModule],
  template: `
    <div class="sidebar-container glass-panel">

      <div class="sidebar-header">
        <div class="header-text">
          <h2>Ideas &amp; Tasks</h2>
          <p class="subtitle">Drag cards onto your calendar</p>
        </div>
        <button class="add-btn" (click)="addCardClicked.emit()" title="New card">
          <span class="plus">+</span>
        </button>
      </div>

      <div
        class="card-list"
        cdkDropList
        id="sidebarList"
        [cdkDropListData]="cards"
        (cdkDropListDropped)="onDrop($event)">

        @for (card of cards; track card.id) {
          <app-topic-card
            [card]="card"
            cdkDrag
            [cdkDragData]="card">
          </app-topic-card>
        } @empty {
          <div class="empty-state">
            <p class="empty-icon">✦</p>
            <p>No cards yet.</p>
            <p class="empty-hint">Click <strong>+</strong> to add your first card.</p>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    .sidebar-container {
      width: 320px;
      flex-shrink: 0;
      height: 100%;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-radius: 0;
      border-top: none;
      border-bottom: none;
      border-left: none;
      background: rgba(18, 18, 26, 0.6);
    }
    .sidebar-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.2rem;
    }
    .subtitle {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .add-btn {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
    }
    .add-btn:hover { opacity: 0.88; transform: scale(1.08); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
    .plus { color: white; font-size: 1.4rem; line-height: 1; margin-top: -1px; }

    .card-list {
      flex: 1;
      overflow-y: auto;
      min-height: 100px;
    }
    .empty-state {
      text-align: center;
      margin-top: 3rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .empty-icon { font-size: 1.5rem; opacity: 0.4; }
    .empty-hint { font-size: 0.8rem; }
    .empty-hint strong { color: var(--text-secondary); }

    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
  `]
})
export class CardSidebarComponent {
  @Input({ required: true }) cards: Card[] = [];
  @Output() addCardClicked = new EventEmitter<void>();
  @Output() cardDropped = new EventEmitter<CdkDragDrop<any>>();

  onDrop(event: CdkDragDrop<any>) {
    this.cardDropped.emit(event);
  }
}
