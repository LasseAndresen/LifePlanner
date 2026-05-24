import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { DragDropModule, CdkDragDrop, moveItemInArray, CdkDragEnd } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, DragDropModule],
  template: `
    <div class="sidebar-container glass-panel" [class.whiteboard-mode]="viewMode === 'whiteboard'">

      @if (viewMode === 'whiteboard') {
        <div class="whiteboard-header">
          <h3>Whiteboard Workspace</h3>
          <p class="subtitle">Drag cards freely and organize your ideas</p>
        </div>

        <div class="card-list whiteboard-layout">
          @for (card of cards; track card.id) {
            <app-topic-card
              class="sidebar-card-item whiteboard-mode"
              [attr.data-card-id]="card.id"
              cdkDrag
              [card]="card"
              [connectedTo]="connectedTo"
              [style.left.px]="getCardX(card)"
              [style.top.px]="getCardY(card)"
              (editClicked)="editCardClicked.emit(card)"
              (itemDropped)="itemDropped.emit($event)"
              (cdkDragEnded)="onDragEnded($event, card)"
            >
            </app-topic-card>
          }
        </div>

        <button class="fab-add-card" (click)="addCardClicked.emit()" title="Create New Card" id="whiteboard-fab-add">
          <span class="plus-icon">+</span> New Card
        </button>

      } @else {
        <div class="sidebar-header">
          <div class="header-text">
            <h2>Ideas & Tasks</h2>
            <p class="subtitle">Drag tasks onto your calendar</p>
          </div>
          <div class="header-actions">
            <button class="add-btn" (click)="addCardClicked.emit()" title="New card">
              <span class="plus">+</span>
            </button>
          </div>
        </div>

        <div class="card-list" cdkDropList [cdkDropListData]="cards" (cdkDropListDropped)="onDrop($event)">
          @for (card of cards; track card.id) {
            <app-topic-card
              class="sidebar-card-item"
              [attr.data-card-id]="card.id"
              cdkDrag
              [card]="card"
              [connectedTo]="connectedTo"
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
      }

    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
      min-height: 0;
      width: 100%;
    }
    .sidebar-container {
      width: 100%;
      height: 100%;
      padding: 1.5rem 1rem;
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
      transition: background 1.0s ease-in-out, padding 1.0s ease-in-out;
    }
    .sidebar-container.whiteboard-mode {
      border: none;
      background: #08080e;
      background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
      overflow: auto;
      padding: 2rem;
    }
    .sidebar-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .whiteboard-header {
      margin-bottom: 1.5rem;
      flex-shrink: 0;
      animation: fadeIn 0.4s ease;
    }
    .whiteboard-header h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    .whiteboard-header .subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
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
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-shrink: 0;
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
    .plus { color: white; font-size: 1.4rem; line-height: 1; }

    .card-list {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding-right: 0.5rem;
    }
    .card-list.whiteboard-layout {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 1200px;
      min-width: 1600px;
      overflow: visible;
      padding: 0;
    }
    .sidebar-card-item {
      display: block;
      width: 288px;
      box-sizing: border-box;
      transition: transform 1.0s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .sidebar-card-item.whiteboard-mode {
      position: absolute;
      z-index: 5;
      margin-bottom: 0;
      cursor: grab;
      box-shadow: var(--shadow-glass);
      border-radius: var(--radius-lg);
    }
    .sidebar-card-item.whiteboard-mode:active {
      cursor: grabbing;
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

    .fab-add-card {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      border: none;
      border-radius: var(--radius-full);
      padding: 0.75rem 1.5rem;
      color: #fff;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
      transition: all 0.2s ease;
      z-index: 100;
    }
    .fab-add-card:hover {
      transform: scale(1.05) translateY(-2px);
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.6);
      opacity: 0.95;
    }
    .plus-icon {
      font-size: 1.2rem;
      font-weight: 700;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class CardSidebarComponent {
  @Input({ required: true }) cards: Card[] = [];
  @Input() connectedTo: string[] = [];
  @Input() viewMode: 'calendar' | 'whiteboard' = 'calendar';
  @Output() addCardClicked = new EventEmitter<void>();
  @Output() editCardClicked = new EventEmitter<Card>();
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() cardsReordered = new EventEmitter<Card[]>();
  @Output() cardDragEnded = new EventEmitter<{ event: CdkDragEnd; card: Card }>();

  onDrop(event: CdkDragDrop<Card[]>): void {
    if (event.previousContainer === event.container) {
      const clonedCards = [...this.cards];
      moveItemInArray(clonedCards, event.previousIndex, event.currentIndex);
      this.cardsReordered.emit(clonedCards);
    } else {
      this.itemDropped.emit(event);
    }
  }

  onDragEnded(event: CdkDragEnd, card: Card): void {
    if (this.viewMode === 'whiteboard') {
      this.cardDragEnded.emit({ event, card });
    }
  }

  getCardX(card: Card): number {
    return card.whiteboardX !== null && card.whiteboardX !== undefined
      ? card.whiteboardX
      : this.getDefaultCoordinates(card).x;
  }

  getCardY(card: Card): number {
    return card.whiteboardY !== null && card.whiteboardY !== undefined
      ? card.whiteboardY
      : this.getDefaultCoordinates(card).y;
  }

  private getDefaultCoordinates(card: Card): { x: number, y: number } {
    const index = this.cards.findIndex(c => c.id === card.id);
    const cardsPerRow = 3;
    const cardWidth = 320;
    const cardHeight = 250;
    const gap = 32;
    const startX = 48;
    const startY = 120; // Allow space for header

    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;

    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap)
    };
  }
}
