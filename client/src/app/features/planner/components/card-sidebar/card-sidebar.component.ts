import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, DragDropModule],
  template: `
    <div class="sidebar-container glass-panel">

      <div class="sidebar-header">
        <div class="header-text">
          <h2>Ideas & Tasks</h2>
          <p class="subtitle">Drag tasks onto your calendar</p>
        </div>
        <button class="add-btn" (click)="addCardClicked.emit()" title="New card">
          <span class="plus">+</span>
        </button>
      </div>

      <div class="card-list" cdkDropList [cdkDropListData]="cards" (cdkDropListDropped)="onDrop($event)">

        @for (card of cards; track card.id) {
          <app-topic-card
            cdkDrag
            [card]="card"
            (editClicked)="editCardClicked.emit(card)"
            (itemDropped)="itemDropped.emit($event)"
          >
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
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      min-height: 0;
    }
    .sidebar-container {
      width: 100%;
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
      box-sizing: border-box;
      overflow: hidden;
    }
    .sidebar-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-shrink: 0;
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
    .plus { color: white; font-size: 1.4rem; line-height: 1;-top: -1px; }

    .card-list {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding-right: 0.5rem;
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
  @Output() editCardClicked = new EventEmitter<Card>();
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  /** Emits reordered cards after drag-and-drop */
  @Output() cardsReordered = new EventEmitter<Card[]>();

  /**
   * Handles drop events from the cdkDropList.
   * Reorders cards when dropped within the same container, otherwise forwards the event.
   */
  onDrop(event: CdkDragDrop<Card[]>): void {
    if (event.previousContainer === event.container) {
      // Reorder within the sidebar
      const clonedCards = [...this.cards];
      moveItemInArray(clonedCards, event.previousIndex, event.currentIndex);
      this.cardsReordered.emit(clonedCards);
    } else {
      // Forward other drop events (e.g., onto calendar)
      this.itemDropped.emit(event);
    }
  }


}
