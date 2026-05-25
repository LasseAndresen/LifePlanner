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
            <button class="nav-btn refresh-btn" (click)="calendarService.refresh()" title="Refresh Calendar">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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
                <div class="day-header-left">
                  <span class="day-name">{{ day.date | date:'EEEE' }}</span>
                  <span class="day-date">{{ day.date | date:'MMM d' }}</span>
                </div>
                <button class="add-event-btn" (click)="onAddClicked(day.dateIso)" title="Add calendar item">+</button>
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
                    [class.is-draft]="!entry.instance.isConfirmed"
                    [style.border-left-color]="entry.instance.category?.color ?? entry.card?.category?.color ?? '#6366f1'"
                    (click)="onEditClicked(entry)"
                    cdkDrag
                    [cdkDragData]="entry">
                    <div class="card-header">
                      <div class="header-left-side">
                        <button
                          class="check-btn"
                          [class.checked]="entry.instance.isCompleted"
                          (click)="$event.stopPropagation(); onToggleInstance(entry)"
                          [attr.aria-label]="entry.instance.isCompleted ? 'Uncheck' : 'Check'">
                          @if (entry.instance.isCompleted) { ✓ }
                        </button>
                        <div class="title-time-area">
                          <h4 [class.completed]="entry.instance.isCompleted" [title]="entry.item?.text || entry.instance.title || ''">
                            {{ entry.item?.text || entry.instance.title }}
                          </h4>
                          @if (entry.instance.startTime) {
                            <span class="time-label">
                              🕒 {{ getFormattedTimeLabel(entry.instance.startTime, entry.instance.endTime) }}
                            </span>
                          }
                        </div>
                      </div>
                      <div class="card-actions">
                        @if (!entry.instance.isConfirmed) {
                          <span class="draft-badge">Draft</span>
                          <button
                            class="confirm-btn-badge"
                            (click)="$event.stopPropagation(); onConfirmInstance(entry)"
                            title="Confirm & Sync to Google Calendar">
                            Confirm ✓
                          </button>
                        }
                        @if (entry.instance.type) {
                          <span class="type-badge">{{ entry.instance.type }}</span>
                        }
                        @if (entry.card?.integrationSource) {
                          <span class="integration-source-badge" [class.ms-todo]="entry.card?.integrationSource === 'MicrosoftTodo'" [class.google-tasks]="entry.card?.integrationSource === 'GoogleTasks'">
                            {{ entry.card?.integrationSource === 'MicrosoftTodo' ? 'MS Todo' : 'Tasks' }}
                          </span>
                        }
                        @if (entry.card) {
                          <span class="parent-card-badge" [title]="entry.card.title">{{ entry.card.title }}</span>
                        }
                        <button
                          class="delete-btn"
                          (click)="$event.stopPropagation(); onUnscheduleInstance(entry)"
                          title="Unschedule item"
                          aria-label="Unschedule item">
                          ✕
                        </button>
                      </div>
                    </div>
                    @if (entry.instance.description) {
                      <p class="event-desc-preview">{{ entry.instance.description }}</p>
                    }
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
                  <button class="cell-add-btn" (click)="onAddClicked(day.dateIso)" title="Add calendar item">+</button>
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
                      [class.is-draft]="!entry.instance.isConfirmed"
                      [style.border-left-color]="entry.instance.category?.color ?? entry.card?.category?.color ?? '#6366f1'"
                      [class.completed]="entry.instance.isCompleted"
                      (click)="onEditClicked(entry)"
                      cdkDrag
                      [cdkDragData]="entry">
                      
                      <span class="pill-text" [title]="entry.item?.text || entry.instance.title || ''">
                        @if (entry.instance.startTime) {
                          <span class="pill-time">{{ getFormattedTimeOnly(entry.instance.startTime) }}</span>
                        }
                        @if (entry.card?.integrationSource === 'MicrosoftTodo') {
                          <span class="pill-source-icon" style="color: #60a5fa; font-size: 0.65rem;">☑ </span>
                        } @else if (entry.card?.integrationSource === 'GoogleTasks') {
                          <span class="pill-source-icon" style="color: #38bdf8; font-size: 0.65rem;">☑ </span>
                        }
                        @if (!entry.instance.isConfirmed) {
                          <span class="draft-indicator" style="color: #fbbf24; font-weight: 600; font-size: 0.65rem;">[Draft] </span>
                        }
                        {{ entry.item?.text || entry.instance.title }}
                      </span>
                      
                      <button
                        class="unschedule-pill-btn"
                        (click)="$event.stopPropagation(); onUnscheduleInstance(entry)"
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
      padding: 0.15rem 0.55rem;
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
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
      flex-shrink: 0;
    }
    .day-header-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .day-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    .day-date {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .add-event-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-secondary);
      font-size: 1.1rem;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .add-event-btn:hover {
      background: var(--accent-primary);
      color: white;
      border-color: transparent;
      transform: scale(1.1);
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
      background: rgba(66, 133, 244, 0.08);
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
      cursor: pointer;
      transition: box-shadow 0.2s, background-color 0.2s;
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
    .header-left-side {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      flex: 1;
      min-width: 0;
    }
    .title-time-area {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      min-width: 0;
    }
    .time-label {
      font-size: 0.7rem;
      color: var(--accent-secondary);
      font-weight: 500;
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
      line-height: 1.2;
    }
    .event-card h4.completed {
      color: var(--text-muted);
      text-decoration: line-through;
    }
    .card-actions {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .type-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.08rem 0.3rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      border: 1px solid rgba(255, 255, 255, 0.1);
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
    .event-desc-preview {
      margin: 0.4rem 0 0 0;
      font-size: 0.76rem;
      color: var(--text-muted);
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
      flex-shrink: 0;
    }
    .cell-add-btn {
      opacity: 0;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      cursor: pointer;
      line-height: 1;
      transition: opacity 0.15s, color 0.15s;
    }
    .day-cell:hover .cell-add-btn {
      opacity: 1;
    }
    .cell-add-btn:hover {
      color: var(--text-primary);
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
      cursor: pointer;
      position: relative;
      flex-shrink: 0;
      transition: all 0.15s;
      overflow: hidden;
    }
    .event-pill:hover {
      background: rgba(255, 255, 255, 0.06);
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
    .pill-time {
      font-weight: bold;
      color: var(--accent-secondary);
      margin-right: 0.25rem;
      font-size: 0.68rem;
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
    .event-card.is-draft {
      border-style: dashed !important;
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.15);
      background: repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.005),
        rgba(255, 255, 255, 0.005) 10px,
        rgba(255, 255, 255, 0.015) 10px,
        rgba(255, 255, 255, 0.015) 20px
      ) !important;
      opacity: 0.85;
    }
    .event-pill.is-draft {
      border-style: dashed !important;
      border-width: 1px;
      border-color: rgba(255, 255, 255, 0.15);
      background: repeating-linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.005),
        rgba(255, 255, 255, 0.005) 5px,
        rgba(255, 255, 255, 0.015) 5px,
        rgba(255, 255, 255, 0.015) 10px
      ) !important;
      opacity: 0.85;
    }
    .draft-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.08rem 0.3rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .confirm-btn-badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.08rem 0.4rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      cursor: pointer;
      font-family: var(--font-family);
      transition: transform 0.15s, opacity 0.15s;
    }
    .confirm-btn-badge:hover {
      transform: scale(1.05);
      opacity: 0.95;
    }
    .refresh-btn .icon {
      transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    .refresh-btn:hover .icon {
      transform: rotate(180deg);
    }
  `]
})
export class CalendarGridComponent {
  public readonly calendarService = inject(CalendarService);
  
  @Input() connectedTo: string[] = [];
  @Output() itemDropped = new EventEmitter<CdkDragDrop<any>>();
  @Output() instanceToggled = new EventEmitter<{ instance: ScheduledInstance }>();
  @Output() instanceUnscheduled = new EventEmitter<number>();
  @Output() instanceConfirmed = new EventEmitter<{ instance: ScheduledInstance }>();
  @Output() addClicked = new EventEmitter<string>();
  @Output() editClicked = new EventEmitter<{ instance: ScheduledInstance; item?: ListItem; card?: Card }>();

  readonly days = this.calendarService.daysGrid;

  onDrop(event: CdkDragDrop<any>) {
    this.itemDropped.emit(event);
  }

  onToggleInstance(entry: { instance: ScheduledInstance }) {
    this.instanceToggled.emit({ instance: entry.instance });
  }

  onUnscheduleInstance(entry: { instance: ScheduledInstance }) {
    this.instanceUnscheduled.emit(entry.instance.id);
  }

  onAddClicked(dateIso: string) {
    this.addClicked.emit(dateIso);
  }

  onEditClicked(entry: { instance: ScheduledInstance; item?: ListItem; card?: Card }) {
    this.editClicked.emit(entry);
  }

  onConfirmInstance(entry: { instance: ScheduledInstance }) {
    this.instanceConfirmed.emit({ instance: entry.instance });
  }

  getFormattedTimeLabel(startTimeStr?: string, endTimeStr?: string): string {
    if (!startTimeStr) return '';
    const start = this.getFormattedTimeOnly(startTimeStr);
    if (endTimeStr) {
      const end = this.getFormattedTimeOnly(endTimeStr);
      return `${start} - ${end}`;
    }
    return start;
  }

  getFormattedTimeOnly(dateTimeStr: string): string {
    try {
      const parts = dateTimeStr.split('T');
      if (parts.length > 1) {
        return parts[1].substring(0, 5); // "HH:mm"
      }
    } catch {}
    return '';
  }
}
