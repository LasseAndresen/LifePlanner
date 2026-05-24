import { Component, Input, Output, EventEmitter, inject, ViewChild, ViewChildren, QueryList, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { Card, ListItem } from '../../../../core/models/planner.models';
import { CardService } from '../../../../core/services/card.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-topic-card',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="topic-card glass-panel" [class.collapsed]="isCollapsed" [style.border-left-color]="card.category?.color ?? '#6366f1'">

      <div class="card-header" cdkDragHandle>
        <div class="header-titles">
          <h4 [title]="card.title">{{ card.title }}</h4>
          <span class="category-badge" [title]="card.category?.name ?? 'Uncategorized'">
            {{ card.category?.name ?? 'Uncategorized' }}
          </span>
        </div>
        <div class="header-badges">
          <button
            class="collapse-btn"
            [class.collapsed]="isCollapsed"
            (click)="$event.stopPropagation(); toggleCollapse()"
            [title]="isCollapsed ? 'Expand card' : 'Collapse card'"
            aria-label="Toggle Collapse">
            ▼
          </button>
          @if (!card.integrationSource) {
            <button
              class="edit-card-btn"
              (click)="$event.stopPropagation(); editCard()"
              title="Edit card"
              aria-label="Edit card">
              ✎
            </button>
            <button
              class="delete-card-btn"
              (click)="$event.stopPropagation(); deleteCard()"
              title="Delete card"
              aria-label="Delete card">
              ✕
            </button>
          } @else {
            <span class="integration-badge" [class.ms-todo]="card.integrationSource === 'MicrosoftTodo'" [class.google-tasks]="card.integrationSource === 'GoogleTasks'">
              {{ card.integrationSource === 'MicrosoftTodo' ? 'MS Todo' : 'Google Tasks' }}
            </span>
          }
        </div>
      </div>

      @if (card.description) {
        <p class="description">{{ card.description }}</p>
      }

      <!-- List items — always visible -->
      <div class="checklist" (click)="$event.stopPropagation()">

        @if (card.isChecklist && card.listItems.length > 0) {
          <div class="progress-bar-wrap">
            <div class="progress-bar" [style.width.%]="completionPercent"></div>
          </div>
          <span class="progress-label">{{ completedCount }}/{{ card.listItems.length }}</span>
        }

        <ul
          class="item-list"
          cdkDropList
          [id]="'card-items-' + card.id"
          [cdkDropListData]="card.listItems"
          [cdkDropListConnectedTo]="connectedTo"
          (cdkDropListDropped)="itemDropped.emit($event)">
          @for (item of card.listItems; track item.id) {
            <li
              class="item"
              cdkDrag
              [cdkDragData]="{ item: item, card: card }"
              [class.completed]="item.isCompleted && card.isChecklist">
              @if (card.isChecklist) {
                <button
                  class="check-btn"
                  [class.checked]="item.isCompleted"
                  (click)="toggleItem(item)"
                  [attr.aria-label]="item.isCompleted ? 'Uncheck' : 'Check'">
                  @if (item.isCompleted) { ✓ }
                </button>
              } @else {
                <span class="bullet">•</span>
              }
              @if (editingItemId === item.id) {
                <div class="edit-item-row">
                  <input
                    #editItemInput
                    class="edit-item-input"
                    [(ngModel)]="editingItemText"
                    (keydown.enter)="confirmEditItem(item)"
                    (keydown.escape)="cancelEditItem()"
                    (blur)="confirmEditItem(item)"
                    autofocus />
                </div>
              } @else {
                <span
                  class="item-text"
                  (click)="!card.integrationSource && startEditItem(item)"
                  [title]="card.integrationSource ? 'Read-only integration item' : 'Click to edit'">
                  {{ item.text }}
                </span>
                @if (!card.integrationSource) {
                  <button class="delete-item-btn" (click)="deleteItem(item)" title="Remove item">✕</button>
                }
              }
            </li>
          }
          @if (card.listItems.length === 0) {
            <li class="empty-item-dropzone">Drop tasks here</li>
          }
        </ul>

        @if (!card.integrationSource && !isCollapsed) {
          @if (addingItem) {
            <div class="add-item-row">
              <input
                #newItemInput
                class="new-item-input"
                [(ngModel)]="newItemText"
                placeholder="New item..."
                (keydown.enter)="confirmAddItem()"
                (keydown.escape)="cancelAddItem()"
                (blur)="onInputBlur()"
                autofocus />
              <button class="confirm-btn" (mousedown)="$event.preventDefault()" (click)="confirmAddItem()" [disabled]="!newItemText.trim()">Add</button>
              <button class="cancel-btn" (mousedown)="$event.preventDefault()" (click)="cancelAddItem()">✕</button>
            </div>
          } @else {
            <button class="add-item-btn" (click)="startAddItem()">+ Add item</button>
          }
        }

      </div>

    </div>
  `,
  styles: [`
    .topic-card {
      padding: 1rem;
      margin-bottom: 0.75rem;
      cursor: default;
      transition: box-shadow 0.2s, transform 0.15s;
      border-left: 4px solid transparent;
      box-sizing: border-box;
      width: 100%;
      overflow: hidden;
    }
    .topic-card:hover { box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1); }
    .topic-card.collapsed {
      min-height: 110px;
    }
    .topic-card.collapsed .item-list {
      max-height: 96px; /* shows exactly 3 items at ~32px each */
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .topic-card.collapsed .item-list::-webkit-scrollbar {
      width: 4px;
    }
    .topic-card.collapsed .item-list::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 2px;
    }
    .topic-card.collapsed .item-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
    }
    .topic-card.collapsed .item-list::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    .collapse-btn {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-full);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-muted);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.2s ease;
      line-height: 1.4;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .collapse-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.25);
      color: var(--text-primary);
    }
    .collapse-btn.collapsed {
      transform: rotate(-90deg);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
      cursor: grab;
      user-select: none;
      width: 100%;
      box-sizing: border-box;
    }
    .card-header:active { cursor: grabbing; }

    .header-titles {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      line-height: 1.2;
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .category-badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.05);
      max-width: 100%;
      box-sizing: border-box;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .edit-card-btn, .delete-card-btn {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-full);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--text-muted);
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
      line-height: 1.4;
    }
    .edit-card-btn:hover {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      color: #60a5fa;
    }
    .delete-card-btn:hover {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.4);
      color: #ef4444;
    }

    .description {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    /* List section */
    .checklist { display: flex; flex-direction: column; gap: 0.3rem; margin-top: 0.25rem; }

    .progress-bar-wrap {
      height: 3px;
      background: rgba(255,255,255,0.08);
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #10b981);
      border-radius: 99px;
      transition: width 0.3s ease;
    }
    .progress-label {
      font-size: 0.68rem;
      color: var(--text-muted);
      align-self: flex-end;
      margin-top: -0.2rem;
    }

    .item-list { list-style: none; display: flex; flex-direction: column; gap: 0.2rem; }

    .item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: background 0.15s;
      cursor: grab;
    }
    .item:active {
      cursor: grabbing;
    }
    .item:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .empty-item-dropzone {
      font-size: 0.75rem;
      color: var(--text-muted);
      opacity: 0.5;
      padding: 0.75rem 0;
      text-align: center;
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: var(--radius-sm);
      margin: 0.25rem 0;
    }
    .item:hover .delete-item-btn { opacity: 1; }

    .check-btn {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1.5px solid rgba(255,255,255,0.2);
      background: transparent;
      color: #10b981;
      font-size: 0.6rem;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, border-color 0.15s;
    }
    .check-btn.checked { background: rgba(16,185,129,0.18); border-color: #10b981; }
    .check-btn:hover { border-color: rgba(255,255,255,0.4); }

    .bullet {
      color: var(--text-muted);
      font-size: 0.75rem;
      flex-shrink: 0;
      width: 16px;
      text-align: center;
    }

    .item-text {
      flex: 1;
      font-size: 0.82rem;
      color: var(--text-secondary);
      transition: color 0.2s, text-decoration 0.2s;
      cursor: pointer;
    }
    .item-text:hover {
      color: var(--text-primary);
    }
    .item.completed .item-text {
      color: var(--text-muted);
      text-decoration: line-through;
    }

    .edit-item-row {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
    }
    .edit-item-input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--accent-primary);
      border-radius: var(--radius-sm);
      padding: 0.15rem 0.4rem;
      color: var(--text-primary);
      font-size: 0.82rem;
      font-family: var(--font-family);
      outline: none;
    }

    .delete-item-btn {
      opacity: 0;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.6rem;
      cursor: pointer;
      padding: 0.1rem 0.25rem;
      border-radius: 3px;
      transition: opacity 0.15s, color 0.15s, background 0.15s;
      line-height: 1;
    }
    .delete-item-btn:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

    .add-item-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.76rem;
      cursor: pointer;
      padding: 0.15rem 0;
      text-align: left;
      transition: color 0.15s;
      font-family: var(--font-family);
    }
    .add-item-btn:hover { color: var(--text-secondary); }

    .add-item-row {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    .new-item-input {
      flex: 1;
      min-width: 0;
      box-sizing: border-box;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: var(--radius-sm);
      padding: 0.28rem 0.5rem;
      color: var(--text-primary);
      font-size: 0.82rem;
      font-family: var(--font-family);
      outline: none;
      transition: border-color 0.2s;
    }
    .new-item-input:focus { border-color: var(--accent-primary); }
    .new-item-input::placeholder { color: var(--text-muted); }

    .confirm-btn {
      flex-shrink: 0;
      box-sizing: border-box;
      padding: 0.28rem 0.55rem;
      background: rgba(99,102,241,0.22);
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: var(--radius-sm);
      color: #a5b4fc;
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: background 0.15s;
    }
    .confirm-btn:hover:not(:disabled) { background: rgba(99,102,241,0.38); }
    .confirm-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .cancel-btn {
      flex-shrink: 0;
      box-sizing: border-box;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.74rem;
      cursor: pointer;
      padding: 0.2rem;
      transition: color 0.15s;
    }
    .cancel-btn:hover { color: var(--text-primary); }

    .integration-badge {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .integration-badge.ms-todo {
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(37, 99, 235, 0.25);
    }
    .integration-badge.google-tasks {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.25);
    }
  `]
})
export class TopicCardComponent implements OnInit {
  @Input({ required: true }) card!: Card;
  @Input() connectedTo: string[] = [];
  @Output() editClicked = new EventEmitter<void>();
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @ViewChild('newItemInput') newItemInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('editItemInput') editItemInputs?: QueryList<ElementRef<HTMLInputElement>>;

  private readonly cardService = inject(CardService);
  private readonly notifications = inject(NotificationService);

  protected addingItem = false;
  protected newItemText = '';

  protected isCollapsed = false;

  ngOnInit(): void {
    const collapsedIdsStr = localStorage.getItem('lifeplanner_collapsed_cards');
    if (collapsedIdsStr) {
      try {
        const collapsedIds = JSON.parse(collapsedIdsStr);
        if (Array.isArray(collapsedIds) && collapsedIds.includes(this.card.id)) {
          this.isCollapsed = true;
        }
      } catch (e) {
        console.error('Failed to parse collapsed cards from local storage', e);
      }
    }
  }

  protected toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    
    // Save to local storage
    const collapsedIdsStr = localStorage.getItem('lifeplanner_collapsed_cards');
    let collapsedIds: number[] = [];
    if (collapsedIdsStr) {
      try {
        collapsedIds = JSON.parse(collapsedIdsStr);
        if (!Array.isArray(collapsedIds)) {
          collapsedIds = [];
        }
      } catch (e) {
        collapsedIds = [];
      }
    }
    
    if (this.isCollapsed) {
      if (!collapsedIds.includes(this.card.id)) {
        collapsedIds.push(this.card.id);
      }
    } else {
      collapsedIds = collapsedIds.filter(id => id !== this.card.id);
    }
    
    localStorage.setItem('lifeplanner_collapsed_cards', JSON.stringify(collapsedIds));
  }

  protected editingItemId: number | null = null;
  protected editingItemText = '';

  protected get completedCount(): number {
    return this.card.listItems.filter(i => i.isCompleted).length;
  }

  protected get completionPercent(): number {
    if (!this.card.listItems.length) return 0;
    return Math.round((this.completedCount / this.card.listItems.length) * 100);
  }

  protected editCard(): void {
    this.editClicked.emit();
  }

  protected deleteCard(): void {
    if (confirm(`Are you sure you want to delete "${this.card.title}"?`)) {
      this.cardService.deleteCard(this.card.id).subscribe();
    }
  }

  protected toggleItem(item: ListItem): void {
    const isCompleted = !item.isCompleted;
    this.cardService.updateListItem(this.card.id, { ...item, isCompleted }).subscribe({
      next: () => {
        if (this.card.integrationSource) {
          const providerName = this.card.integrationSource === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Tasks';
          this.notifications.show(`Synced task status with ${providerName}!`, 'success');
        }
      }
    });
  }

  protected startEditItem(item: ListItem): void {
    this.editingItemId = item.id;
    this.editingItemText = item.text;
    setTimeout(() => {
      this.editItemInputs?.first?.nativeElement?.focus();
    }, 0);
  }

  protected confirmEditItem(item: ListItem): void {
    if (this.editingItemId !== item.id) return;
    const trimmed = this.editingItemText.trim();
    if (!trimmed) {
      this.cancelEditItem();
      return;
    }
    if (trimmed !== item.text) {
      this.cardService.updateListItem(this.card.id, { ...item, text: trimmed }).subscribe();
    }
    this.editingItemId = null;
  }

  protected cancelEditItem(): void {
    this.editingItemId = null;
  }

  protected deleteItem(item: ListItem): void {
    this.cardService.deleteListItem(this.card.id, item.id).subscribe();
  }

  protected startAddItem(): void {
    this.addingItem = true;
    this.newItemText = '';
    setTimeout(() => this.newItemInput?.nativeElement?.focus(), 0);
  }

  protected confirmAddItem(): void {
    if (!this.newItemText.trim()) return;
    this.cardService.addListItem(this.card.id, this.newItemText.trim()).subscribe();
    this.newItemText = '';
    // Keep the input open and focused so the user can rapidly type another item
    setTimeout(() => this.newItemInput?.nativeElement?.focus(), 0);
  }

  protected cancelAddItem(): void {
    this.addingItem = false;
    this.newItemText = '';
  }

  protected onInputBlur(): void {
    this.cancelAddItem();
  }
}
