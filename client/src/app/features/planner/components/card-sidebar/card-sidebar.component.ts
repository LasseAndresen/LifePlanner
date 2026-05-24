import { Component, EventEmitter, Input, Output, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Category } from '../../../../core/models/planner.models';
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

        <!-- Category Filter Dropdown -->
        <div class="category-filters">
          <button 
            class="filter-chip dropdown-trigger" 
            [class.active]="selectedCategoryIds.size > 0"
            (click)="toggleDropdown($event)">
            📁 Categories
            @if (selectedCategoryIds.size > 0) {
              <span class="badge">{{ selectedCategoryIds.size }}</span>
            } @else {
              <span class="badge-all">All</span>
            }
            <span class="arrow" [class.open]="dropdownOpen">▼</span>
          </button>

          @if (dropdownOpen) {
            <div class="dropdown-menu glass-panel">
              <button class="dropdown-item" (click)="clearFilters($event)">
                <span class="checkbox" [class.checked]="selectedCategoryIds.size === 0">
                  @if (selectedCategoryIds.size === 0) { ✓ }
                </span>
                All Categories
              </button>
              <div class="dropdown-divider"></div>
              @for (cat of categories; track cat.id) {
                <button class="dropdown-item" (click)="toggleCategory(cat.id, $event)">
                  <span class="checkbox" [class.checked]="selectedCategoryIds.has(cat.id)">
                    @if (selectedCategoryIds.has(cat.id)) { ✓ }
                  </span>
                  <span class="color-dot" [style.background-color]="cat.color"></span>
                  {{ cat.name }}
                </button>
              }
            </div>
          }
        </div>

        <div class="card-list" cdkDropList [cdkDropListData]="filteredCards" (cdkDropListDropped)="onDrop($event)">
          @for (card of filteredCards; track card.id) {
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
    .category-filters {
      position: relative;
      display: flex;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-glass);
      margin-bottom: 0.25rem;
      flex-shrink: 0;
    }
    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.16);
      color: var(--text-primary);
      transform: translateY(-1px);
    }
    .filter-chip.active {
      color: #fff;
      border-color: var(--accent-primary) !important;
      background: rgba(99, 102, 241, 0.15);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
    }
    .badge {
      background: var(--accent-primary);
      color: #fff;
      border-radius: var(--radius-sm);
      padding: 0.1rem 0.35rem;
      font-size: 0.65rem;
      font-weight: 700;
    }
    .badge-all {
      opacity: 0.6;
      font-size: 0.7rem;
    }
    .arrow {
      font-size: 0.6rem;
      transition: transform 0.2s ease;
    }
    .arrow.open {
      transform: rotate(180deg);
    }
    .dropdown-menu {
      position: absolute;
      top: calc(100% - 0.25rem);
      left: 0;
      z-index: 1000;
      min-width: 200px;
      background: rgba(22, 22, 34, 0.95);
      border: 1px solid var(--border-glass-strong);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-glass);
      padding: 0.5rem 0;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(12px);
      margin-top: 0.5rem;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.45rem 1rem;
      width: 100%;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 0.82rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .dropdown-divider {
      height: 1px;
      background: var(--border-glass);
      margin: 0.35rem 0;
    }
    .checkbox {
      width: 14px;
      height: 14px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: var(--accent-primary);
      transition: border-color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .checkbox.checked {
      border-color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      font-weight: bold;
    }
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 4px currentColor;
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
      width: 100%;
      box-sizing: border-box;
      transition: transform 1.0s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .sidebar-card-item.whiteboard-mode {
      position: absolute;
      width: 288px;
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
  @Input() categories: Category[] = [];
  @Input() connectedTo: string[] = [];
  @Input() viewMode: 'calendar' | 'whiteboard' = 'calendar';
  @Output() addCardClicked = new EventEmitter<void>();
  @Output() editCardClicked = new EventEmitter<Card>();
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() cardsReordered = new EventEmitter<Card[]>();
  @Output() cardDragEnded = new EventEmitter<{ event: CdkDragEnd; card: Card }>();

  private readonly elementRef = inject(ElementRef);
  protected dropdownOpen = false;
  protected selectedCategoryIds = new Set<number>();

  protected get filteredCards(): Card[] {
    if (this.selectedCategoryIds.size === 0) {
      return this.cards;
    }
    return this.cards.filter(c => this.selectedCategoryIds.has(c.categoryId));
  }

  protected toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  protected toggleCategory(id: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.selectedCategoryIds.has(id)) {
      this.selectedCategoryIds.delete(id);
    } else {
      this.selectedCategoryIds.add(id);
    }
  }

  protected clearFilters(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedCategoryIds.clear();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.dropdownOpen = false;
    }
  }

  onDrop(event: CdkDragDrop<Card[]>): void {
    if (event.previousContainer === event.container) {
      const clonedCards = [...this.cards];
      const filtered = this.filteredCards;
      const prevCard = filtered[event.previousIndex];
      const currCard = filtered[event.currentIndex];
      
      if (prevCard && currCard) {
        const prevIdx = clonedCards.findIndex(c => c.id === prevCard.id);
        const currIdx = clonedCards.findIndex(c => c.id === currCard.id);
        
        if (prevIdx !== -1 && currIdx !== -1) {
          moveItemInArray(clonedCards, prevIdx, currIdx);
          this.cardsReordered.emit(clonedCards);
        }
      }
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
