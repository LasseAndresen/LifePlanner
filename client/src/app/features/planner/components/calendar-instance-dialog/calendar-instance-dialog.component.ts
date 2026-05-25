import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardService } from '../../../../core/services/card.service';
import { CategoryService } from '../../../../core/services/category.service';
import { UserService } from '../../../../core/services/user.service';
import { ScheduledInstance, Card } from '../../../../core/models/planner.models';

export interface CalendarInstanceFormData {
  id?: number;
  date: string;
  isCompleted: boolean;
  title: string;
  description?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  categoryId?: number;
  cardId?: number;
  isConfirmed: boolean;
}

@Component({
  selector: 'app-calendar-instance-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="onCancel()">
      <div class="modal glass-panel" (click)="$event.stopPropagation()">
        
        <header class="modal-header">
          <h2>{{ instance ? 'Edit Calendar Item' : 'New Calendar Item' }}</h2>
          <button class="close-btn" (click)="onCancel()">✕</button>
        </header>

        <div class="modal-body">
          <!-- Title / Text -->
          <div class="field">
            <label for="event-title">Title <span class="required">*</span></label>
            <input
              id="event-title"
              type="text"
              [(ngModel)]="title"
              placeholder="What's scheduled?"
              autofocus />
            @if (instance?.listItemId) {
              <span class="field-hint">Note: Editing this title will update the parent task text on the topic card.</span>
            }
          </div>

          <!-- Sharing Calendar Selector -->
          <div class="field">
            <label for="event-type">Calendar (Share Scope)</label>
            <div class="select-with-icon">
              <span class="field-icon">📅</span>
              <select id="event-type" [(ngModel)]="type" class="custom-select icon-padding">
                <option value="Personal">{{ userService.currentUser()?.name || 'Personal' }}</option>
                <option value="Family">Family</option>
              </select>
            </div>
          </div>

          <!-- Time slot (Start / End) -->
          <div class="field-row-group">
            <div class="field half">
              <label for="start-time">Start Time</label>
              <input
                id="start-time"
                type="time"
                [(ngModel)]="startTime" />
            </div>
            <div class="field half">
              <label for="end-time">End Time</label>
              <input
                id="end-time"
                type="time"
                [(ngModel)]="endTime" />
            </div>
          </div>

          <!-- Description -->
          <div class="field">
            <label for="event-desc">Description</label>
            <textarea
              id="event-desc"
              [(ngModel)]="description"
              rows="3"
              placeholder="Add details..."></textarea>
          </div>

          <!-- Topic Card (Only for Create Mode, optional) -->
          @if (!instance) {
            <div class="field">
              <label for="event-card-link">Link to Topic Card <span class="optional">optional</span></label>
              <select id="event-card-link" [(ngModel)]="cardId" (change)="onCardChange()" class="custom-select">
                <option [ngValue]="undefined">None (Standalone Calendar Item)</option>
                @for (card of cardService.unscheduledCards(); track card.id) {
                  <option [ngValue]="card.id">{{ card.title }}</option>
                }
              </select>
            </div>
          }

          <!-- Category (For standalone events or inherited label) -->
          <div class="field">
            <label>Category Color</label>
            @if (instance?.listItemId) {
              <div class="inherited-badge">
                <span class="dot" [style.background]="instance?.category?.color || '#6366f1'"></span>
                Inherited: {{ instance?.parentCardTitle || 'Linked Card' }}
              </div>
            } @else {
              <div class="category-pills">
                @for (cat of categoryService.categories(); track cat.id) {
                  <button
                    class="pill"
                    [class.selected]="categoryId === cat.id"
                    [style.--pill-color]="cat.color"
                    (click)="categoryId = cat.id">
                    <span class="dot" [style.background]="cat.color"></span>
                    {{ cat.name }}
                  </button>
                }
              </div>
            }
          </div>

          <!-- Confirmation State Toggle -->
          <div class="field field-row">
            <span class="toggle-label">Confirm & Sync to Google Calendar</span>
            <button
              id="confirm-toggle"
              type="button"
              class="toggle"
              [class.active]="isConfirmed"
              (click)="isConfirmed = !isConfirmed"
              [attr.aria-pressed]="isConfirmed">
              <span class="toggle-thumb"></span>
            </button>
          </div>

          <!-- Completed State Toggle -->
          <div class="field field-row">
            <span class="toggle-label">Mark as Completed</span>
            <button
              id="complete-toggle"
              type="button"
              class="toggle"
              [class.active]="isCompleted"
              (click)="isCompleted = !isCompleted"
              [attr.aria-pressed]="isCompleted">
              <span class="toggle-thumb"></span>
            </button>
          </div>
        </div>

        <footer class="modal-footer">
          <div class="footer-left">
            @if (instance) {
              <button class="btn-danger" (click)="onDelete()">Delete</button>
            }
          </div>
          <div class="footer-right">
            <button class="btn-ghost" (click)="onCancel()">Cancel</button>
            <button class="btn-primary" (click)="onSubmit()" [disabled]="!title.trim()">
              {{ instance ? 'Save Changes →' : 'Add Item →' }}
            </button>
          </div>
        </footer>

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }
    .modal {
      width: 100%;
      max-width: 480px;
      margin: 1rem;
      border-radius: var(--radius-lg);
      background: rgba(18, 18, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      animation: slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.5rem 0;
      flex-shrink: 0;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(90deg, #f8fafc, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      transition: color 0.15s;
    }
    .close-btn:hover { color: var(--text-primary); }

    .modal-body { 
      padding: 1.25rem 1.5rem; 
      display: flex; 
      flex-direction: column; 
      gap: 1.1rem; 
      overflow-y: auto;
      flex: 1;
    }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-row-group { display: flex; gap: 1rem; }
    .field.half { flex: 1; }
    .field-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .toggle-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase; }
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      flex-shrink: 0;
    }
    .toggle.active {
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border-color: transparent;
    }
    .toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    .toggle.active .toggle-thumb { transform: translateX(20px); }
    label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase; }
    .required { color: #ef4444; margin-left: 2px; }
    .optional { color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 0.75rem; }
    .field-hint { font-size: 0.72rem; color: var(--text-muted); font-style: italic; }

    input, textarea, .custom-select {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.8rem;
      color: var(--text-primary);
      font-family: var(--font-family);
      font-size: 0.95rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    input:focus, textarea:focus, .custom-select:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
    }
    input::placeholder, textarea::placeholder { color: var(--text-muted); }
    
    .custom-select {
      appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='white'><path d='M0 0l5 6 5-6z'/></svg>");
      background-repeat: no-repeat;
      background-position: right 0.8rem center;
      background-size: 0.6rem;
      padding-right: 2rem;
    }
    .custom-select option {
      background: #12121e;
      color: white;
    }

    /* Category pills */
    .category-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--font-family);
    }
    .pill:hover { border-color: rgba(255, 255, 255, 0.25); color: var(--text-primary); }
    .pill.selected {
      background: color-mix(in srgb, var(--pill-color) 20%, transparent);
      border-color: var(--pill-color);
      color: var(--text-primary);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .inherited-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.08);
      width: fit-content;
    }

    /* Footer */
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem 1.5rem;
      flex-shrink: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(14, 14, 22, 0.5);
    }
    .footer-right {
      display: flex;
      gap: 0.75rem;
    }
    .btn-ghost {
      padding: 0.55rem 1.25rem;
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--font-family);
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost:hover { border-color: rgba(255, 255, 255, 0.3); color: var(--text-primary); }
    .btn-primary {
      padding: 0.55rem 1.35rem;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border: none;
      border-radius: var(--radius-full);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }
    
    .btn-danger {
      padding: 0.55rem 1.1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-full);
      color: #f87171;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--font-family);
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
      border-color: #ef4444;
      color: white;
    }

    .select-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 0.8rem;
      color: var(--text-muted);
      font-size: 1rem;
      pointer-events: none;
      line-height: 1;
    }
    .custom-select.icon-padding {
      padding-left: 2.2rem;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(28px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
  `]
})
export class CalendarInstanceDialogComponent {
  @Input() instance: ScheduledInstance | null = null;
  @Input() defaultDate: string | null = null;

  @Output() save = new EventEmitter<CalendarInstanceFormData>();
  @Output() delete = new EventEmitter<number>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly cardService = inject(CardService);
  protected readonly categoryService = inject(CategoryService);
  protected readonly userService = inject(UserService);

  protected date = '';
  protected isCompleted = false;
  protected isConfirmed = false;
  protected title = '';
  protected description = '';
  protected type = '';
  protected startTime = '';
  protected endTime = '';
  protected categoryId?: number;
  protected cardId?: number;

  ngOnInit(): void {
    if (this.instance) {
      this.date = this.instance.date;
      this.isCompleted = this.instance.isCompleted;
      this.isConfirmed = this.instance.isConfirmed || false;
      this.title = this.instance.title || '';
      this.description = this.instance.description || '';
      this.type = this.instance.type || '';
      this.startTime = this.getFormattedTime(this.instance.startTime);
      this.endTime = this.getFormattedTime(this.instance.endTime);
      this.categoryId = this.instance.categoryId;
    } else {
      this.date = this.defaultDate || new Date().toISOString().split('T')[0] + 'T00:00:00';
      this.isCompleted = false;
      this.isConfirmed = false;
      this.title = '';
      this.description = '';
      this.type = 'Personal';
      this.startTime = '';
      this.endTime = '';
      this.categoryId = this.categoryService.categories()[0]?.id;
    }
  }

  protected onCardChange(): void {
    // If linking to a card, clear standalone categories as color will be inherited
    if (this.cardId) {
      this.categoryId = undefined;
    } else {
      this.categoryId = this.categoryService.categories()[0]?.id;
    }
  }

  protected onSubmit(): void {
    if (!this.title.trim()) return;

    // Combine date and time
    const dateStr = this.date.split('T')[0]; // "2026-05-24"
    const startDateTime = this.startTime ? `${dateStr}T${this.startTime}:00` : undefined;
    const endDateTime = this.endTime ? `${dateStr}T${this.endTime}:00` : undefined;

    this.save.emit({
      id: this.instance?.id,
      date: this.date,
      isCompleted: this.isCompleted,
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      type: this.type || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      categoryId: this.categoryId,
      cardId: this.cardId,
      isConfirmed: this.isConfirmed
    });
  }

  protected onDelete(): void {
    if (this.instance && confirm('Are you sure you want to unschedule this item?')) {
      this.delete.emit(this.instance.id);
    }
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  private getFormattedTime(dateTimeStr: string | undefined): string {
    if (!dateTimeStr) return '';
    try {
      const parts = dateTimeStr.split('T');
      if (parts.length > 1) {
        return parts[1].substring(0, 5); // "HH:mm"
      }
    } catch (e) {
      console.warn('Could not parse time from', dateTimeStr);
    }
    return '';
  }
}
