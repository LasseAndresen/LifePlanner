import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Card, ListItem } from '../../../../core/models/planner.models';
import { CardService } from '../../../../core/services/card.service';

@Component({
  selector: 'app-topic-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="topic-card glass-panel" [style.border-left-color]="card.category?.color ?? '#6366f1'">

      <div class="card-header" cdkDragHandle>
        <h4>{{ card.title }}</h4>
        <div class="header-badges">
          @if (card.isChecklist) {
            <span class="checklist-badge" title="Checklist">✓</span>
          }
          <span class="category-badge">{{ card.category?.name ?? 'Uncategorized' }}</span>
        </div>
      </div>

      @if (card.description && !card.isChecklist) {
        <p class="description">{{ card.description }}</p>
      }

      @if (card.isChecklist) {
        <div class="checklist" (click)="$event.stopPropagation()">

          @if (card.listItems.length > 0) {
            <div class="progress-bar-wrap">
              <div class="progress-bar" [style.width.%]="completionPercent"></div>
            </div>
            <span class="progress-label">{{ completedCount }}/{{ card.listItems.length }}</span>
          }

          <ul class="item-list">
            @for (item of card.listItems; track item.id) {
              <li class="item" [class.completed]="item.isCompleted">
                <button
                  class="check-btn"
                  [class.checked]="item.isCompleted"
                  (click)="toggleItem(item)"
                  [attr.aria-label]="item.isCompleted ? 'Uncheck' : 'Check'">
                  @if (item.isCompleted) { ✓ }
                </button>
                <span class="item-text">{{ item.text }}</span>
                <button class="delete-item-btn" (click)="deleteItem(item)" title="Remove item">✕</button>
              </li>
            }
          </ul>

          @if (addingItem) {
            <div class="add-item-row">
              <input
                #newItemInput
                class="new-item-input"
                [(ngModel)]="newItemText"
                placeholder="New item..."
                (keydown.enter)="confirmAddItem()"
                (keydown.escape)="cancelAddItem()"
                autofocus />
              <button class="confirm-btn" (click)="confirmAddItem()" [disabled]="!newItemText.trim()">Add</button>
              <button class="cancel-btn" (click)="cancelAddItem()">✕</button>
            </div>
          } @else {
            <button class="add-item-btn" (click)="startAddItem()">+ Add item</button>
          }

        </div>
      }

    </div>
  `,
  styles: [`
    .topic-card {
      padding: 1rem;
      margin-bottom: 0.75rem;
      cursor: default;
      transition: box-shadow 0.2s, transform 0.15s;
      border-left: 4px solid transparent;
    }
    .topic-card:active { transform: scale(0.98); }
    .topic-card:hover { box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1); }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
      cursor: grab;
      user-select: none;
    }
    .card-header:active { cursor: grabbing; }
    h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      flex: 1;
    }
    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }
    .category-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-full);
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
    .checklist-badge {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-full);
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
      font-weight: 700;
    }
    .description {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    /* Checklist */
    .checklist { display: flex; flex-direction: column; gap: 0.35rem; }

    .progress-bar-wrap {
      height: 3px;
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
      overflow: hidden;
      margin-bottom: 0.1rem;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #10b981);
      border-radius: 99px;
      transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      align-self: flex-end;
      margin-top: -0.25rem;
      margin-bottom: 0.25rem;
    }

    .item-list { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; }

    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.2rem 0.1rem;
      border-radius: var(--radius-sm);
      transition: background 0.15s;
    }
    .item:hover { background: rgba(255,255,255,0.04); }
    .item:hover .delete-item-btn { opacity: 1; }

    .check-btn {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid rgba(255,255,255,0.2);
      background: transparent;
      color: #10b981;
      font-size: 0.65rem;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
      line-height: 1;
    }
    .check-btn.checked {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
    }
    .check-btn:hover { border-color: rgba(255,255,255,0.4); }

    .item-text {
      flex: 1;
      font-size: 0.82rem;
      color: var(--text-secondary);
      transition: color 0.2s, text-decoration 0.2s;
    }
    .item.completed .item-text {
      color: var(--text-muted);
      text-decoration: line-through;
    }

    .delete-item-btn {
      opacity: 0;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.65rem;
      cursor: pointer;
      padding: 0.1rem 0.25rem;
      border-radius: 3px;
      transition: opacity 0.15s, color 0.15s, background 0.15s;
      line-height: 1;
    }
    .delete-item-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    /* Add item row */
    .add-item-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.78rem;
      cursor: pointer;
      padding: 0.2rem 0;
      text-align: left;
      transition: color 0.15s;
      font-family: var(--font-family);
    }
    .add-item-btn:hover { color: var(--text-secondary); }

    .add-item-row {
      display: flex;
      gap: 0.35rem;
      align-items: center;
      margin-top: 0.1rem;
    }
    .new-item-input {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--radius-sm);
      padding: 0.3rem 0.5rem;
      color: var(--text-primary);
      font-size: 0.82rem;
      font-family: var(--font-family);
      outline: none;
      transition: border-color 0.2s;
    }
    .new-item-input:focus { border-color: var(--accent-primary); }
    .new-item-input::placeholder { color: var(--text-muted); }

    .confirm-btn {
      padding: 0.3rem 0.6rem;
      background: rgba(99, 102, 241, 0.25);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: var(--radius-sm);
      color: #a5b4fc;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: background 0.15s;
    }
    .confirm-btn:hover:not(:disabled) { background: rgba(99, 102, 241, 0.4); }
    .confirm-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .cancel-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.2rem;
      transition: color 0.15s;
    }
    .cancel-btn:hover { color: var(--text-primary); }
  `]
})
export class TopicCardComponent {
  @Input({ required: true }) card!: Card;

  private readonly cardService = inject(CardService);

  protected addingItem = false;
  protected newItemText = '';

  protected get completedCount(): number {
    return this.card.listItems.filter(i => i.isCompleted).length;
  }

  protected get completionPercent(): number {
    if (!this.card.listItems.length) return 0;
    return Math.round((this.completedCount / this.card.listItems.length) * 100);
  }

  protected toggleItem(item: ListItem): void {
    this.cardService.updateListItem(this.card.id, { ...item, isCompleted: !item.isCompleted }).subscribe();
  }

  protected deleteItem(item: ListItem): void {
    this.cardService.deleteListItem(this.card.id, item.id).subscribe();
  }

  protected startAddItem(): void {
    this.addingItem = true;
    this.newItemText = '';
  }

  protected confirmAddItem(): void {
    if (!this.newItemText.trim()) return;
    this.cardService.addListItem(this.card.id, this.newItemText.trim()).subscribe();
    this.newItemText = '';
    this.addingItem = false;
  }

  protected cancelAddItem(): void {
    this.addingItem = false;
    this.newItemText = '';
  }
}
