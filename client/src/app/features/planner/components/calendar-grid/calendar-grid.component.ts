import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, ListItem, ScheduledInstance, GoogleCalendarEvent } from '../../../../core/models/planner.models';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

interface DayColumn {
  date: Date;
  dateIso: string;
  label: string;
  items: { instance: ScheduledInstance; item: ListItem; card: Card }[];
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
              [cdkDropListData]="day.items"
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

              <!-- LifePlanner Items -->
              @for (entry of day.items; track entry.instance.id) {
                <div 
                  class="event-card glass-panel item-event" 
                  [style.border-left-color]="entry.card.category?.color ?? '#6366f1'"
                  cdkDrag
                  [cdkDragData]="entry">
                  <div class="card-header">
                    <button
                      class="check-btn"
                      [class.checked]="entry.instance.isCompleted"
                      (click)="$event.stopPropagation(); onToggleInstance(entry.card.id, entry.item.id, entry.instance)"
                      [attr.aria-label]="entry.instance.isCompleted ? 'Uncheck' : 'Check'">
                      @if (entry.instance.isCompleted) { ✓ }
                    </button>
                    <h4 [class.completed]="entry.instance.isCompleted" [title]="entry.item.text">{{ entry.item.text }}</h4>
                    <div class="card-actions">
                      <span class="parent-card-badge" [title]="entry.card.title">{{ entry.card.title }}</span>
                      <button
                        class="delete-btn"
                        (click)="$event.stopPropagation(); onUnscheduleInstance(entry.card.id, entry.item.id, entry.instance.id)"
                        title="Unschedule item"
                        aria-label="Unschedule item">
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              }
              
              @if (day.items.length === 0 && day.googleEvents.length === 0) {
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
      margin-top: 2px;
      transition: background 0.15s, border-color 0.15s;
    }
    .check-btn.checked { background: rgba(16,185,129,0.18); border-color: #10b981; }
    .check-btn:hover { border-color: rgba(255,255,255,0.4); }

    .event-card h4 {
      margin: 0;
      font-size: 0.95rem;
      color: var(--text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .event-card h4.completed {
      color: var(--text-muted);
      text-decoration: line-through;
    }
    .card-actions {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }
    .parent-card-badge {
      font-size: 0.68rem;
      color: var(--text-secondary);
      background: rgba(255,255,255,0.08);
      padding: 0.1rem 0.35rem;
      border-radius: var(--radius-sm);
      max-width: 90px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .delete-btn {
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
    .event-card:hover .delete-btn {
      opacity: 1;
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
  @Input({ required: true }) scheduledItems: { instance: ScheduledInstance; item: ListItem; card: Card }[] = [];
  @Input() googleEvents: GoogleCalendarEvent[] = [];
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() instanceToggled = new EventEmitter<{ cardId: number; itemId: number; instance: ScheduledInstance }>();
  @Output() instanceUnscheduled = new EventEmitter<{ cardId: number; itemId: number; instanceId: number }>();

  days: DayColumn[] = [];

  constructor() {
    this.generateDays();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scheduledItems'] || changes['googleEvents']) {
      this.distributeItems();
    }
  }

  private generateDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
        items: [],
        googleEvents: []
      };
    });
  }

  private distributeItems() {
    this.days.forEach(day => {
      day.items = [];
      day.googleEvents = [];
    });

    const findDayColumn = (dateString: string | undefined): DayColumn | undefined => {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0);
      const time = date.getTime();
      return this.days.find(d => d.date.getTime() === time);
    };

    this.scheduledItems.forEach(entry => {
      const col = findDayColumn(entry.instance.date);
      if (col) col.items.push(entry);
    });

    this.googleEvents.forEach(event => {
      const startStr = event.start?.dateTime || event.start?.date;
      const col = findDayColumn(startStr);
      if (col) col.googleEvents.push(event);
    });
  }

  onDrop(event: CdkDragDrop<any>) {
    this.itemDropped.emit(event);
  }

  onToggleInstance(cardId: number, itemId: number, instance: ScheduledInstance) {
    this.instanceToggled.emit({ cardId, itemId, instance });
  }

  onUnscheduleInstance(cardId: number, itemId: number, instanceId: number) {
    this.instanceUnscheduled.emit({ cardId, itemId, instanceId });
  }
}

