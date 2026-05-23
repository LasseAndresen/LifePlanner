import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card, ListItem, ScheduledInstance, GoogleCalendarEvent, DayColumn } from '../../../../core/models/planner.models';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CalendarService } from '../../../../core/services/calendar.service';

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="calendar-container">
      <header class="calendar-header">
        <div class="header-left">
          <h1>{{ calendarService.headerTitle() }}</h1>
          <span class="view-badge">{{ calendarService.viewMode() | titlecase }} View</span>
        </div>
        <div class="header-right">
          <!-- Date Navigation -->
          <div class="nav-group glass-panel">
            <button class="nav-btn" (click)="calendarService.prev()" title="Previous">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button class="nav-btn today-btn" (click)="calendarService.today()">Today</button>
            <button class="nav-btn" (click)="calendarService.next()" title="Next">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <!-- View Mode Toggle -->
          <div class="toggle-group glass-panel">
            <button 
              class="toggle-btn" 
              [class.active]="calendarService.viewMode() === 'week'"
              (click)="calendarService.setViewMode('week')">
              Week
            </button>
            <button 
              class="toggle-btn" 
              [class.active]="calendarService.viewMode() === 'month'"
              (click)="calendarService.setViewMode('month')">
              Month
            </button>
          </div>
        </div>
      </header>
      
      @if (calendarService.viewMode() === 'week') {
        <!-- WEEK VIEW -->
        <div class="calendar-grid week-mode">
          @for (day of days(); track day.dateIso) {
            <div class="day-column glass-panel" [class.is-today]="day.isToday">
              <div class="day-header">
                <span class="day-name">{{ day.date | date:'EEEE' }}</span>
                <span class="day-date">{{ day.date | date:'MMM d' }}</span>
              </div>
              
              <div 
                class="drop-zone"
                cdkDropList
                [id]="'calendar-day-' + day.dateIso"
                [cdkDropListData]="day.items"
                [cdkDropListConnectedTo]="connectedTo"
                (cdkDropListDropped)="onDrop($event)">
                
                <!-- Google Calendar Events (Read Only) -->
                @for (event of day.googleEvents; track event.id) {
                  <div class="google-event-card" [title]="event.summary">
                    <div class="google-icon">G</div>
                    <div class="event-details">
                      <h4>{{ event.summary }}</h4>
                      @if (event.start.dateTime) {
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
                        @if (entry.card.integrationSource) {
                          <span class="integration-source-badge" [class.ms-todo]="entry.card.integrationSource === 'MicrosoftTodo'" [class.google-tasks]="entry.card.integrationSource === 'GoogleTasks'">
                            {{ entry.card.integrationSource === 'MicrosoftTodo' ? 'MS Todo' : 'Tasks' }}
                          </span>
                        }
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
      } @else {
        <!-- MONTH VIEW -->
        <div class="month-grid-container">
          <!-- Weekday Headers -->
          <div class="weekday-headers">
            <span class="weekday">Mon</span>
            <span class="weekday">Tue</span>
            <span class="weekday">Wed</span>
            <span class="weekday">Thu</span>
            <span class="weekday">Fri</span>
            <span class="weekday">Sat</span>
            <span class="weekday">Sun</span>
          </div>

          <!-- Calendar Grid -->
          <div 
            class="calendar-grid month-mode"
            [style.grid-template-rows]="'repeat(' + (days().length / 7) + ', 1fr)'">
            @for (day of days(); track day.dateIso) {
              <div 
                class="day-cell glass-panel" 
                [class.outside-month]="!day.isCurrentMonth"
                [class.is-today]="day.isToday">
                <div class="cell-header">
                  <span class="day-number">{{ day.date | date:'d' }}</span>
                </div>
                
                <div 
                  class="drop-zone compact"
                  cdkDropList
                  [id]="'calendar-day-' + day.dateIso"
                  [cdkDropListData]="day.items"
                  [cdkDropListConnectedTo]="connectedTo"
                  (cdkDropListDropped)="onDrop($event)">
                  
                  <!-- Google Calendar Events (Read Only) -->
                  @for (event of day.googleEvents; track event.id) {
                    <div class="google-event-pill" [title]="event.summary">
                      <span class="google-dot"></span>
                      <span class="pill-text">{{ event.summary }}</span>
                    </div>
                  }

                  <!-- LifePlanner Items -->
                  @for (entry of day.items; track entry.instance.id) {
                    <div 
                      class="event-pill" 
                      [style.border-left-color]="entry.card.category?.color ?? '#6366f1'"
                      [class.completed]="entry.instance.isCompleted"
                      cdkDrag
                      [cdkDragData]="entry"
                      (click)="onToggleInstance(entry.card.id, entry.item.id, entry.instance)">
                      
                      <span class="pill-text" [title]="entry.item.text">
                        @if (entry.card.integrationSource === 'MicrosoftTodo') {
                          <span class="pill-source-icon" style="color: #60a5fa; font-size: 0.65rem;">☑ </span>
                        } @else if (entry.card.integrationSource === 'GoogleTasks') {
                          <span class="pill-source-icon" style="color: #38bdf8; font-size: 0.65rem;">☑ </span>
                        }
                        {{ entry.item.text }}
                      </span>
                      
                      <button
                        class="unschedule-pill-btn"
                        (click)="$event.stopPropagation(); onUnscheduleInstance(entry.card.id, entry.item.id, entry.instance.id)"
                        title="Unschedule item"
                        aria-label="Unschedule item">
                        ✕
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
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
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .view-badge {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent-secondary);
      background: rgba(236, 72, 153, 0.1);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      width: fit-content;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: 1px solid rgba(236, 72, 153, 0.15);
    }
    .header-right {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    /* Navigation Group Styles */
    .nav-group, .toggle-group {
      display: flex;
      padding: 0.2rem;
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-md);
      align-items: center;
    }
    .nav-btn, .toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-family: var(--font-family);
      font-size: 0.85rem;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .nav-btn:hover, .toggle-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
    }
    .nav-btn:active, .toggle-btn:active {
      transform: scale(0.96);
    }
    .today-btn {
      font-weight: 600;
      color: var(--text-primary);
    }
    .toggle-btn.active {
      color: white;
      background: var(--accent-primary);
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }
    .icon {
      width: 16px;
      height: 16px;
    }

    /* Grid Layouts */
    .calendar-grid {
      flex: 1;
      display: grid;
      gap: 1rem;
      overflow-y: hidden;
      min-height: 0;
    }
    .calendar-grid.week-mode {
      grid-template-columns: repeat(7, 1fr);
    }

    /* Week Column Styling */
    .day-column {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.01);
      border-radius: var(--radius-lg);
      padding: 1rem;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.14);
      transition: background-color 0.2s, border-color 0.2s;
    }
    .day-column.is-today {
      background: rgba(99, 102, 241, 0.04);
      border-color: rgba(99, 102, 241, 0.25);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.08);
    }
    .day-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
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
    
    /* Google Event Style (Week View) */
    .google-event-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(66, 133, 244, 0.1);
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
      color: var(--text-primary);
    }
    .event-details .time {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* LifePlanner Card Style (Week View) */
    .event-card {
      padding: 0.75rem;
      border-left: 4px solid transparent;
      cursor: grab;
      transition: box-shadow 0.2s, background-color 0.2s;
    }
    .event-card:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    .event-card:hover {
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      background: rgba(255, 255, 255, 0.05);
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

    /* Month View Grid Styles */
    .month-grid-container {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .weekday-headers {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      margin-bottom: 0.5rem;
      flex-shrink: 0;
    }
    .weekday {
      font-weight: 600;
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: center;
    }
    .calendar-grid.month-mode {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.5rem;
      overflow-y: hidden;
      min-height: 0;
    }

    /* Month Day Cell Styling */
    .day-cell {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.005);
      border-radius: var(--radius-md);
      padding: 0.4rem 0.5rem;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      box-sizing: border-box;
      border: 1px solid rgba(255, 255, 255, 0.14);
      transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
    }
    .day-cell:hover {
      background: rgba(255, 255, 255, 0.015);
      border-color: rgba(255, 255, 255, 0.26);
    }
    .day-cell.outside-month {
      opacity: 0.3;
    }
    .day-cell.is-today {
      background: rgba(99, 102, 241, 0.03);
      border-color: rgba(99, 102, 241, 0.25);
      box-shadow: inset 0 0 10px rgba(99, 102, 241, 0.05);
    }
    .day-cell.is-today .day-number {
      background: var(--accent-primary);
      color: white;
      font-weight: 700;
      box-shadow: 0 2px 6px rgba(99, 102, 241, 0.35);
    }
    .cell-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 0.35rem;
      flex-shrink: 0;
    }
    .day-number {
      font-size: 0.75rem;
      color: var(--text-secondary);
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .drop-zone.compact {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      overflow-y: auto;
      min-height: 0;
      padding-right: 2px;
    }

    /* Google Event Pill (Month View) */
    .google-event-pill {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.15rem 0.35rem;
      background: rgba(66, 133, 244, 0.08);
      border-left: 2px solid #4285F4;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.72rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      flex-shrink: 0;
    }
    .google-dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #4285F4;
      flex-shrink: 0;
    }

    /* LifePlanner Event Pill (Month View) */
    .event-pill {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.25rem;
      padding: 0.15rem 0.35rem;
      background: rgba(255, 255, 255, 0.02);
      border-left: 2px solid var(--accent-primary);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.72rem;
      cursor: grab;
      position: relative;
      flex-shrink: 0;
      transition: all 0.15s;
      overflow: hidden;
    }
    .event-pill:hover {
      background: rgba(255, 255, 255, 0.06);
    }
    .event-pill:active {
      cursor: grabbing;
    }
    .event-pill.completed {
      opacity: 0.55;
      background: rgba(255, 255, 255, 0.005);
    }
    .event-pill.completed .pill-text {
      text-decoration: line-through;
      color: var(--text-muted);
    }
    .pill-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .unschedule-pill-btn {
      opacity: 0;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.65rem;
      cursor: pointer;
      padding: 0 0.1rem;
      transition: opacity 0.15s, color 0.15s;
      line-height: 1;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .event-pill:hover .unschedule-pill-btn {
      opacity: 1;
    }
    .unschedule-pill-btn:hover {
      color: #ef4444;
    }

    /* Highlight drop zone when dragging over */
    .cdk-drop-list-receiving {
      background: rgba(255, 255, 255, 0.03) !important;
      border-radius: var(--radius-md);
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .integration-source-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.08rem 0.3rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .integration-source-badge.ms-todo {
      background: rgba(37, 99, 235, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(37, 99, 235, 0.25);
    }
    .integration-source-badge.google-tasks {
      background: rgba(14, 165, 233, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(14, 165, 233, 0.25);
    }
  `]
})
export class CalendarGridComponent {
  public readonly calendarService = inject(CalendarService);
  
  @Input() connectedTo: string[] = [];
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() instanceToggled = new EventEmitter<{ cardId: number; itemId: number; instance: ScheduledInstance }>();
  @Output() instanceUnscheduled = new EventEmitter<{ cardId: number; itemId: number; instanceId: number }>();

  readonly days = this.calendarService.daysGrid;

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


