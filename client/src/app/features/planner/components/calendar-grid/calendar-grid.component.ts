import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, GoogleCalendarEvent } from '../../../../core/models/planner.models';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

interface DayColumn {
  date: Date;
  dateIso: string;
  label: string;
  cards: Card[];
  googleEvents: GoogleCalendarEvent[];
}

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="calendar-container">
      <header class="calendar-header">
        <h1>Your Week Ahead</h1>
      </header>
      
      <div class="calendar-grid">
        @for (day of days; track day.dateIso) {
          <div class="day-column glass-panel">
            <div class="day-header">
              <span class="day-name">{{ day.date | date:'EEEE' }}</span>
              <span class="day-date">{{ day.date | date:'MMM d' }}</span>
            </div>
            
            <div 
              class="drop-zone"
              cdkDropList
              [id]="'calendar-day-' + day.dateIso"
              [cdkDropListData]="day.cards"
              (cdkDropListDropped)="onDrop($event)">
              
              <!-- Google Calendar Events (Read Only) -->
              @for (event of day.googleEvents; track event.id) {
                <div class="google-event-card">
                  <div class="google-icon">G</div>
                  <div class="event-details">
                    <h4>{{ event.summary }}</h4>
                    @if (event.start?.dateTime) {
                      <span class="time">{{ event.start.dateTime | date:'shortTime' }}</span>
                    } @else {
                      <span class="time">All Day</span>
                    }
                  </div>
                </div>
              }

              <!-- LifePlanner Cards -->
              @for (card of day.cards; track card.id) {
                <div 
                  class="event-card glass-panel" 
                  [style.border-left-color]="card.category?.color ?? '#6366f1'"
                  cdkDrag
                  [cdkDragData]="card">
                  <div class="card-header">
                    <h4>{{ card.title }}</h4>
                    <div class="card-actions">
                      <button
                        class="edit-btn"
                        (click)="$event.stopPropagation(); onEditCard(card)"
                        title="Edit card"
                        aria-label="Edit card">
                        ✎
                      </button>
                      <button
                        class="delete-btn"
                        (click)="$event.stopPropagation(); onDeleteCard(card)"
                        title="Delete card"
                        aria-label="Delete card">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              }
              
              @if (day.cards.length === 0 && day.googleEvents.length === 0) {
                <div class="empty-timeline">
                  <p>Clear</p>
                </div>
              }
            </div>
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
    .calendar-container {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      padding: 2rem;
      overflow: hidden;
    }
    .calendar-header {
      margin-bottom: 2rem;
      flex-shrink: 0;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .calendar-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1rem;
      overflow-y: hidden;
      min-height: 0;
    }
    .day-column {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.02);
      border-radius: var(--radius-lg);
      padding: 1rem;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      box-sizing: border-box;
    }
    .day-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-glass);
      flex-shrink: 0;
    }
    .day-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .day-date {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .drop-zone {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      min-height: 0;
    }
    
    /* Google Event Style */
    .google-event-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(66, 133, 244, 0.15); /* Google Blue */
      border-left: 4px solid #4285F4;
      border-radius: var(--radius-md);
      color: var(--text-primary);
    }
    .google-icon {
      background: #4285F4;
      color: white;
      font-weight: bold;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      flex-shrink: 0;
    }
    .event-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .event-details h4 {
      margin: 0;
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .event-details .time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* LifePlanner Card Style */
    .event-card {
      padding: 0.75rem;
      border-left: 4px solid transparent;
      cursor: grab;
      transition: box-shadow 0.2s;
    }
    .event-card:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    .event-card:hover {
      box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
    }
    .event-card .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .event-card h4 {
      margin: 0;
      font-size: 0.95rem;
      color: var(--text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-actions {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }
    .edit-btn, .delete-btn {
      opacity: 0;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      transition: opacity 0.15s, color 0.15s, background 0.15s;
      line-height: 1;
      flex-shrink: 0;
    }
    .event-card:hover .edit-btn,
    .event-card:hover .delete-btn {
      opacity: 1;
    }
    .edit-btn:hover {
      color: #60a5fa;
      background: rgba(59, 130, 246, 0.15);
    }
    .delete-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
    }

    .empty-timeline {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--text-muted);
      font-size: 0.9rem;
      border: 1px dashed transparent;
    }
    
    /* Highlight drop zone when dragging over */
    .cdk-drop-list-receiving {
      background: rgba(255,255,255, 0.05);
      border-radius: var(--radius-md);
    }

    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
  `]
})
export class CalendarGridComponent implements OnChanges {
  @Input({ required: true }) scheduledCards: Card[] = [];
  @Input() googleEvents: GoogleCalendarEvent[] = [];
  @Output() cardDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() cardEdited = new EventEmitter<Card>();
  @Output() cardDeleted = new EventEmitter<Card>();

  days: DayColumn[] = [];

  constructor() {
    this.generateDays();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheduledCards'] || changes['googleEvents']) {
      this.distributeItems();
    }
  }

  private generateDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the most recent Monday
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToMonday);

    this.days = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      return {
        date,
        dateIso: date.toISOString(),
        label: date.toDateString(),
        cards: [],
        googleEvents: []
      };
    });
  }

  private distributeItems() {
    // Reset cards and events
    this.days.forEach(day => {
      day.cards = [];
      day.googleEvents = [];
    });

    // Helper to find the matching day column
    const findDayColumn = (dateString: string | undefined): DayColumn | undefined => {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0);
      const time = date.getTime();
      return this.days.find(d => d.date.getTime() === time);
    };

    // Distribute LifePlanner cards
    this.scheduledCards.forEach(card => {
      const col = findDayColumn(card.scheduledDate);
      if (col) col.cards.push(card);
    });

    // Distribute Google Calendar events
    this.googleEvents.forEach(event => {
      const startStr = event.start?.dateTime || event.start?.date;
      const col = findDayColumn(startStr);
      if (col) col.googleEvents.push(event);
    });
  }

  onDrop(event: CdkDragDrop<any>) {
    this.cardDropped.emit(event);
  }

  onEditCard(card: Card) {
    this.cardEdited.emit(card);
  }

  onDeleteCard(card: Card) {
    if (confirm(`Are you sure you want to delete "${card.title}"?`)) {
      this.cardDeleted.emit(card);
    }
  }
}

