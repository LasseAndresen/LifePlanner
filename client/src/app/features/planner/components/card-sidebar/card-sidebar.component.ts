import { Component, EventEmitter, Input, Output, HostListener, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, Category } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { StickyNoteComponent } from '../sticky-note/sticky-note.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { CardService } from '../../../../core/services/card.service';
import { UserService } from '../../../../core/services/user.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { WhiteboardLayoutService } from '../../../../core/services/whiteboard-layout.service';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, StickyNoteComponent, DragDropModule],
  templateUrl: './card-sidebar.component.html',
  styleUrls: ['./card-sidebar.component.css']
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
  protected readonly whiteboardLayout = inject(WhiteboardLayoutService);

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
    return this.whiteboardLayout.getCardX(card, this.cards);
  }

  getCardY(card: Card): number {
    return this.whiteboardLayout.getCardY(card, this.cards);
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
      const resolved = this.whiteboardLayout.resolveOverlap(card.id, card.whiteboardX || 0, card.whiteboardY || 0, cards);

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
}
