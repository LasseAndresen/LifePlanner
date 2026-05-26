import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Card } from '../../../../core/models/planner.models';
import { CardService } from '../../../../core/services/card.service';

@Component({
  selector: 'app-sticky-note',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div 
      class="sticky-note-card glass-panel" 
      [style.background-color]="getBgColor()" 
      [style.border-color]="getBorderColor()"
      [style.box-shadow]="getBoxShadow()"
      (click)="stopPropagation($event)">
      
      <!-- Drag Handle Header -->
      <div class="note-header" (mousedown)="onHeaderMouseDown($event)" cdkDragHandle>
        <div class="color-palette-btn" (click)="toggleColorMenu($event)" title="Change Color">🎨</div>
        <div class="drag-handle-dots">•••</div>
        <button class="delete-btn" (click)="deleteNote($event)" title="Delete note">✕</button>
      </div>

      <!-- Content Area -->
      <div class="note-body">
        <textarea
          #editorInput
          class="note-textarea"
          [class.editing]="editing"
          [readonly]="!editing"
          [(ngModel)]="editText"
          (click)="onTextareaClick($event)"
          (keydown.enter)="onEnterPressed($event)"
          (keydown.escape)="cancelEdit()"
          (blur)="finishEdit()"
          placeholder="Click to edit..."></textarea>
      </div>

      <!-- Color Palette Picker -->
      @if (showColorMenu) {
        <div class="color-picker-menu glass-panel" (click)="stopPropagation($event)">
          @for (c of paletteColors; track c) {
            <button 
              class="color-option-dot" 
              [style.background-color]="c"
              [class.active]="card.color === c"
              (click)="selectColor(c, $event)"></button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .sticky-note-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      border-radius: var(--radius-md);
      overflow: visible;
      position: relative;
      user-select: none;
      transition: box-shadow 0.2s ease, transform 0.1s ease;
      background: rgba(254, 240, 138, 0.15); /* Yellow default glass */
      border: 1px solid rgba(254, 240, 138, 0.35);
    }
    
    .sticky-note-card:hover {
      transform: translateY(-2px);
    }

    .note-header {
      height: 28px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: grab;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.12);
      border-top-left-radius: inherit;
      border-top-right-radius: inherit;
    }
    
    .note-header:active {
      cursor: grabbing;
    }

    .drag-handle-dots {
      color: rgba(255, 255, 255, 0.25);
      font-size: 0.75rem;
      letter-spacing: 2px;
      font-weight: bold;
    }

    .color-palette-btn {
      font-size: 0.75rem;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    
    .color-palette-btn:hover {
      opacity: 1;
    }

    .delete-btn {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.3);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      line-height: 1;
      transition: all 0.15s;
    }
    
    .delete-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .note-body {
      flex: 1;
      padding: 0.75rem;
      overflow: hidden;
      display: flex;
    }

    .note-textarea {
      width: 100%;
      height: 100%;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      font-family: inherit;
      font-size: 0.88rem;
      line-height: 1.4;
      color: var(--text-primary);
      padding: 0;
      margin: 0;
      cursor: pointer;
      overflow: hidden;
    }

    .note-textarea.editing {
      cursor: text;
      overflow-y: auto;
    }

    .note-textarea::placeholder {
      color: var(--text-muted);
      opacity: 0.8;
    }

    /* Color picker overlay */
    .color-picker-menu {
      position: absolute;
      top: 30px;
      left: 8px;
      z-index: 100;
      padding: 6px;
      display: flex;
      gap: 6px;
      background: rgba(16, 16, 26, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border-radius: var(--radius-md);
      backdrop-filter: blur(8px);
      animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes popIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .color-option-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.15s;
    }
    
    .color-option-dot:hover {
      transform: scale(1.2);
      border-color: #fff;
    }
    
    .color-option-dot.active {
      border-color: #fff;
      box-shadow: 0 0 6px currentColor;
    }
  `]
})
export class StickyNoteComponent {
  private _card!: Card;

  @Input({ required: true }) set card(val: Card) {
    this._card = val;
    if (!this.editing) {
      this.editText = val.title || '';
    }
  }
  get card(): Card {
    return this._card;
  }
  @Input() viewMode: 'calendar' | 'whiteboard' = 'calendar';
  @Output() dragStarted = new EventEmitter<MouseEvent>();
  @Output() deleted = new EventEmitter<void>();

  @ViewChild('editorInput') editorInput?: ElementRef<HTMLTextAreaElement>;

  private readonly cardService = inject(CardService);

  protected editing = false;
  protected editText = '';
  protected showColorMenu = false;

  ngOnInit(): void {
    if (this.card.title === 'New Note' || !this.card.title) {
      this.editing = true;
      this.editText = '';
      setTimeout(() => {
        if (this.editorInput) {
          this.editorInput.nativeElement.focus();
        }
      }, 50);
    }
  }

  // Premium glass palette colors (pastel-ish tones)
  protected readonly paletteColors = [
    '#fef08a', // Yellow
    '#fecdd3', // Pink
    '#bbf7d0', // Green
    '#bfdbfe', // Blue
    '#e9d5ff', // Purple
    '#fdba74'  // Orange
  ];

  protected getBgColor(): string {
    const hex = this.card.color || '#fef08a';
    return `${hex}22`; // 13% opacity for glass effect
  }

  protected getBorderColor(): string {
    const hex = this.card.color || '#fef08a';
    return `${hex}45`; // 27% opacity for borders
  }

  protected getBoxShadow(): string {
    const hex = this.card.color || '#fef08a';
    return `0 8px 32px rgba(0, 0, 0, 0.45), inset 0 0 12px ${hex}15`;
  }

  protected stopPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onHeaderMouseDown(event: MouseEvent): void {
    if (this.viewMode === 'calendar') {
      return; // Let CDK drag handle it!
    }
    if ((event.target as HTMLElement).classList.contains('delete-btn') || 
        (event.target as HTMLElement).classList.contains('color-palette-btn')) {
      return;
    }
    event.preventDefault();
    this.dragStarted.emit(event);
  }

  protected toggleColorMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showColorMenu = !this.showColorMenu;
  }

  protected selectColor(color: string, event: MouseEvent): void {
    event.stopPropagation();
    this.showColorMenu = false;
    this.cardService.updateCard(this.card.id, { color }).subscribe();
  }

  protected deleteNote(event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete this sticky note?`)) {
      this.cardService.deleteCard(this.card.id).subscribe({
        next: () => this.deleted.emit()
      });
    }
  }

  protected onTextareaClick(event: MouseEvent): void {
    if (!this.editing) {
      event.stopPropagation();
      this.editing = true;
    }
  }

  protected onEnterPressed(event: Event): void {
    // If shift is pressed, allow normal newline. Otherwise, save the text.
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.finishEdit();
    }
  }

  protected finishEdit(): void {
    if (!this.editing) return;
    this.editing = false;
    const trimmed = this.editText.trim();

    // If completely empty, and the note was just created (has placeholder title), delete it.
    if (!trimmed && (this.card.title === 'New Note' || !this.card.title)) {
      this.cardService.deleteCard(this.card.id).subscribe({
        next: () => this.deleted.emit()
      });
      return;
    }

    if (trimmed !== this.card.title) {
      this.cardService.updateCard(this.card.id, { title: trimmed || 'Untitled Note' }).subscribe();
    }
  }

  protected cancelEdit(): void {
    this.editing = false;
  }
}
