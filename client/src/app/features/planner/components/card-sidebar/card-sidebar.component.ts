import { Component, EventEmitter, Input, Output, HostListener, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Category } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { StickyNoteComponent } from '../sticky-note/sticky-note.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CardService } from '../../../../core/services/card.service';
import { UserService } from '../../../../core/services/user.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, StickyNoteComponent, DragDropModule],
  template: `
    <div class="sidebar-container glass-panel" [class.whiteboard-mode]="viewMode === 'whiteboard'">

      @if (viewMode === 'whiteboard') {
        <!-- Floating controls for canvas reset & new sticky note -->
        <div class="whiteboard-controls-overlay" (click)="stopPropagation($event)">
          <button class="control-btn" (click)="recenterCanvas()" title="Reset Zoom & Pan">⌖ Recenter</button>
          <button class="control-btn" (click)="spawnStickyNoteAtCenter()" title="Add Sticky Note">+ Note</button>
          <button class="control-btn" (click)="addCardClicked.emit()" title="Add Topic Card">+ Card</button>
          <span class="zoom-indicator">Zoom: {{ Math.round(zoomScale() * 100) }}%</span>
        </div>

        <div 
          class="whiteboard-viewport" 
          (mousedown)="onViewportMouseDown($event)"
          (wheel)="onViewportWheel($event)">
          
          <div 
            class="whiteboard-canvas" 
            [style.transform]="canvasTransform()"
            (dblclick)="onCanvasDoubleClick($event)">
            
            @for (card of cards; track card.id) {
              @if (card.isStickyNote) {
                <app-sticky-note
                  class="sidebar-card-item whiteboard-mode sticky-note-item"
                  [attr.data-card-id]="card.id"
                  [card]="card"
                  viewMode="whiteboard"
                  [style.left.px]="getCardX(card)"
                  [style.top.px]="getCardY(card)"
                  (dragStarted)="onCardDragStart($event, card)"
                  (deleted)="onCardDeleted(card)">
                </app-sticky-note>
              } @else {
                <app-topic-card
                  class="sidebar-card-item whiteboard-mode topic-card-item"
                  [attr.data-card-id]="card.id"
                  [card]="card"
                  [connectedTo]="connectedTo"
                  [style.left.px]="getCardX(card)"
                  [style.top.px]="getCardY(card)"
                  (editClicked)="editCardClicked.emit(card)"
                  (itemDropped)="itemDropped.emit($event)"
                  (dragStarted)="onCardDragStart($event, card)"
                >
                </app-topic-card>
              }
            }
          </div>
        </div>

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
            @if (card.isStickyNote) {
              <app-sticky-note
                class="sidebar-card-item list-sticky-note"
                [attr.data-card-id]="card.id"
                cdkDrag
                [card]="card"
                viewMode="calendar"
                (deleted)="onCardDeleted(card)">
              </app-sticky-note>
            } @else {
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
            }
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
      position: relative;
    }
    .sidebar-container.whiteboard-mode {
      border: none;
      background: #06060c;
      padding: 0;
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
    .sidebar-card-item {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }
    .sidebar-card-item.whiteboard-mode {
      position: absolute;
      z-index: 5;
      margin-bottom: 0;
      border-radius: var(--radius-lg);
      transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .sidebar-card-item.list-sticky-note {
      width: 210px !important;
      height: 210px !important;
      margin: 0 auto 0.75rem auto;
      cursor: grab;
      border-radius: var(--radius-lg);
    }
    .sidebar-card-item.list-sticky-note:active {
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

    /* New Whiteboard Canvas Layout Elements */
    .whiteboard-controls-overlay {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      background: rgba(10, 10, 18, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-full);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      user-select: none;
    }

    .control-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-family: var(--font-family);
    }

    .control-btn:hover {
      background: var(--accent-primary);
      color: white;
      border-color: transparent;
      transform: translateY(-1px);
    }

    .zoom-indicator {
      font-size: 0.8rem;
      font-weight: bold;
      color: var(--text-secondary);
      border-left: 1px solid rgba(255, 255, 255, 0.15);
      padding-left: 0.75rem;
      min-width: 80px;
      text-align: center;
    }

    .whiteboard-viewport {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      cursor: grab;
      background: #05050a;
      background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
      background-size: 24px 24px;
    }

    .whiteboard-viewport:active {
      cursor: grabbing;
    }

    .whiteboard-canvas {
      position: absolute;
      width: 4000px;
      height: 3000px;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
      pointer-events: auto;
    }

    .sticky-note-item {
      width: 210px !important;
      height: 210px !important;
    }

    .topic-card-item {
      width: 320px !important;
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
  @Output() cardDragEnded = new EventEmitter<{ event: any; card: Card }>();

  private readonly elementRef = inject(ElementRef);
  private readonly cardService = inject(CardService);
  private readonly userService = inject(UserService);
  private readonly workspaceService = inject(WorkspaceService);

  protected dropdownOpen = false;
  protected selectedCategoryIds = new Set<number>();

  // Whiteboard Canvas Panning & Zooming signals
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  protected readonly zoomScale = signal(1.0);
  protected readonly Math = Math;

  protected readonly canvasTransform = computed(() => {
    return `translate3d(${this.panX()}px, ${this.panY()}px, 0) scale(${this.zoomScale()})`;
  });

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

  protected stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
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

  // --- Zooming & Panning logic ---

  protected onViewportMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only drag pan on left-click
    
    const target = event.target as HTMLElement;
    // Do not pan if clicking inside card content or picker overlays
    if (target.closest('app-topic-card') || 
        target.closest('app-sticky-note') || 
        target.closest('.whiteboard-controls-overlay') ||
        target.closest('.color-picker-menu')) {
      return;
    }

    // Blur any active element (like a note textarea) when clicking outside to exit edit mode
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialPanX = this.panX();
    const initialPanY = this.panY();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      this.panX.set(initialPanX + dx);
      this.panY.set(initialPanY + dy);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  protected onViewportWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomIntensity = 0.06;
    const minScale = 0.25;
    const maxScale = 3.0;

    const viewportEl = this.elementRef.nativeElement.querySelector('.whiteboard-viewport');
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const oldScale = this.zoomScale();
    const scrollDelta = event.deltaY < 0 ? 1 : -1;
    let newScale = oldScale + scrollDelta * zoomIntensity;
    newScale = Math.max(minScale, Math.min(maxScale, newScale));

    // Calculate canvas coordinates of the cursor before zoom
    const canvasX = (mouseX - this.panX()) / oldScale;
    const canvasY = (mouseY - this.panY()) / oldScale;

    // Set new scale
    this.zoomScale.set(newScale);

    // Shift pan offset to center zoom on mouse cursor
    this.panX.set(mouseX - canvasX * newScale);
    this.panY.set(mouseY - canvasY * newScale);
  }

  protected recenterCanvas(): void {
    this.zoomScale.set(1.0);
    this.panX.set(0);
    this.panY.set(0);
  }

  protected spawnStickyNoteAtCenter(): void {
    const viewportEl = this.elementRef.nativeElement.querySelector('.whiteboard-viewport');
    const width = viewportEl ? viewportEl.clientWidth : 800;
    const height = viewportEl ? viewportEl.clientHeight : 600;

    const centerX = (width / 2 - this.panX()) / this.zoomScale();
    const centerY = (height / 2 - this.panY()) / this.zoomScale();

    // Spawns note slightly centered (210px note size -> offsets of 105px)
    this.createStickyNoteAt(centerX - 105, centerY - 105);
  }

  protected onCanvasDoubleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Don't spawn when double-clicking elements
    if (target.closest('app-topic-card') || 
        target.closest('app-sticky-note') || 
        target.closest('.whiteboard-controls-overlay')) {
      return;
    }

    const viewportEl = this.elementRef.nativeElement.querySelector('.whiteboard-viewport');
    if (!viewportEl) return;

    const rect = viewportEl.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const x = (mouseX - this.panX()) / this.zoomScale();
    const y = (mouseY - this.panY()) / this.zoomScale();

    this.createStickyNoteAt(x - 105, y - 40);
  }

  private createStickyNoteAt(x: number, y: number): void {
    const user = this.userService.currentUser();
    if (!user) return;

    const workspace = this.workspaceService.activeWorkspace();
    const workspaceId = workspace ? workspace.id : null;
    if (!workspaceId) return;

    const defaultCategoryId = this.categories.length > 0 ? this.categories[0].id : 1;

    this.cardService.createCard({
      title: 'New Note', // Temp placeholder title to pass backend validation
      description: '',
      isChecklist: false,
      categoryId: defaultCategoryId,
      userId: user.id,
      workspaceId,
      isStickyNote: true,
      color: '#fef08a',
      whiteboardX: Math.round(x),
      whiteboardY: Math.round(y),
      listItems: []
    }).subscribe();
  }

  // --- Custom scale-aware dragging logic ---

  protected onCardDragStart(event: MouseEvent, card: Card): void {
    if (event.button !== 0) return; // Only left-click drag

    event.preventDefault();
    event.stopPropagation();

    // Find the DOM element of the card being dragged
    const dragTarget = (event.target as HTMLElement).closest('.sidebar-card-item') as HTMLElement;
    if (!dragTarget) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = this.getCardX(card);
    const initialY = this.getCardY(card);
    const scale = this.zoomScale();

    // Temporarily elevate z-index and disable transitions while dragging
    const originalZIndex = dragTarget.style.zIndex;
    dragTarget.style.zIndex = '1000';
    dragTarget.style.transition = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Divide coordinates shift by scale factor
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      const newX = Math.round(initialX + dx);
      const newY = Math.round(initialY + dy);

      // Directly update DOM styles for 60fps drag performance
      dragTarget.style.left = `${newX}px`;
      dragTarget.style.top = `${newY}px`;

      // Mutate coordinates locally
      card.whiteboardX = newX;
      card.whiteboardY = newY;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      // Reset z-index and restore standard CSS spring transitions
      dragTarget.style.zIndex = originalZIndex;
      dragTarget.style.transition = '';
      void dragTarget.offsetHeight; // Force reflow to register cleared transition

      const cards = this.cards;
      const resolved = this.resolveOverlap(card.id, card.whiteboardX || 0, card.whiteboardY || 0, cards);

      card.whiteboardX = resolved.x;
      card.whiteboardY = resolved.y;

      // Update styles with resolved coordinates
      dragTarget.style.left = `${resolved.x}px`;
      dragTarget.style.top = `${resolved.y}px`;

      // Sync coordinate updates to database
      this.cardService.updateCard(card.id, {
        whiteboardX: resolved.x,
        whiteboardY: resolved.y
      }).subscribe();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  protected onCardDeleted(card: Card): void {
    // Canvas updates automatically via signal data flow from CardService
  }

  // Self-contained overlap resolver to prevent notes/cards overlapping on canvas drop
  private resolveOverlap(cardId: number, targetX: number, targetY: number, cards: Card[]): { x: number, y: number } {
    const getCardSize = (id: number) => {
      const el = document.querySelector(`.sidebar-card-item[data-card-id="${id}"]`);
      if (el) {
        return { w: el.clientWidth || 320, h: el.clientHeight || 250 };
      }
      const isSticky = cards.find(c => c.id === id)?.isStickyNote;
      return isSticky ? { w: 210, h: 210 } : { w: 320, h: 250 };
    };

    const targetSize = getCardSize(cardId);
    let resolvedX = Math.max(16, targetX);
    let resolvedY = Math.max(16, targetY);

    let hasOverlap = true;
    let iterations = 0;
    const maxIterations = 50;

    while (hasOverlap && iterations < maxIterations) {
      hasOverlap = false;
      iterations++;

      for (const other of cards) {
        if (other.id === cardId) continue;

        const otherX = this.getCardX(other);
        const otherY = this.getCardY(other);
        const otherSize = getCardSize(other.id);

        const overlapX = Math.max(0, Math.min(resolvedX + targetSize.w, otherX + otherSize.w) - Math.max(resolvedX, otherX));
        const overlapY = Math.max(0, Math.min(resolvedY + targetSize.h, otherY + otherSize.h) - Math.max(resolvedY, otherY));

        if (overlapX > 0 && overlapY > 0) {
          hasOverlap = true;
          if (overlapX < overlapY) {
            if (resolvedX < otherX) {
              resolvedX -= overlapX;
            } else {
              resolvedX += overlapX;
            }
          } else {
            if (resolvedY < otherY) {
              resolvedY -= overlapY;
            } else {
              resolvedY += overlapY;
            }
          }
          resolvedX = Math.max(16, resolvedX);
          resolvedY = Math.max(16, resolvedY);
          break;
        }
      }
    }

    return { x: Math.round(resolvedX), y: Math.round(resolvedY) };
  }
}
